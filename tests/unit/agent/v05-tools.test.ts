/**
 * Tests for v0.5 agent tools: nl-query, cluster-compare, index-template, anomaly-detection, tool-cache.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolContext } from '../../../src/core/agent/types';

const mockSearch = vi.fn().mockResolvedValue({ body: { hits: { total: { value: 5 }, hits: [] } } });
const mockTransport = vi.fn().mockResolvedValue({ body: { detectors: [] } });
const mockCatTemplates = vi.fn().mockResolvedValue({ body: [] });
const mockGetTemplate = vi.fn().mockResolvedValue({ body: {} });
const mockPutTemplate = vi.fn().mockResolvedValue({});
const mockDeleteTemplate = vi.fn().mockResolvedValue({});
const mockHealth = vi.fn().mockResolvedValue({ body: { status: 'green', cluster_name: 'c1', number_of_nodes: 3, active_primary_shards: 10 } });
const mockStats = vi.fn().mockResolvedValue({ body: { nodes: { versions: ['2.12.0'] }, indices: { docs: { count: 1000 }, store: { size_in_bytes: 5000000 } } } });
const mockCatIndices = vi.fn().mockResolvedValue({ body: [{ index: 'logs' }] });

vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({
    search: mockSearch,
    transport: { request: mockTransport },
    cat: { templates: mockCatTemplates, indices: mockCatIndices },
    indices: { getIndexTemplate: mockGetTemplate, putIndexTemplate: mockPutTemplate, deleteIndexTemplate: mockDeleteTemplate },
    cluster: { health: mockHealth, stats: mockStats },
  })),
}));

import { nlQueryTool } from '../../../src/core/agent/tools/nl-query';
import { clusterCompareTool } from '../../../src/core/agent/tools/cluster-compare';
import { indexTemplateTool } from '../../../src/core/agent/tools/index-template';
import { anomalyDetectionTool } from '../../../src/core/agent/tools/anomaly-detection';
import { getCached, setCached, clearCache, cacheSize } from '../../../src/core/agent/tool-cache';

const ctx: ToolContext = {
  workspaceId: 'ws-1',
  activeConnection: { id: 'c1', url: 'https://cluster:9200', type: 'opensearch', auth_type: 'basic' },
  signal: new AbortController().signal,
};

beforeEach(() => {
  clearCache();
  mockSearch.mockResolvedValue({ body: { hits: { total: { value: 5 }, hits: [] } } });
  mockTransport.mockResolvedValue({ body: { detectors: [] } });
  mockCatTemplates.mockResolvedValue({ body: [] });
  mockGetTemplate.mockResolvedValue({ body: {} });
  mockPutTemplate.mockResolvedValue({});
  mockDeleteTemplate.mockResolvedValue({});
  mockHealth.mockResolvedValue({ body: { status: 'green', cluster_name: 'c1', number_of_nodes: 3, active_primary_shards: 10 } });
  mockStats.mockResolvedValue({ body: { nodes: { versions: ['2.12.0'] }, indices: { docs: { count: 1000 }, store: { size_in_bytes: 5000000 } } } });
  mockCatIndices.mockResolvedValue({ body: [{ index: 'logs' }] });
});

describe('nl-query tool', () => {
  it('executes DSL query and returns results', async () => {
    const result = await nlQueryTool.execute({ question: 'show large indices', index: 'logs-*', dsl: { query: { match_all: {} } } }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toContain('question');
    expect(mockSearch).toHaveBeenCalled();
  });

  it('returns error without connection', async () => {
    const result = await nlQueryTool.execute({ question: 'q', index: 'i', dsl: {} }, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(true);
  });

  it('handles query failure', async () => {
    mockSearch.mockRejectedValueOnce(new Error('index not found'));
    const result = await nlQueryTool.execute({ question: 'q', index: 'bad', dsl: {} }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toContain('index not found');
  });
});

describe('cluster-compare tool', () => {
  it('compares two clusters', async () => {
    const result = await clusterCompareTool.execute({ cluster_a: 'https://a:9200', cluster_b: 'https://b:9200' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toContain('cluster_a');
    expect(result.content).toContain('cluster_b');
  });

  it('handles connection failure', async () => {
    mockHealth.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await clusterCompareTool.execute({ cluster_a: 'https://bad:9200', cluster_b: 'https://b:9200' }, ctx);
    expect(result.isError).toBe(true);
  });
});

describe('index-template tool', () => {
  it('lists templates', async () => {
    const result = await indexTemplateTool.execute({ action: 'list' }, ctx);
    expect(result.isError).toBe(false);
    expect(mockCatTemplates).toHaveBeenCalled();
  });

  it('creates template', async () => {
    const result = await indexTemplateTool.execute({ action: 'create', name: 'logs-tpl', body: { index_patterns: ['logs-*'] } }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toContain('logs-tpl');
  });

  it('deletes template', async () => {
    const result = await indexTemplateTool.execute({ action: 'delete', name: 'old-tpl' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('returns error without connection', async () => {
    const result = await indexTemplateTool.execute({ action: 'list' }, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(true);
  });

  it('returns error for unknown action', async () => {
    const result = await indexTemplateTool.execute({ action: 'invalid' }, ctx);
    expect(result.isError).toBe(true);
  });
});

describe('anomaly-detection tool', () => {
  it('lists detectors', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'list' }, ctx);
    expect(result.isError).toBe(false);
    expect(mockTransport).toHaveBeenCalled();
  });

  it('creates detector', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'create', body: { name: 'cpu-spike' } }, ctx);
    expect(result.isError).toBe(false);
  });

  it('starts detector', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'start', detector_id: 'det-1' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('stops detector', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'stop', detector_id: 'det-1' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('deletes detector', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'delete', detector_id: 'det-1' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('returns error without connection', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'list' }, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(true);
  });

  it('returns error for unknown action', async () => {
    const result = await anomalyDetectionTool.execute({ action: 'bad' }, ctx);
    expect(result.isError).toBe(true);
  });
});

describe('tool-cache', () => {
  it('returns null for uncached tool', () => {
    expect(getCached('test', { a: 1 })).toBeNull();
  });

  it('caches and retrieves result', () => {
    setCached('test', { a: 1 }, 'result');
    expect(getCached('test', { a: 1 })).toBe('result');
  });

  it('expires after TTL', async () => {
    setCached('test', { a: 1 }, 'result');
    expect(getCached('test', { a: 1 }, 1)).toBe('result'); // within 1ms
    await new Promise(r => setTimeout(r, 10));
    expect(getCached('test', { a: 1 }, 1)).toBeNull(); // expired
  });

  it('clearCache removes all entries', () => {
    setCached('a', {}, '1');
    setCached('b', {}, '2');
    expect(cacheSize()).toBe(2);
    clearCache();
    expect(cacheSize()).toBe(0);
  });

  it('different inputs produce different cache keys', () => {
    setCached('tool', { x: 1 }, 'r1');
    setCached('tool', { x: 2 }, 'r2');
    expect(getCached('tool', { x: 1 })).toBe('r1');
    expect(getCached('tool', { x: 2 })).toBe('r2');
  });
});

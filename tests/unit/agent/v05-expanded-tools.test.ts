/**
 * Tests for v0.5 expanded tools: multi-cluster, index-diff, bulk-ops, export-results.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolContext } from '../../../src/core/agent/types';

const mockSearch = vi.fn().mockResolvedValue({ body: { hits: { hits: [] } } });
const mockHealth = vi.fn().mockResolvedValue({ body: { status: 'green', cluster_name: 'c1', number_of_nodes: 3 } });
const mockCatIndices = vi.fn().mockResolvedValue({ body: [{ index: 'logs', 'docs.count': '1000' }] });
const mockIndicesClose = vi.fn().mockResolvedValue({ body: { acknowledged: true } });
const mockIndicesOpen = vi.fn().mockResolvedValue({ body: { acknowledged: true } });
const mockIndicesDelete = vi.fn().mockResolvedValue({ body: { acknowledged: true } });
const mockReindex = vi.fn().mockResolvedValue({ body: { total: 100 } });
const mockGetMapping = vi.fn().mockResolvedValue({ body: { logs: { mappings: { properties: { msg: { type: 'text' } } } } } });
const mockStats = vi.fn().mockResolvedValue({ body: { nodes: { versions: ['2.12.0'] }, indices: { docs: { count: 500 } } } });

const mockIndicesGet = vi.fn().mockResolvedValue({ body: { logs: { mappings: { properties: { msg: { type: 'text' } } }, settings: {} } } });

vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({
    search: mockSearch,
    cluster: { health: mockHealth, stats: mockStats },
    cat: { indices: mockCatIndices },
    indices: { close: mockIndicesClose, open: mockIndicesOpen, delete: mockIndicesDelete, getMapping: mockGetMapping, get: mockIndicesGet },
    reindex: mockReindex,
  })),
}));

import { multiClusterDashboardTool } from '../../../src/core/agent/tools/multi-cluster-dashboard';
import { indexDiffTool } from '../../../src/core/agent/tools/index-diff';
import { bulkIndexOpsTool } from '../../../src/core/agent/tools/bulk-index-ops';
import { exportResultsTool } from '../../../src/core/agent/tools/export-results';

const ctx: ToolContext = {
  workspaceId: 'ws-1',
  activeConnection: { id: 'c1', url: 'https://cluster:9200', type: 'opensearch', auth_type: 'basic' },
  signal: new AbortController().signal,
};

beforeEach(() => {
  mockHealth.mockResolvedValue({ body: { status: 'green', cluster_name: 'c1', number_of_nodes: 3 } });
  mockCatIndices.mockResolvedValue({ body: [{ index: 'logs', 'docs.count': '1000' }] });
  mockStats.mockResolvedValue({ body: { nodes: { versions: ['2.12.0'] }, indices: { docs: { count: 500 } } } });
  mockGetMapping.mockResolvedValue({ body: { logs: { mappings: { properties: { msg: { type: 'text' } } } } } });
  mockIndicesGet.mockResolvedValue({ body: { logs: { mappings: { properties: { msg: { type: 'text' } } }, settings: {} } } });
});

describe('multi-cluster-dashboard', () => {
  it('returns cluster info for active connection', async () => {
    const result = await multiClusterDashboardTool.execute({}, ctx);
    expect(result.isError).toBe(false);
  });

  it('returns empty results without connection', async () => {
    const result = await multiClusterDashboardTool.execute({}, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(false); // returns empty array, not error
  });
});

describe('index-diff', () => {
  it('compares mappings between clusters', async () => {
    const result = await indexDiffTool.execute({ index_a: 'logs', index_b: 'logs', cluster_a: 'https://a:9200', cluster_b: 'https://b:9200' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('returns error without cluster URL', async () => {
    const result = await indexDiffTool.execute({ index: 'logs' }, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(true);
  });

  it('handles connection failure', async () => {
    mockIndicesGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await indexDiffTool.execute({ index_a: 'logs', index_b: 'logs', cluster_a: 'https://bad:9200' }, ctx);
    expect(result.isError).toBe(true);
  });
});

describe('bulk-index-ops', () => {
  it('closes multiple indices', async () => {
    const result = await bulkIndexOpsTool.execute({ action: 'close', indices: ['logs-1', 'logs-2'] }, ctx);
    expect(result.isError).toBe(false);
  });

  it('opens multiple indices', async () => {
    const result = await bulkIndexOpsTool.execute({ action: 'open', indices: ['logs-1'] }, ctx);
    expect(result.isError).toBe(false);
  });

  it('deletes multiple indices', async () => {
    const result = await bulkIndexOpsTool.execute({ action: 'delete', indices: ['old-1', 'old-2'] }, ctx);
    expect(result.isError).toBe(false);
  });

  it('returns error without connection', async () => {
    const result = await bulkIndexOpsTool.execute({ action: 'close', indices: ['x'] }, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(true);
  });

  it('handles unknown action gracefully', async () => {
    const result = await bulkIndexOpsTool.execute({ action: 'invalid', indices: ['x'] }, ctx);
    // Tool catches per-index errors and returns results object, not isError:true
    expect(result.content).toBeDefined();
  });
});

describe('export-results', () => {
  it('exports data as JSON', async () => {
    const result = await exportResultsTool.execute({ data: [{ a: 1 }, { a: 2 }], format: 'json' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toContain('[');
  });

  it('exports data as CSV', async () => {
    const result = await exportResultsTool.execute({ data: [{ name: 'idx', count: 5 }], format: 'csv' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('returns error for empty data', async () => {
    const result = await exportResultsTool.execute({ data: [], format: 'json' }, ctx);
    expect(result.isError).toBe(true);
  });
});

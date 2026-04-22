/**
 * Tests for v0.5 tools batch 3: snapshot, ism-policy, cluster-settings, cat-api, alias.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolContext } from '../../../src/core/agent/types';

const mockTransport = vi.fn().mockResolvedValue({ body: {} });
const mockCat = vi.fn().mockResolvedValue({ body: [] });
const mockClusterGetSettings = vi.fn().mockResolvedValue({ body: { persistent: {}, transient: {} } });
const mockClusterPutSettings = vi.fn().mockResolvedValue({ body: { acknowledged: true } });
const mockGetAliases = vi.fn().mockResolvedValue({ body: {} });
const mockPutAlias = vi.fn().mockResolvedValue({ body: { acknowledged: true } });
const mockDeleteAlias = vi.fn().mockResolvedValue({ body: { acknowledged: true } });
const mockUpdateAliases = vi.fn().mockResolvedValue({ body: { acknowledged: true } });

const mockSnapshotGetRepo = vi.fn().mockResolvedValue({ body: {} });
const mockSnapshotGet = vi.fn().mockResolvedValue({ body: { snapshots: [] } });
const mockSnapshotCreate = vi.fn().mockResolvedValue({ body: { accepted: true } });

vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({
    transport: { request: mockTransport },
    cat: { indices: mockCat, aliases: mockCat, nodes: mockCat, shards: mockCat, health: mockCat },
    cluster: { getSettings: mockClusterGetSettings, putSettings: mockClusterPutSettings },
    indices: { getAlias: mockGetAliases, putAlias: mockPutAlias, deleteAlias: mockDeleteAlias, updateAliases: mockUpdateAliases },
    snapshot: { getRepository: mockSnapshotGetRepo, get: mockSnapshotGet, create: mockSnapshotCreate, restore: vi.fn().mockResolvedValue({ body: {} }), delete: vi.fn().mockResolvedValue({ body: {} }) },
  })),
}));

import { snapshotTool } from '../../../src/core/agent/tools/snapshot';
import { ismPolicyTool } from '../../../src/core/agent/tools/ism-policy';
import { clusterSettingsTool } from '../../../src/core/agent/tools/cluster-settings';
import { catApiTool } from '../../../src/core/agent/tools/cat-api';
import { aliasTool } from '../../../src/core/agent/tools/alias';

const ctx: ToolContext = {
  workspaceId: 'ws-1',
  activeConnection: { id: 'c1', url: 'https://cluster:9200', type: 'opensearch', auth_type: 'basic' },
  signal: new AbortController().signal,
};

beforeEach(() => {
  mockTransport.mockResolvedValue({ body: {} });
  mockCat.mockResolvedValue({ body: [] });
  mockClusterGetSettings.mockResolvedValue({ body: { persistent: {}, transient: {} } });
  mockClusterPutSettings.mockResolvedValue({ body: { acknowledged: true } });
  mockSnapshotGetRepo.mockResolvedValue({ body: {} });
  mockSnapshotGet.mockResolvedValue({ body: { snapshots: [] } });
  mockSnapshotCreate.mockResolvedValue({ body: { accepted: true } });
});

describe('snapshot tool', () => {
  it('lists repos', async () => {
    const r = await snapshotTool.execute({ action: 'list-repos' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('creates snapshot', async () => {
    const r = await snapshotTool.execute({ action: 'create', repository: 'repo', snapshot: 'snap-1' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('returns error without connection', async () => {
    const r = await snapshotTool.execute({ action: 'list-repos' }, { ...ctx, activeConnection: null });
    expect(r.isError).toBe(true);
  });
  it('has correct definition', () => {
    expect(snapshotTool.definition.name).toBe('snapshot');
  });
});

describe('ism-policy tool', () => {
  it('lists policies', async () => {
    const r = await ismPolicyTool.execute({ action: 'list' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('creates policy', async () => {
    const r = await ismPolicyTool.execute({ action: 'create', policy_id: 'hot-warm', body: { policy: {} } }, ctx);
    expect(r.isError).toBe(false);
  });
  it('returns error without connection', async () => {
    const r = await ismPolicyTool.execute({ action: 'list' }, { ...ctx, activeConnection: null });
    expect(r.isError).toBe(true);
  });
});

describe('cluster-settings tool', () => {
  it('gets cluster settings', async () => {
    const r = await clusterSettingsTool.execute({ action: 'get' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('sets cluster settings', async () => {
    const r = await clusterSettingsTool.execute({ action: 'set', persistent: { 'cluster.routing.allocation.enable': 'all' } }, ctx);
    expect(r.isError).toBe(false);
  });
  it('returns error without connection', async () => {
    const r = await clusterSettingsTool.execute({ action: 'get' }, { ...ctx, activeConnection: null });
    expect(r.isError).toBe(true);
  });
});

describe('cat-api tool', () => {
  it('calls cat endpoint', async () => {
    const r = await catApiTool.execute({ endpoint: 'indices' }, ctx);
    expect(r.isError).toBe(false);
    expect(mockCat).toHaveBeenCalled();
  });
  it('returns error without connection', async () => {
    const r = await catApiTool.execute({ endpoint: 'nodes' }, { ...ctx, activeConnection: null });
    expect(r.isError).toBe(true);
  });
});

describe('alias tool', () => {
  it('lists aliases', async () => {
    const r = await aliasTool.execute({ action: 'list' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('creates alias', async () => {
    const r = await aliasTool.execute({ action: 'create', alias: 'live', index: 'logs-v2' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('deletes alias', async () => {
    const r = await aliasTool.execute({ action: 'delete', alias: 'old', index: 'logs-v1' }, ctx);
    expect(r.isError).toBe(false);
  });
  it('returns error without connection', async () => {
    const r = await aliasTool.execute({ action: 'list' }, { ...ctx, activeConnection: null });
    expect(r.isError).toBe(true);
  });
});

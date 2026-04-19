import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIlm = { getLifecycle: vi.fn(), putLifecycle: vi.fn(), deleteLifecycle: vi.fn() };
const mockWatcher = { getWatch: vi.fn(), putWatch: vi.fn(), deleteWatch: vi.fn() };
const mockSnapshot = { getRepository: vi.fn(), createRepository: vi.fn(), deleteRepository: vi.fn(), get: vi.fn(), create: vi.fn() };
const mockIngest = { getPipeline: vi.fn(), putPipeline: vi.fn(), deletePipeline: vi.fn() };
const mockSecurity = { getRole: vi.fn(), putRole: vi.fn(), deleteRole: vi.fn(), getUser: vi.fn(), putUser: vi.fn() };

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(() => ({
    ilm: mockIlm,
    watcher: mockWatcher,
    snapshot: mockSnapshot,
    ingest: mockIngest,
    security: mockSecurity,
  })),
}));

import * as ilm from '../../../src/core/admin/elasticsearch/ilm';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Elasticsearch ILM', () => {
  it('listPolicies calls ilm.getLifecycle', async () => {
    mockIlm.getLifecycle.mockResolvedValue({ logs: { policy: {} } });
    const result = await ilm.listPolicies('http://localhost:9243');
    expect(mockIlm.getLifecycle).toHaveBeenCalled();
  });

  it('getPolicy calls with name', async () => {
    mockIlm.getLifecycle.mockResolvedValue({ logs: {} });
    await ilm.getPolicy('http://localhost:9243', 'logs');
    expect(mockIlm.getLifecycle).toHaveBeenCalledWith({ name: 'logs' });
  });

  it('createPolicy calls putLifecycle', async () => {
    mockIlm.putLifecycle.mockResolvedValue({ acknowledged: true });
    await ilm.createPolicy('http://localhost:9243', 'new-policy', { phases: {} });
    expect(mockIlm.putLifecycle).toHaveBeenCalledWith({ name: 'new-policy', body: { phases: {} } });
  });

  it('deletePolicy calls deleteLifecycle', async () => {
    mockIlm.deleteLifecycle.mockResolvedValue({ acknowledged: true });
    await ilm.deletePolicy('http://localhost:9243', 'old-policy');
    expect(mockIlm.deleteLifecycle).toHaveBeenCalledWith({ name: 'old-policy' });
  });
});

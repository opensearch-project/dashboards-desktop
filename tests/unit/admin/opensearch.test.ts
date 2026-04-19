import { describe, it, expect, vi } from 'vitest';

const mockRequest = vi.fn();
vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({ transport: { request: mockRequest } })),
}));

import * as security from '../../../src/core/admin/opensearch/security';
import * as alerting from '../../../src/core/admin/opensearch/alerting';

describe('OpenSearch Security', () => {
  beforeEach(() => mockRequest.mockReset());

  it('listRoles calls GET /_plugins/_security/api/roles', async () => {
    mockRequest.mockResolvedValue({ body: { admin: {}, reader: {} } });
    const result = await security.listRoles('http://localhost:9200');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', path: '/_plugins/_security/api/roles' }));
    expect(result).toEqual({ admin: {}, reader: {} });
  });

  it('createRole calls PUT with body', async () => {
    mockRequest.mockResolvedValue({ body: { status: 'CREATED' } });
    await security.createRole('http://localhost:9200', 'test-role', { cluster_permissions: ['cluster_monitor'] });
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
      path: '/_plugins/_security/api/roles/test-role',
      body: { cluster_permissions: ['cluster_monitor'] },
    }));
  });

  it('deleteRole calls DELETE', async () => {
    mockRequest.mockResolvedValue({ body: {} });
    await security.deleteRole('http://localhost:9200', 'old-role');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/_plugins/_security/api/roles/old-role' }));
  });

  it('listUsers calls GET /_plugins/_security/api/internalusers', async () => {
    mockRequest.mockResolvedValue({ body: { admin: {} } });
    await security.listUsers('http://localhost:9200');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ path: '/_plugins/_security/api/internalusers' }));
  });

  it('createUser calls PUT', async () => {
    mockRequest.mockResolvedValue({ body: {} });
    await security.createUser('http://localhost:9200', 'newuser', { password: 'pass' });
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', path: '/_plugins/_security/api/internalusers/newuser' }));
  });

  it('listTenants calls GET', async () => {
    mockRequest.mockResolvedValue({ body: {} });
    await security.listTenants('http://localhost:9200');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ path: '/_plugins/_security/api/tenants' }));
  });
});

describe('OpenSearch Alerting', () => {
  beforeEach(() => mockRequest.mockReset());

  it('listMonitors calls POST _search', async () => {
    mockRequest.mockResolvedValue({ body: { hits: { hits: [] } } });
    await alerting.listMonitors('http://localhost:9200');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/_plugins/_alerting/monitors/_search' }));
  });

  it('createMonitor calls POST', async () => {
    mockRequest.mockResolvedValue({ body: { _id: 'mon-1' } });
    await alerting.createMonitor('http://localhost:9200', { name: 'test-monitor' });
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/_plugins/_alerting/monitors' }));
  });

  it('deleteMonitor calls DELETE', async () => {
    mockRequest.mockResolvedValue({ body: {} });
    await alerting.deleteMonitor('http://localhost:9200', 'mon-1');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', path: '/_plugins/_alerting/monitors/mon-1' }));
  });

  it('listDestinations calls GET', async () => {
    mockRequest.mockResolvedValue({ body: { destinations: [] } });
    await alerting.listDestinations('http://localhost:9200');
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ path: '/_plugins/_alerting/destinations' }));
  });
});

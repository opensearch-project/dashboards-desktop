import { describe, it, expect, beforeEach } from 'vitest';
import {
  getClient,
  invalidate,
  invalidateAll,
  setActiveConnection,
  getActiveConnectionId,
  clearActiveConnection,
} from '../../src/core/connections/pool';

describe('Connection Pool', () => {
  beforeEach(() => {
    invalidateAll();
  });

  it('returns same client instance for same connectionId', () => {
    const config = { url: 'http://localhost:9200', type: 'opensearch' as const, auth_type: 'none' };
    const c1 = getClient('conn-1', config);
    const c2 = getClient('conn-1', config);
    expect(c1).toBe(c2);
  });

  it('returns different clients for different connectionIds', () => {
    const config = { url: 'http://localhost:9200', type: 'opensearch' as const, auth_type: 'none' };
    const c1 = getClient('conn-1', config);
    const c2 = getClient('conn-2', config);
    expect(c1).not.toBe(c2);
  });

  it('invalidate removes client from pool', () => {
    const config = { url: 'http://localhost:9200', type: 'opensearch' as const, auth_type: 'none' };
    const c1 = getClient('conn-1', config);
    invalidate('conn-1');
    const c2 = getClient('conn-1', config);
    expect(c1).not.toBe(c2);
  });

  it('invalidateAll clears entire pool', () => {
    const config = { url: 'http://localhost:9200', type: 'opensearch' as const, auth_type: 'none' };
    const c1 = getClient('conn-1', config);
    const c2 = getClient('conn-2', config);
    invalidateAll();
    const c3 = getClient('conn-1', config);
    expect(c1).not.toBe(c3);
  });

  it('tracks active connection per workspace', () => {
    setActiveConnection('ws-1', 'conn-a');
    setActiveConnection('ws-2', 'conn-b');
    expect(getActiveConnectionId('ws-1')).toBe('conn-a');
    expect(getActiveConnectionId('ws-2')).toBe('conn-b');
  });

  it('clearActiveConnection removes workspace mapping', () => {
    setActiveConnection('ws-1', 'conn-a');
    clearActiveConnection('ws-1');
    expect(getActiveConnectionId('ws-1')).toBeUndefined();
  });

  it('returns undefined for unknown workspace', () => {
    expect(getActiveConnectionId('nonexistent')).toBeUndefined();
  });
});

describe('Client Factory', () => {
  it('creates opensearch client with correct type', () => {
    const config = { url: 'http://localhost:9200', type: 'opensearch' as const, auth_type: 'none' };
    const client = getClient('os-1', config);
    expect(client.type).toBe('opensearch');
    expect(client.raw).toBeTruthy();
  });

  it('creates elasticsearch client with correct type', () => {
    const config = { url: 'http://localhost:9200', type: 'elasticsearch' as const, auth_type: 'none' };
    const client = getClient('es-1', config);
    expect(client.type).toBe('elasticsearch');
    expect(client.raw).toBeTruthy();
  });

  it('unified client has info, search, clusterHealth methods', () => {
    const config = { url: 'http://localhost:9200', type: 'opensearch' as const, auth_type: 'none' };
    const client = getClient('test-1', config);
    expect(typeof client.info).toBe('function');
    expect(typeof client.search).toBe('function');
    expect(typeof client.clusterHealth).toBe('function');
  });
});

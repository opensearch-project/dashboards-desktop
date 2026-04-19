import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron safeStorage
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`enc:${text}`),
    decryptString: (buf: Buffer) => buf.toString().replace('enc:', ''),
  },
}));

// Mock OpenSearch client
const mockOsInfo = vi.fn();
vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn().mockImplementation(() => ({ info: mockOsInfo })),
}));

// Mock Elasticsearch client
const mockEsInfo = vi.fn();
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(() => ({ info: mockEsInfo })),
}));

import { testConnection, encryptCredential, decryptCredential } from '../../src/core/connections';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('testConnection: OpenSearch', () => {
  it('returns success for healthy cluster', async () => {
    mockOsInfo.mockResolvedValue({
      body: { cluster_name: 'test-cluster', version: { number: '2.12.0', distribution: 'opensearch' } },
    });

    const result = await testConnection({
      name: 'test', url: 'https://localhost:9200', type: 'opensearch', auth_type: 'none',
    });
    expect(result.success).toBe(true);
    expect(result.cluster_name).toBe('test-cluster');
    expect(result.version).toBe('2.12.0');
  });

  it('passes basic auth to client', async () => {
    mockOsInfo.mockResolvedValue({
      body: { cluster_name: 'c', version: { number: '2.12.0' } },
    });

    await testConnection({
      name: 'test', url: 'https://localhost:9200', type: 'opensearch',
      auth_type: 'basic', username: 'admin', password: 'secret',
    });

    expect(OpenSearchClient).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { username: 'admin', password: 'secret' } })
    );
  });

  it('passes timeout option to client', async () => {
    mockOsInfo.mockResolvedValue({
      body: { cluster_name: 'c', version: { number: '2.12.0' } },
    });

    await testConnection(
      { name: 'test', url: 'https://localhost:9200', type: 'opensearch', auth_type: 'none' },
      { timeoutMs: 500 }
    );

    expect(OpenSearchClient).toHaveBeenCalledWith(
      expect.objectContaining({ requestTimeout: 500 })
    );
  });
});

describe('testConnection: Elasticsearch', () => {
  it('returns success for healthy cluster', async () => {
    mockEsInfo.mockResolvedValue({
      cluster_name: 'es-cluster', version: { number: '8.17.0' },
    });

    const result = await testConnection({
      name: 'test', url: 'https://localhost:9243', type: 'elasticsearch', auth_type: 'none',
    });
    expect(result.success).toBe(true);
    expect(result.cluster_name).toBe('es-cluster');
    expect(result.version).toBe('8.17.0');
  });

  it('passes API key auth to client', async () => {
    mockEsInfo.mockResolvedValue({
      cluster_name: 'c', version: { number: '8.17.0' },
    });

    await testConnection({
      name: 'test', url: 'https://localhost:9243', type: 'elasticsearch',
      auth_type: 'apikey', api_key: 'my-key-123',
    });

    expect(ElasticsearchClient).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { apiKey: 'my-key-123' } })
    );
  });
});

describe('testConnection: failure modes', () => {
  it('returns error when client throws (unreachable)', async () => {
    mockOsInfo.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:1'));

    const result = await testConnection({
      name: 'bad', url: 'http://127.0.0.1:1', type: 'opensearch', auth_type: 'none',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  it('returns error on auth failure', async () => {
    mockOsInfo.mockRejectedValue(new Error('Response Error: 401 Unauthorized'));

    const result = await testConnection({
      name: 'bad', url: 'https://localhost:9200', type: 'opensearch',
      auth_type: 'basic', username: 'admin', password: 'wrong',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/401/);
  });

  it('returns error on timeout', async () => {
    mockEsInfo.mockRejectedValue(new Error('Request timed out'));

    const result = await testConnection(
      { name: 'slow', url: 'https://localhost:9243', type: 'elasticsearch', auth_type: 'none' },
      { timeoutMs: 500 }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out/i);
  });
});

describe('Credential encryption', () => {
  it('encrypts and decrypts round-trip', () => {
    const encrypted = encryptCredential('my-secret');
    expect(Buffer.isBuffer(encrypted)).toBe(true);
    expect(decryptCredential(encrypted)).toBe('my-secret');
  });

  it('handles empty string', () => {
    const encrypted = encryptCredential('');
    expect(decryptCredential(encrypted)).toBe('');
  });
});

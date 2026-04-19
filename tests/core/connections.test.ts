import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import type { ConnectionInput, ConnectionTestResult } from '../../src/core/types';

// Connection manager will be at @core/connections
// Tests define the contract for src/core/connections.ts

function getConnections() {
  return require('../../src/core/connections');
}

// --- Helper: mock HTTP server ---

function createMockServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => server.close(),
      });
    });
  });
}

describe('ConnectionManager: test connectivity', () => {
  it('returns success for healthy OpenSearch cluster', async () => {
    const mock = await createMockServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'test-node',
        cluster_name: 'test-cluster',
        version: { number: '2.12.0', distribution: 'opensearch' },
      }));
    });

    try {
      const connections = getConnections();
      const result: ConnectionTestResult = await connections.testConnection({
        name: 'test',
        url: mock.url,
        type: 'opensearch',
        auth_type: 'none',
      });
      expect(result.success).toBe(true);
      expect(result.cluster_name).toBe('test-cluster');
      expect(result.version).toBe('2.12.0');
    } finally {
      mock.close();
    }
  });

  it('returns success for healthy Elasticsearch cluster', async () => {
    const mock = await createMockServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'es-node',
        cluster_name: 'es-cluster',
        version: { number: '8.17.0' },
      }));
    });

    try {
      const connections = getConnections();
      const result: ConnectionTestResult = await connections.testConnection({
        name: 'test',
        url: mock.url,
        type: 'elasticsearch',
        auth_type: 'none',
      });
      expect(result.success).toBe(true);
      expect(result.cluster_name).toBe('es-cluster');
      expect(result.version).toBe('8.17.0');
    } finally {
      mock.close();
    }
  });
});

describe('ConnectionManager: auth flows', () => {
  it('sends basic auth header', async () => {
    let receivedAuth = '';
    const mock = await createMockServer((req, res) => {
      receivedAuth = req.headers.authorization || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ cluster_name: 'c', version: { number: '2.12.0' } }));
    });

    try {
      const connections = getConnections();
      await connections.testConnection({
        name: 'basic-test',
        url: mock.url,
        type: 'opensearch',
        auth_type: 'basic',
        username: 'admin',
        password: 'secret',
      });
      expect(receivedAuth).toMatch(/^Basic /);
      const decoded = Buffer.from(receivedAuth.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('admin:secret');
    } finally {
      mock.close();
    }
  });

  it('sends API key header', async () => {
    let receivedAuth = '';
    const mock = await createMockServer((req, res) => {
      receivedAuth = req.headers.authorization || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ cluster_name: 'c', version: { number: '8.17.0' } }));
    });

    try {
      const connections = getConnections();
      await connections.testConnection({
        name: 'apikey-test',
        url: mock.url,
        type: 'elasticsearch',
        auth_type: 'apikey',
        api_key: 'my-api-key-123',
      });
      expect(receivedAuth).toContain('ApiKey');
    } finally {
      mock.close();
    }
  });
});

describe('ConnectionManager: failure modes', () => {
  it('returns error for unreachable host', async () => {
    const connections = getConnections();
    const result: ConnectionTestResult = await connections.testConnection({
      name: 'unreachable',
      url: 'http://127.0.0.1:1',
      type: 'opensearch',
      auth_type: 'none',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error for auth rejection (401)', async () => {
    const mock = await createMockServer((_req, res) => {
      res.writeHead(401);
      res.end('Unauthorized');
    });

    try {
      const connections = getConnections();
      const result: ConnectionTestResult = await connections.testConnection({
        name: 'bad-auth',
        url: mock.url,
        type: 'opensearch',
        auth_type: 'basic',
        username: 'admin',
        password: 'wrong',
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/auth|unauthorized|401/i);
    } finally {
      mock.close();
    }
  });

  it('returns error for timeout', async () => {
    const mock = await createMockServer((_req, _res) => {
      // Never respond — simulate timeout
    });

    try {
      const connections = getConnections();
      const result: ConnectionTestResult = await connections.testConnection({
        name: 'slow',
        url: mock.url,
        type: 'opensearch',
        auth_type: 'none',
      }, { timeoutMs: 500 });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/timeout|timed out|ETIMEDOUT/i);
    } finally {
      mock.close();
    }
  });

  it('returns error for invalid JSON response', async () => {
    const mock = await createMockServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html>Not a cluster</html>');
    });

    try {
      const connections = getConnections();
      const result: ConnectionTestResult = await connections.testConnection({
        name: 'bad-response',
        url: mock.url,
        type: 'opensearch',
        auth_type: 'none',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    } finally {
      mock.close();
    }
  });
});

describe('ConnectionManager: credential encryption', () => {
  it('encrypts credentials before storage and decrypts on retrieval', () => {
    const connections = getConnections();

    const encrypted = connections.encryptCredential('my-secret-password');
    expect(encrypted).not.toBe('my-secret-password');
    expect(Buffer.isBuffer(encrypted)).toBe(true);

    const decrypted = connections.decryptCredential(encrypted);
    expect(decrypted).toBe('my-secret-password');
  });

  it('handles empty credential gracefully', () => {
    const connections = getConnections();
    const encrypted = connections.encryptCredential('');
    const decrypted = connections.decryptCredential(encrypted);
    expect(decrypted).toBe('');
  });
});

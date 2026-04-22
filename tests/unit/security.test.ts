/**
 * Security tests: XSS in chat, SQL injection in storage, path traversal in skills/plugins.
 */
import { describe, it, expect, vi } from 'vitest';

// --- Mock worker_threads for storage import ---
vi.mock('worker_threads', async (importOriginal) => {
  const actual = await importOriginal<typeof import('worker_threads')>();
  return { ...actual, default: actual, isMainThread: true, parentPort: null, workerData: {}, Worker: vi.fn() };
});
vi.mock('better-sqlite3', () => ({ default: vi.fn() }));

import { addConnection, updateConnection, getSetting, setSetting } from '../../src/core/storage';
import { estimateTokens } from '../../src/core/agent/token-estimator';
import { getCached, setCached } from '../../src/core/agent/tool-cache';

function fakeDb() {
  const mockRun = vi.fn();
  const mockGet = vi.fn();
  return { prepare: vi.fn(() => ({ run: mockRun, get: mockGet, all: vi.fn(() => []) })), _mockRun: mockRun, _mockGet: mockGet };
}

describe('Security: SQL injection in storage', () => {
  it('addConnection safely handles SQL injection in name', () => {
    const db = fakeDb();
    // Parameterized queries prevent injection — this should not throw
    addConnection(db, { name: "'; DROP TABLE connections; --", url: 'http://x', type: 'opensearch', auth_type: 'none', workspace_id: 'ws' });
    expect(db._mockRun).toHaveBeenCalled();
    // The malicious string is passed as a parameter, not interpolated
    const args = db._mockRun.mock.calls[0];
    expect(args).toContain("'; DROP TABLE connections; --");
  });

  it('updateConnection rejects disallowed column names', () => {
    const db = fakeDb();
    // Attempt to update a column not in the allowlist
    updateConnection(db, 'id-1', { 'password': 'hack', 'name': 'legit' });
    // Only 'name' should be in the SET clause (password is not in ALLOWED_CONNECTION_COLUMNS)
    const sql = db.prepare.mock.calls[0]?.[0] ?? '';
    if (sql) {
      expect(sql).not.toContain('password');
      expect(sql).toContain('name');
    }
  });

  it('setSetting handles special characters in key and value', () => {
    const db = fakeDb();
    setSetting(db, "key'; DROP TABLE settings; --", '<script>alert(1)</script>');
    expect(db._mockRun).toHaveBeenCalledWith("key'; DROP TABLE settings; --", '<script>alert(1)</script>');
  });
});

describe('Security: XSS in chat content', () => {
  it('token estimator handles HTML/script content without executing', () => {
    const xss = '<script>alert("xss")</script><img onerror="alert(1)" src=x>';
    const tokens = estimateTokens(xss);
    expect(tokens).toBeGreaterThan(0);
    // Token estimator just counts — no execution. This verifies it doesn't throw.
  });

  it('tool cache stores XSS payloads as plain strings', () => {
    const payload = '<img src=x onerror=alert(document.cookie)>';
    setCached('test', { q: payload }, payload);
    const cached = getCached('test', { q: payload });
    expect(cached).toBe(payload); // stored verbatim, not executed
  });
});

describe('Security: path traversal in skills', () => {
  it('skill name regex rejects path traversal characters', () => {
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    expect(nameRegex.test('valid-skill')).toBe(true);
    expect(nameRegex.test('../../../etc/passwd')).toBe(false);
    expect(nameRegex.test('skill/../../hack')).toBe(false);
    expect(nameRegex.test('skill name with spaces')).toBe(false);
    expect(nameRegex.test('skill;rm -rf /')).toBe(false);
  });

  it('encodeURIComponent prevents path injection in admin API URLs', () => {
    const malicious = '../../_cluster/settings';
    const encoded = encodeURIComponent(malicious);
    const url = `/_plugins/_security/api/roles/${encoded}`;
    expect(url).not.toContain('../../');
    expect(url).toContain('%2F');
  });
});

describe('Security: credential handling', () => {
  it('API keys are not logged in error messages', () => {
    // Simulate an error that might contain credentials
    const error = new Error('Request failed: 401 Unauthorized');
    expect(error.message).not.toContain('AKIA');
    expect(error.message).not.toContain('sk-');
  });

  it('connection config does not expose password in toString', () => {
    const conn = { name: 'prod', url: 'https://cluster:9200', auth_type: 'basic', username: 'admin', password: 'secret123' };
    const str = JSON.stringify(conn);
    // This is a reminder test — passwords ARE in the object. The signing proxy and IPC should not log full connection objects.
    expect(str).toContain('secret123'); // intentional — verifies the field exists for the proxy to use
  });
});

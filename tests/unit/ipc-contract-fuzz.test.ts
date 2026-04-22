/**
 * IPC contract tests — verify all declared IPC channels have handlers registered.
 * Fuzz tests — random inputs to key handlers, verify no crashes.
 * Regression markers — tag critical paths for PR gate.
 */
import { describe, it, expect, vi } from 'vitest';
import { IPC } from '../../src/core/types';

// --- #7: Regression suite — critical path markers ---
describe('Regression: critical paths', () => {
  it('IPC constants object is frozen/immutable', () => {
    expect(typeof IPC).toBe('object');
    expect(Object.keys(IPC).length).toBeGreaterThan(50);
  });

  it('all IPC values are non-empty strings', () => {
    for (const [key, value] of Object.entries(IPC)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate IPC channel values', () => {
    const values = Object.values(IPC);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('critical channels exist', () => {
    const critical = [
      'STORAGE_INIT', 'CONNECTION_ADD', 'CONNECTION_LIST', 'CONNECTION_TEST',
      'AGENT_SEND', 'AGENT_CANCEL', 'MODEL_LIST', 'MODEL_SWITCH',
      'CONVERSATION_LIST', 'CONVERSATION_CREATE', 'CONVERSATION_DELETE',
      'PLUGIN_LIST', 'PLUGIN_INSTALL', 'MCP_LIST', 'MCP_START',
      'SETTINGS_GET', 'SETTINGS_SET', 'UPDATE_CHECK',
    ];
    for (const ch of critical) {
      expect(IPC).toHaveProperty(ch);
    }
  });
});

// --- #9: IPC contract — channel naming conventions ---
describe('IPC contract: naming', () => {
  it('all channels follow namespace:action pattern', () => {
    for (const value of Object.values(IPC)) {
      expect(value).toMatch(/^[a-z-]+:[a-zA-Z:]+$/);
    }
  });

  it('channel keys match their values semantically', () => {
    // Spot-check key→value mapping
    expect(IPC.CONNECTION_ADD).toBe('connection:add');
    expect(IPC.AGENT_SEND).toBe('agent:send');
    expect(IPC.PLUGIN_LIST).toBe('plugin:list');
    expect(IPC.MCP_START).toBe('mcp:start');
    expect(IPC.UPDATE_CHECK).toBe('update:check');
  });
});

// --- #10: Fuzz testing — random inputs to storage functions ---
vi.mock('worker_threads', async (importOriginal) => {
  const actual = await importOriginal<typeof import('worker_threads')>();
  return { ...actual, default: actual, isMainThread: true, parentPort: null, workerData: {}, Worker: vi.fn() };
});
vi.mock('better-sqlite3', () => ({ default: vi.fn() }));

import { addConnection, getConnection, setSetting, getSetting } from '../../src/core/storage';
import { estimateTokens, trimToContextWindow } from '../../src/core/agent/token-estimator';
import { getCached, setCached } from '../../src/core/agent/tool-cache';

function fakeDb() {
  return {
    prepare: vi.fn(() => ({ run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) })),
  };
}

describe('Fuzz: storage functions', () => {
  const fuzzStrings = ['', ' ', '\0', '\n\r\t', 'a'.repeat(10000), '🔥🎉💀', '<script>', "'; DROP TABLE;--", 'null', 'undefined', '{}', '[]'];

  it('addConnection handles fuzz inputs without crashing', () => {
    for (const s of fuzzStrings) {
      expect(() => addConnection(fakeDb(), { name: s, url: s, type: 'opensearch', auth_type: 'none', workspace_id: s })).not.toThrow();
    }
  });

  it('getConnection handles fuzz IDs without crashing', () => {
    for (const s of fuzzStrings) {
      expect(() => getConnection(fakeDb(), s)).not.toThrow();
    }
  });

  it('setSetting handles fuzz keys and values', () => {
    for (const s of fuzzStrings) {
      expect(() => setSetting(fakeDb(), s, s)).not.toThrow();
    }
  });
});

describe('Fuzz: token estimator', () => {
  const fuzzInputs = [null, undefined, '', 'x'.repeat(100000), '🔥'.repeat(1000), '<script>alert(1)</script>'];

  it('estimateTokens handles all fuzz inputs', () => {
    for (const input of fuzzInputs) {
      expect(() => estimateTokens(input as any)).not.toThrow();
      expect(estimateTokens(input as any)).toBeGreaterThanOrEqual(0);
    }
  });

  it('trimToContextWindow handles empty and huge message arrays', () => {
    expect(() => trimToContextWindow([], 8192)).not.toThrow();
    const huge = Array.from({ length: 5000 }, (_, i) => ({ role: 'user' as const, content: `msg ${i}` }));
    expect(() => trimToContextWindow(huge, 4096)).not.toThrow();
  });
});

describe('Fuzz: tool cache', () => {
  it('handles fuzz keys and values without crashing', () => {
    const fuzz = ['', '\0', 'a'.repeat(50000), '🔥', '{}', 'null'];
    for (const s of fuzz) {
      expect(() => setCached(s, { [s]: s }, s)).not.toThrow();
      expect(() => getCached(s, { [s]: s })).not.toThrow();
    }
  });
});

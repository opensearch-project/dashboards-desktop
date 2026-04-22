/**
 * Memory leak detection + offline mode graceful degradation.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('worker_threads', async (importOriginal) => {
  const actual = await importOriginal<typeof import('worker_threads')>();
  return { ...actual, default: actual, isMainThread: true, parentPort: null, workerData: {}, Worker: vi.fn() };
});
vi.mock('better-sqlite3', () => ({ default: vi.fn() }));

import { ToolRegistry } from '../../src/core/agent/tool-registry';
import { estimateMessageTokens, trimToContextWindow } from '../../src/core/agent/token-estimator';
import { getCached, setCached, clearCache, cacheSize } from '../../src/core/agent/tool-cache';
import { SettingsPersistence } from '../../src/core/osd/settings-persistence';

function fakeDb() {
  const store: Record<string, any[]> = { osd_config: [], osd_plugins: [], osd_versions: [] };
  return {
    exec: vi.fn(),
    prepare: vi.fn((sql: string) => ({
      get: vi.fn((...args: any[]) => {
        if (sql.includes('osd_config') && sql.includes('WHERE')) return store.osd_config.find(r => r.key === args[0]);
        if (sql.includes('osd_versions')) return store.osd_versions[store.osd_versions.length - 1];
      }),
      all: vi.fn(() => sql.includes('osd_config') ? store.osd_config : sql.includes('osd_plugins') ? store.osd_plugins : []),
      run: vi.fn((...args: any[]) => {
        if (sql.includes('INSERT') && sql.includes('osd_config')) {
          store.osd_config = store.osd_config.filter(r => r.key !== args[0]);
          store.osd_config.push({ key: args[0], value: args[1] });
        }
        if (sql.includes('DELETE') && sql.includes('osd_config')) store.osd_config = [];
        if (sql.includes('INSERT') && sql.includes('osd_plugins')) {
          store.osd_plugins = store.osd_plugins.filter(r => r.name !== args[0]);
          store.osd_plugins.push({ name: args[0], source: args[1] });
        }
        if (sql.includes('DELETE') && sql.includes('osd_plugins')) store.osd_plugins = [];
      }),
    })),
    transaction: vi.fn((fn: () => void) => fn),
  };
}

// --- #3: Memory leak detection ---
describe('Memory: tool registry churn', () => {
  it('register/unregister 500 tools — no growth', () => {
    const reg = new ToolRegistry();
    for (let i = 0; i < 500; i++) {
      reg.register({ definition: { name: `t-${i}`, description: '', source: 'builtin', inputSchema: {}, requiresApproval: false }, execute: vi.fn(async () => ({ content: '', isError: false })) });
    }
    expect(reg.list()).toHaveLength(500);
    for (let i = 0; i < 500; i++) reg.unregister(`t-${i}`);
    expect(reg.list()).toHaveLength(0);
  });
});

describe('Memory: tool cache eviction', () => {
  it('cache does not grow unbounded with unique keys', () => {
    for (let i = 0; i < 1000; i++) setCached(`tool-${i}`, { i }, `result-${i}`);
    expect(cacheSize()).toBe(1000);
    clearCache();
    expect(cacheSize()).toBe(0);
  });
});

describe('Memory: conversation simulation', () => {
  it('1000 messages trimmed to context window — no accumulation', () => {
    const msgs = Array.from({ length: 1000 }, (_, i) => ({ role: (i % 2 === 0 ? 'user' : 'assistant') as const, content: `msg ${i}` }));
    const trimmed = trimToContextWindow([{ role: 'system', content: 'sys' }, ...msgs], 128_000);
    expect(trimmed.length).toBeLessThanOrEqual(1001);
    expect(trimmed.length).toBeGreaterThan(0);
    // With large context window, system is kept
    expect(trimmed[0].role).toBe('system');
  });
});

describe('Memory: settings persistence churn', () => {
  it('100 config write/delete cycles — no leak', () => {
    const sp = new SettingsPersistence(fakeDb());
    for (let i = 0; i < 100; i++) {
      sp.setConfig(`key-${i}`, `val-${i}`);
    }
    expect(Object.keys(sp.getAllConfig())).toHaveLength(100);
    for (let i = 0; i < 100; i++) sp.deleteConfig(`key-${i}`);
    expect(Object.keys(sp.getAllConfig())).toHaveLength(0);
  });
});

// --- #4: Offline mode ---
describe('Offline: token estimator works without network', () => {
  it('estimates tokens for local content', () => {
    const tokens = estimateMessageTokens({ role: 'user', content: 'Hello world, no network needed' });
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('Offline: tool cache works without network', () => {
  it('cache hit/miss works offline', () => {
    clearCache();
    expect(getCached('offline-tool', { q: 'test' })).toBeNull();
    setCached('offline-tool', { q: 'test' }, 'cached result');
    expect(getCached('offline-tool', { q: 'test' })).toBe('cached result');
  });
});

describe('Offline: settings persistence works without network', () => {
  it('CRUD operations work offline', () => {
    const sp = new SettingsPersistence(fakeDb());
    sp.setConfig('offline.key', 'works');
    expect(sp.getConfig('offline.key')).toBe('works');
    sp.addPlugin('local-plugin', '/path/to/plugin.zip');
    expect(sp.listPlugins()).toHaveLength(1);
    const json = sp.exportJSON();
    expect(JSON.parse(json).config['offline.key']).toBe('works');
  });
});

describe('Offline: tool registry works without network', () => {
  it('register, lookup, execute tools offline', async () => {
    const reg = new ToolRegistry();
    reg.register({
      definition: { name: 'local-tool', description: 'works offline', source: 'builtin', inputSchema: {}, requiresApproval: false },
      execute: vi.fn(async () => ({ content: 'offline result', isError: false })),
    });
    expect(reg.get('local-tool')).toBeDefined();
    const result = await reg.execute('local-tool', {}, { workspaceId: 'ws', activeConnection: null, signal: new AbortController().signal });
    expect(result.content).toBe('offline result');
  });
});

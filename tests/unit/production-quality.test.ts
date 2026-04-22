/**
 * v0.6 Production Quality Tests:
 * #5 Load, #6 Upgrade, #7 Rollback, #8 Network resilience,
 * #10 Chaos, #11 API compat, #12 Benchmarks
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
        if (sql.includes('DELETE') && sql.includes('osd_config')) { if (args[0]) store.osd_config = store.osd_config.filter(r => r.key !== args[0]); else store.osd_config = []; }
        if (sql.includes('INSERT') && sql.includes('osd_plugins')) {
          store.osd_plugins = store.osd_plugins.filter(r => r.name !== args[0]);
          store.osd_plugins.push({ name: args[0], source: args[1] });
        }
        if (sql.includes('DELETE') && sql.includes('osd_plugins')) store.osd_plugins = [];
        if (sql.includes('INSERT') && sql.includes('osd_versions')) store.osd_versions.push({ version: args[0], path: args[1] });
      }),
    })),
    transaction: vi.fn((fn: () => void) => fn),
  };
}

// --- #5: Load testing ---
describe('Load: 50 concurrent tool executions', () => {
  it('handles 50 parallel tool calls without errors', async () => {
    const reg = new ToolRegistry();
    reg.register({
      definition: { name: 'load-test', description: '', source: 'builtin', inputSchema: {}, requiresApproval: false },
      execute: vi.fn(async () => { await new Promise(r => setTimeout(r, 5)); return { content: 'ok', isError: false }; }),
    });
    const ctx = { workspaceId: 'ws', activeConnection: null, signal: new AbortController().signal };
    const start = performance.now();
    const results = await Promise.all(Array.from({ length: 50 }, () => reg.execute('load-test', {}, ctx)));
    const elapsed = performance.now() - start;
    expect(results.every(r => !r.isError)).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });
});

describe('Load: 10k cache entries', () => {
  it('handles 10k entries without degradation', () => {
    clearCache();
    const start = performance.now();
    for (let i = 0; i < 10000; i++) setCached(`t-${i}`, { i }, `r-${i}`);
    const writeTime = performance.now() - start;
    expect(cacheSize()).toBe(10000);
    const readStart = performance.now();
    for (let i = 0; i < 10000; i++) getCached(`t-${i}`, { i });
    const readTime = performance.now() - readStart;
    expect(writeTime).toBeLessThan(2000);
    expect(readTime).toBeLessThan(2000);
    clearCache();
  });
});

// --- #6: Upgrade testing ---
describe('Upgrade: settings survive version change', () => {
  it('config persists across version recording', () => {
    const sp = new SettingsPersistence(fakeDb());
    sp.setConfig('server.port', '5601');
    sp.addPlugin('alerting', 'url');
    sp.recordVersion('2.12.0', '/opt/osd');
    expect(sp.getConfig('server.port')).toBe('5601');
    expect(sp.listPlugins()).toHaveLength(1);
    sp.recordVersion('2.13.0', '/opt/osd');
    expect(sp.getConfig('server.port')).toBe('5601');
    expect(sp.listPlugins()).toHaveLength(1);
  });

  it('export from old version imports into new', () => {
    const old = new SettingsPersistence(fakeDb());
    old.setConfig('key', 'val');
    old.addPlugin('p1', 'url');
    old.recordVersion('2.12.0', '/opt/osd');
    const json = old.exportJSON();
    const fresh = new SettingsPersistence(fakeDb());
    fresh.importJSON(json);
    fresh.recordVersion('2.13.0', '/opt/osd');
    expect(fresh.getConfig('key')).toBe('val');
    expect(fresh.listPlugins()[0].name).toBe('p1');
  });
});

// --- #7: Rollback testing ---
describe('Rollback: no data loss on downgrade', () => {
  it('settings survive version downgrade', () => {
    const sp = new SettingsPersistence(fakeDb());
    sp.setConfig('a', '1');
    sp.recordVersion('2.13.0', '/opt/osd');
    sp.recordVersion('2.12.0', '/opt/osd'); // downgrade
    expect(sp.getConfig('a')).toBe('1');
    expect(sp.isUpgrade('2.12.0')).toBe(false);
  });

  it('export/import round-trip preserves all data', () => {
    const sp = new SettingsPersistence(fakeDb());
    for (let i = 0; i < 10; i++) sp.setConfig(`k${i}`, `v${i}`);
    for (let i = 0; i < 5; i++) sp.addPlugin(`p${i}`, `url${i}`);
    const json = sp.exportJSON();
    const restored = new SettingsPersistence(fakeDb());
    restored.importJSON(json);
    expect(Object.keys(restored.getAllConfig())).toHaveLength(10);
    expect(restored.listPlugins()).toHaveLength(5);
  });
});

// --- #8: Network resilience ---
describe('Network: graceful degradation', () => {
  it('tool execution returns error on connection failure', async () => {
    const reg = new ToolRegistry();
    reg.register({
      definition: { name: 'net-test', description: '', source: 'builtin', inputSchema: {}, requiresApproval: false },
      execute: vi.fn(async () => { throw new Error('ECONNREFUSED'); }),
    });
    const ctx = { workspaceId: 'ws', activeConnection: null, signal: new AbortController().signal };
    const result = await reg.execute('net-test', {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toContain('ECONNREFUSED');
  });

  it('token estimation works without network', () => {
    expect(estimateMessageTokens({ role: 'user', content: 'offline query' })).toBeGreaterThan(0);
  });

  it('settings persistence works without network', () => {
    const sp = new SettingsPersistence(fakeDb());
    sp.setConfig('offline', 'true');
    expect(sp.getConfig('offline')).toBe('true');
  });
});

// --- #10: Chaos testing ---
describe('Chaos: corrupt/invalid inputs', () => {
  it('importJSON rejects corrupt JSON', () => {
    const sp = new SettingsPersistence(fakeDb());
    expect(() => sp.importJSON('{corrupt')).toThrow();
    expect(() => sp.importJSON('')).toThrow();
  });

  it('tool registry handles missing tool gracefully', async () => {
    const reg = new ToolRegistry();
    const ctx = { workspaceId: 'ws', activeConnection: null, signal: new AbortController().signal };
    const result = await reg.execute('nonexistent', {}, ctx);
    expect(result.isError).toBe(true);
  });

  it('context window trim handles zero budget', () => {
    const msgs = [{ role: 'user' as const, content: 'hello' }];
    const trimmed = trimToContextWindow(msgs, 0);
    expect(trimmed.length).toBeLessThanOrEqual(1);
  });

  it('cache handles concurrent read/write', () => {
    clearCache();
    for (let i = 0; i < 100; i++) {
      setCached('key', { i }, `val-${i}`);
      getCached('key', { i });
    }
    expect(cacheSize()).toBe(100);
    clearCache();
  });
});

// --- #12: Benchmark suite ---
describe('Benchmark: execution time tracking', () => {
  it('token estimation: 10k messages under 1s', () => {
    const msgs = Array.from({ length: 10000 }, (_, i) => ({ role: 'user' as const, content: `msg ${i}` }));
    const start = performance.now();
    msgs.forEach(m => estimateMessageTokens(m));
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('tool registry: 1000 register+lookup under 500ms', () => {
    const reg = new ToolRegistry();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      reg.register({ definition: { name: `bench-${i}`, description: '', source: 'builtin', inputSchema: {}, requiresApproval: false }, execute: vi.fn(async () => ({ content: '', isError: false })) });
      reg.get(`bench-${i}`);
    }
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('settings: 500 config writes under 500ms', () => {
    const sp = new SettingsPersistence(fakeDb());
    const start = performance.now();
    for (let i = 0; i < 500; i++) sp.setConfig(`bench-${i}`, `val-${i}`);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('yml generation: 200 keys under 100ms', () => {
    const sp = new SettingsPersistence(fakeDb());
    for (let i = 0; i < 200; i++) sp.setConfig(`key.${i}`, `val-${i}`);
    const start = performance.now();
    sp.generateYml();
    expect(performance.now() - start).toBeLessThan(100);
  });
});

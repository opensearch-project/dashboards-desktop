/**
 * Performance + stress tests: chat latency, conversation scale, memory.
 */
import { describe, it, expect, vi } from 'vitest';
import { SettingsPersistence } from '../../../src/core/osd/settings-persistence';

function fakeDb() {
  const store: Record<string, any[]> = { osd_config: [], osd_plugins: [], osd_versions: [] };
  return {
    exec: vi.fn(),
    prepare: vi.fn((sql: string) => ({
      get: vi.fn((...args: any[]) => {
        if (sql.includes('osd_config') && sql.includes('WHERE')) return store.osd_config.find(r => r.key === args[0]);
        if (sql.includes('osd_versions')) return store.osd_versions[store.osd_versions.length - 1];
      }),
      all: vi.fn(() => {
        if (sql.includes('osd_config')) return store.osd_config;
        if (sql.includes('osd_plugins')) return store.osd_plugins;
        return [];
      }),
      run: vi.fn((...args: any[]) => {
        if (sql.includes('INSERT') && sql.includes('osd_config')) {
          store.osd_config = store.osd_config.filter(r => r.key !== args[0]);
          store.osd_config.push({ key: args[0], value: args[1] });
        }
        if (sql.includes('DELETE') && sql.includes('osd_config')) {
          if (args.length) store.osd_config = store.osd_config.filter(r => r.key !== args[0]);
          else store.osd_config = [];
        }
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

describe('Performance: settings persistence', () => {
  it('handles 100 config entries without degradation', () => {
    const sp = new SettingsPersistence(fakeDb());
    const start = performance.now();
    for (let i = 0; i < 100; i++) sp.setConfig(`key.${i}`, `value-${i}`);
    const writeTime = performance.now() - start;

    const readStart = performance.now();
    const all = sp.getAllConfig();
    const readTime = performance.now() - readStart;

    expect(Object.keys(all)).toHaveLength(100);
    expect(writeTime).toBeLessThan(500); // 100 writes under 500ms
    expect(readTime).toBeLessThan(100);  // read all under 100ms
  });

  it('generateYml scales with config size', () => {
    const sp = new SettingsPersistence(fakeDb());
    for (let i = 0; i < 50; i++) sp.setConfig(`opensearch.setting.${i}`, `value-${i}`);
    const start = performance.now();
    const yml = sp.generateYml();
    const elapsed = performance.now() - start;

    expect(yml.split('\n').length).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(100);
  });
});

describe('Performance: export/import', () => {
  it('export + import round-trip with 50 plugins', () => {
    const sp = new SettingsPersistence(fakeDb());
    for (let i = 0; i < 50; i++) sp.addPlugin(`plugin-${i}`, `https://url/${i}.zip`);
    for (let i = 0; i < 20; i++) sp.setConfig(`key.${i}`, `val-${i}`);

    const start = performance.now();
    const json = sp.exportJSON();
    const exportTime = performance.now() - start;

    const sp2 = new SettingsPersistence(fakeDb());
    const importStart = performance.now();
    sp2.importJSON(json);
    const importTime = performance.now() - importStart;

    expect(exportTime).toBeLessThan(100);
    expect(importTime).toBeLessThan(100);
    expect(sp2.listPlugins()).toHaveLength(50);
  });
});

describe('Stress: token estimator', () => {
  it('handles 1000 messages without overflow', async () => {
    const { estimateTokens, estimateMessageTokens } = await import('../../../src/core/agent/token-estimator');
    const messages = Array.from({ length: 1000 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i}: ${'x'.repeat(200)}`,
    }));

    const start = performance.now();
    let total = 0;
    for (const msg of messages) total += estimateMessageTokens(msg);
    const elapsed = performance.now() - start;

    expect(total).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500); // 1000 estimates under 500ms
  });
});

describe('Stress: context window trimming', () => {
  it('trims 1000 messages to fit context window', async () => {
    const { trimToContextWindow } = await import('../../../src/core/agent/token-estimator');
    const messages = [
      { role: 'system' as const, content: 'You are a helpful assistant.' },
      ...Array.from({ length: 1000 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}: ${'x'.repeat(100)}`,
      })),
    ];

    const start = performance.now();
    const trimmed = trimToContextWindow(messages, 8192);
    const elapsed = performance.now() - start;

    expect(trimmed.length).toBeLessThan(messages.length);
    expect(trimmed[0].role).toBe('system'); // system always kept
    expect(elapsed).toBeLessThan(200);
  });
});

describe('Stress: tool registry at scale', () => {
  it('registers and looks up 100 tools', async () => {
    const { ToolRegistry } = await import('../../../src/core/agent/tool-registry');
    const reg = new ToolRegistry();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      reg.register({
        definition: { name: `tool-${i}`, description: `Tool ${i}`, source: 'builtin', inputSchema: { type: 'object' }, requiresApproval: false },
        execute: vi.fn(async () => ({ content: 'ok', isError: false })),
      });
    }
    const registerTime = performance.now() - start;

    const lookupStart = performance.now();
    for (let i = 0; i < 100; i++) reg.get(`tool-${i}`);
    const lookupTime = performance.now() - lookupStart;

    expect(reg.list()).toHaveLength(100);
    expect(registerTime).toBeLessThan(200);
    expect(lookupTime).toBeLessThan(50);
  });
});

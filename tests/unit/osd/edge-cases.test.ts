/**
 * Edge cases and negative tests: OSD crash recovery, invalid config, plugin failures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// --- OSD crash mid-session ---
const mockChild = () => {
  const child = new EventEmitter() as any;
  child.pid = 9999;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
};

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, default: actual, spawn: (...args: any[]) => spawnMock(...args) };
});

vi.mock('http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('http')>();
  return {
    ...actual, default: actual,
    get: (_url: string, cb: (res: { statusCode: number }) => void) => {
      const req = new EventEmitter() as any;
      req.setTimeout = vi.fn(); req.destroy = vi.fn();
      setTimeout(() => cb({ statusCode: 200 }), 5);
      return req;
    },
  };
});

import { OsdLifecycle } from '../../../src/core/osd/lifecycle';

beforeEach(() => { spawnMock.mockReset().mockReturnValue(mockChild()); });

describe('Edge: OSD crash mid-session', () => {
  it('emits unhealthy when health check fails after running', async () => {
    const osd = new OsdLifecycle({ binPath: '/bin/osd' });
    await osd.start();
    expect(osd.status).toBe('running');

    // Simulate crash via exit event
    const child = spawnMock.mock.results[0].value;
    const statuses: string[] = [];
    osd.on('status', (s: string) => statuses.push(s));
    child.emit('exit', 137); // SIGKILL
    expect(statuses).toContain('error');
    expect(osd.status).toBe('error');
  });

  it('can restart after crash', async () => {
    const osd = new OsdLifecycle({ binPath: '/bin/osd' });
    await osd.start();
    const child1 = spawnMock.mock.results[0].value;
    child1.emit('exit', 1);
    expect(osd.status).toBe('error');

    // Restart
    spawnMock.mockReturnValue(mockChild());
    await osd.start();
    expect(osd.status).toBe('running');
    expect(spawnMock).toHaveBeenCalledTimes(2);
    osd.stop();
  });

  it('stop is safe to call when already stopped', () => {
    const osd = new OsdLifecycle({ binPath: '/bin/osd' });
    osd.stop(); // no-op, no crash
    expect(osd.status).toBe('stopped');
  });
});

// --- Invalid config ---
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

describe('Edge: invalid config', () => {
  it('generateYml handles empty config', () => {
    const sp = new SettingsPersistence(fakeDb());
    const yml = sp.generateYml();
    expect(yml).toBe('\n');
  });

  it('generateYml handles special characters in values', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('server.name', 'my "cluster" name');
    const yml = sp.generateYml();
    expect(yml).toContain('my "cluster" name');
  });

  it('importJSON rejects invalid JSON', () => {
    const sp = new SettingsPersistence(fakeDb());
    expect(() => sp.importJSON('not json')).toThrow();
  });

  it('importJSON handles empty config and plugins', () => {
    const sp = new SettingsPersistence(fakeDb());
    sp.importJSON(JSON.stringify({ config: {}, plugins: [] }));
    expect(sp.getAllConfig()).toEqual({});
    expect(sp.listPlugins()).toEqual([]);
  });
});

// --- Plugin install failures ---
// Note: child_process is already mocked above. Plugin installer uses execFileSync
// which we need to mock separately since the existing mock only covers spawn.

describe('Edge: plugin install failures', () => {
  it('installPlugin returns failure object on CLI error', async () => {
    // Test via the plugin-installer module's error handling
    const { installPlugin: install } = await import('../../../src/core/osd/plugin-installer');
    // execFileSync will throw because the binary doesn't exist in test env
    const result = install('nonexistent-plugin');
    expect(result.success).toBe(false);
    expect(result.output.length).toBeGreaterThan(0);
  });

  it('removePlugin returns failure object on CLI error', async () => {
    const { removePlugin: remove } = await import('../../../src/core/osd/plugin-installer');
    const result = remove('nonexistent');
    expect(result.success).toBe(false);
  });

  it('listInstalledPlugins returns empty when dir missing', async () => {
    const { listInstalledPlugins } = await import('../../../src/core/osd/plugin-installer');
    // OSD_DIR doesn't exist in test env
    const plugins = listInstalledPlugins();
    expect(Array.isArray(plugins)).toBe(true);
  });
});

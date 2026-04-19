import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPersistence } from '../../../src/core/osd/settings-persistence';

function fakeDb() {
  const store: Record<string, Record<string, any>[]> = { osd_config: [], osd_plugins: [], osd_versions: [] };
  return {
    exec: vi.fn(),
    prepare: vi.fn((sql: string) => ({
      get: vi.fn((...args: any[]) => {
        if (sql.includes('osd_config') && sql.includes('WHERE key')) return store.osd_config.find(r => r.key === args[0]);
        if (sql.includes('osd_versions') && sql.includes('ORDER BY')) return store.osd_versions[store.osd_versions.length - 1];
        return undefined;
      }),
      all: vi.fn(() => {
        if (sql.includes('osd_config')) return store.osd_config;
        if (sql.includes('osd_plugins')) return store.osd_plugins;
        return [];
      }),
      run: vi.fn((...args: any[]) => {
        if (sql.includes('INSERT') && sql.includes('osd_config')) {
          const existing = store.osd_config.findIndex(r => r.key === args[0]);
          if (existing >= 0) store.osd_config[existing] = { key: args[0], value: args[1] };
          else store.osd_config.push({ key: args[0], value: args[1] });
        }
        if (sql.includes('DELETE') && sql.includes('osd_config')) {
          if (args[0]) store.osd_config = store.osd_config.filter(r => r.key !== args[0]);
          else store.osd_config = [];
        }
        if (sql.includes('INSERT') && sql.includes('osd_plugins')) {
          store.osd_plugins = store.osd_plugins.filter(r => r.name !== args[0]);
          store.osd_plugins.push({ name: args[0], source: args[1] });
        }
        if (sql.includes('DELETE') && sql.includes('osd_plugins')) {
          if (args[0]) store.osd_plugins = store.osd_plugins.filter(r => r.name !== args[0]);
          else store.osd_plugins = [];
        }
        if (sql.includes('INSERT') && sql.includes('osd_versions')) {
          store.osd_versions.push({ version: args[0], path: args[1] });
        }
      }),
    })),
    transaction: vi.fn((fn: () => void) => fn),
  };
}

describe('SettingsPersistence: config CRUD', () => {
  it('setConfig and getConfig round-trip', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('server.port', '5601');
    expect(sp.getConfig('server.port')).toBe('5601');
  });

  it('getAllConfig returns all entries', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('server.host', '0.0.0.0');
    sp.setConfig('server.port', '5601');
    const all = sp.getAllConfig();
    expect(all['server.host']).toBe('0.0.0.0');
    expect(all['server.port']).toBe('5601');
  });

  it('deleteConfig removes entry', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('key', 'val');
    sp.deleteConfig('key');
    expect(sp.getConfig('key')).toBeUndefined();
  });

  it('setConfig overwrites existing', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('port', '5601');
    sp.setConfig('port', '9200');
    expect(sp.getConfig('port')).toBe('9200');
  });
});

describe('SettingsPersistence: plugin tracking', () => {
  it('addPlugin and listPlugins', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.addPlugin('alerting', 'https://artifacts.opensearch.org/alerting-2.12.0.zip');
    const plugins = sp.listPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('alerting');
  });

  it('removePlugin removes from list', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.addPlugin('alerting', 'url');
    sp.removePlugin('alerting');
    expect(sp.listPlugins()).toHaveLength(0);
  });

  it('addPlugin replaces existing', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.addPlugin('alerting', 'old-url');
    sp.addPlugin('alerting', 'new-url');
    const plugins = sp.listPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].source).toBe('new-url');
  });
});

describe('SettingsPersistence: version tracking', () => {
  it('isUpgrade returns false on first run', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    expect(sp.isUpgrade('2.12.0')).toBe(false);
  });

  it('isUpgrade returns true when version changes', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.recordVersion('2.11.0', '/opt/osd');
    expect(sp.isUpgrade('2.12.0')).toBe(true);
  });

  it('isUpgrade returns false when version matches', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.recordVersion('2.12.0', '/opt/osd');
    expect(sp.isUpgrade('2.12.0')).toBe(false);
  });
});

describe('SettingsPersistence: generateYml', () => {
  it('generates yml from stored config', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('server.host', '0.0.0.0');
    sp.setConfig('server.port', '5601');
    const yml = sp.generateYml();
    expect(yml).toContain('server.host: 0.0.0.0');
    expect(yml).toContain('server.port: 5601');
  });

  it('sorts keys alphabetically', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('z.key', 'z');
    sp.setConfig('a.key', 'a');
    const yml = sp.generateYml();
    expect(yml.indexOf('a.key')).toBeLessThan(yml.indexOf('z.key'));
  });
});

describe('SettingsPersistence: export/import', () => {
  it('exportJSON returns valid JSON with config and plugins', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    sp.setConfig('server.port', '5601');
    sp.addPlugin('alerting', 'url');
    const json = sp.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.config['server.port']).toBe('5601');
    expect(parsed.plugins[0].name).toBe('alerting');
  });

  it('importJSON restores config and plugins', () => {
    const db = fakeDb();
    const sp = new SettingsPersistence(db);
    const data = { config: { 'server.host': 'localhost' }, plugins: [{ name: 'ml', source: 'url' }] };
    sp.importJSON(JSON.stringify(data));
    expect(sp.getConfig('server.host')).toBe('localhost');
    expect(sp.listPlugins()[0].name).toBe('ml');
  });
});

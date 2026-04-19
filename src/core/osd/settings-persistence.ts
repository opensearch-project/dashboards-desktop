/**
 * Sidebar settings persistence — SQLite-backed storage that survives OSD upgrades.
 * Stores: OSD yml overrides, tracked plugins, UI preferences.
 * Supports: export/import JSON, upgrade detection + re-apply.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS osd_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS osd_plugins (
  name TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  installed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS osd_versions (
  version TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);
`;

export interface OsdPlugin { name: string; source: string; installed_at?: string }
export interface SidebarSettings {
  config: Record<string, string>;
  plugins: OsdPlugin[];
  version?: string;
}

export class SettingsPersistence {
  constructor(private db: DB) {
    this.db.exec(SCHEMA);
  }

  // --- OSD Config (yml overrides) ---

  getConfig(key: string): string | undefined {
    return this.db.prepare('SELECT value FROM osd_config WHERE key = ?').get(key)?.value;
  }

  setConfig(key: string, value: string): void {
    this.db.prepare(
      `INSERT INTO osd_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, value);
  }

  deleteConfig(key: string): void {
    this.db.prepare('DELETE FROM osd_config WHERE key = ?').run(key);
  }

  getAllConfig(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM osd_config').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  // --- Plugin tracking ---

  addPlugin(name: string, source: string): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO osd_plugins (name, source, installed_at) VALUES (?, ?, datetime('now'))`
    ).run(name, source);
  }

  removePlugin(name: string): void {
    this.db.prepare('DELETE FROM osd_plugins WHERE name = ?').run(name);
  }

  listPlugins(): OsdPlugin[] {
    return this.db.prepare('SELECT name, source, installed_at FROM osd_plugins ORDER BY name').all() as OsdPlugin[];
  }

  // --- Version tracking + upgrade detection ---

  recordVersion(version: string, osdPath: string): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO osd_versions (version, path, applied_at) VALUES (?, ?, datetime('now'))`
    ).run(version, osdPath);
  }

  getLastVersion(): { version: string; path: string } | undefined {
    return this.db.prepare('SELECT version, path FROM osd_versions ORDER BY applied_at DESC LIMIT 1').get() as { version: string; path: string } | undefined;
  }

  isUpgrade(currentVersion: string): boolean {
    const last = this.getLastVersion();
    return !!last && last.version !== currentVersion;
  }

  // --- Export / Import ---

  exportJSON(): string {
    const data: SidebarSettings = {
      config: this.getAllConfig(),
      plugins: this.listPlugins(),
      version: this.getLastVersion()?.version,
    };
    return JSON.stringify(data, null, 2);
  }

  importJSON(json: string): void {
    const data = JSON.parse(json) as SidebarSettings;
    const tx = this.db.transaction(() => {
      // Config
      this.db.prepare('DELETE FROM osd_config').run();
      const ins = this.db.prepare('INSERT INTO osd_config (key, value) VALUES (?, ?)');
      for (const [k, v] of Object.entries(data.config)) ins.run(k, v);
      // Plugins
      this.db.prepare('DELETE FROM osd_plugins').run();
      const insP = this.db.prepare('INSERT INTO osd_plugins (name, source) VALUES (?, ?)');
      for (const p of data.plugins) insP.run(p.name, p.source);
    });
    tx();
  }

  // --- YML generation from stored config ---

  generateYml(): string {
    const config = this.getAllConfig();
    const lines = Object.entries(config)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}: ${value}`);
    return lines.join('\n') + '\n';
  }
}

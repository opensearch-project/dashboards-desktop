/**
 * Cluster templates — save cluster setup as template, apply to new connections.
 */

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

export function registerClusterTemplatesIPC(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS cluster_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    config TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  ipcMain.handle('cluster-template:save', (_e, name: string, description: string, config: Record<string, unknown>) => {
    db.prepare('INSERT OR REPLACE INTO cluster_templates (name, description, config) VALUES (?, ?, ?)').run(name, description, JSON.stringify(config));
  });

  ipcMain.handle('cluster-template:list', () => {
    const rows = db.prepare('SELECT * FROM cluster_templates ORDER BY name').all() as Array<Record<string, unknown>>;
    return rows.map(r => ({ ...r, config: JSON.parse(r.config as string) }));
  });

  ipcMain.handle('cluster-template:get', (_e, name: string) => {
    const row = db.prepare('SELECT * FROM cluster_templates WHERE name = ?').get(name) as Record<string, unknown> | undefined;
    return row ? { ...row, config: JSON.parse(row.config as string) } : null;
  });

  ipcMain.handle('cluster-template:delete', (_e, name: string) => {
    db.prepare('DELETE FROM cluster_templates WHERE name = ?').run(name);
  });

  ipcMain.handle('cluster-template:apply', (_e, name: string) => {
    const row = db.prepare('SELECT config FROM cluster_templates WHERE name = ?').get(name) as { config: string } | undefined;
    return row ? JSON.parse(row.config) : null;
  });
}

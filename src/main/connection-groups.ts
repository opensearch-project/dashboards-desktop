/**
 * Connection groups — organize connections by environment (prod/staging/dev).
 */

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

export function registerConnectionGroupsIPC(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS connection_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#4da6ff'
  )`);
  
  // SQLite ALTER TABLE doesn't throw in better-sqlite3, it just fails silently if column exists
  try { db.exec('ALTER TABLE connections ADD COLUMN group_id INTEGER REFERENCES connection_groups(id)'); } catch { /* already exists */ }

  // Seed defaults
  const count = (db.prepare('SELECT COUNT(*) as c FROM connection_groups').get() as { c: number }).c;
  if (count === 0) {
    db.prepare('INSERT INTO connection_groups (name, color) VALUES (?, ?)').run('Production', '#f44336');
    db.prepare('INSERT INTO connection_groups (name, color) VALUES (?, ?)').run('Staging', '#ff9800');
    db.prepare('INSERT INTO connection_groups (name, color) VALUES (?, ?)').run('Development', '#4caf50');
  }

  ipcMain.handle('connection-groups:list', () => db.prepare('SELECT * FROM connection_groups').all());

  ipcMain.handle('connection-groups:create', (_e, name: string, color: string) => {
    db.prepare('INSERT INTO connection_groups (name, color) VALUES (?, ?)').run(name, color);
  });

  ipcMain.handle('connection-groups:delete', (_e, id: number) => {
    db.prepare('UPDATE connections SET group_id = NULL WHERE group_id = ?').run(id);
    db.prepare('DELETE FROM connection_groups WHERE id = ?').run(id);
  });

  ipcMain.handle('connection-groups:assign', (_e, connectionId: string, groupId: number | null) => {
    db.prepare('UPDATE connections SET group_id = ? WHERE id = ?').run(groupId, connectionId);
  });

  ipcMain.handle('connection-groups:members', (_e, groupId: number) => {
    return db.prepare('SELECT * FROM connections WHERE group_id = ?').all(groupId);
  });
}

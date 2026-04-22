/**
 * Audit log — log all destructive operations to SQLite.
 */

import Database from 'better-sqlite3';
import { ipcMain } from 'electron';

let db: Database.Database;

export function initAuditLog(dbPath: string): void {
  db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    target TEXT,
    detail TEXT,
    result TEXT,
    user TEXT DEFAULT 'local'
  )`);

  ipcMain.handle('audit:list', (_e, limit = 100) => {
    return db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(limit);
  });

  ipcMain.handle('audit:clear', () => {
    db.exec('DELETE FROM audit_log');
  });
}

export function auditLog(action: string, target: string, detail?: string, result?: string): void {
  if (!db) return;
  db.prepare('INSERT INTO audit_log (action, target, detail, result) VALUES (?, ?, ?, ?)').run(action, target, detail ?? '', result ?? 'ok');
}

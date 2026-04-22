/**
 * Session restore — remember sidebar state, active connection, active page on restart.
 */

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

interface SessionState { activePage: string; activeConnectionId: string | null; sidebarExpanded: boolean; windowBounds: { x: number; y: number; width: number; height: number } | null; }

export function registerSessionRestoreIPC(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS session_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  ipcMain.handle('session:save', (_e, state: SessionState) => {
    db.prepare('INSERT OR REPLACE INTO session_state (key, value) VALUES (?, ?)').run('last_session', JSON.stringify(state));
  });

  ipcMain.handle('session:restore', () => {
    const row = db.prepare('SELECT value FROM session_state WHERE key = ?').get('last_session') as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  });
}

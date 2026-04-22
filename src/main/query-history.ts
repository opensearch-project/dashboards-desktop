/**
 * Query history — stores last 50 queries per connection in SQLite.
 */

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

const MAX_PER_CONNECTION = 50;

export function registerQueryHistoryIPC(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id TEXT NOT NULL,
    index_name TEXT,
    query TEXT NOT NULL,
    result_count INTEGER,
    duration_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  ipcMain.handle('query-history:add', (_e, entry: { connectionId: string; index: string; query: string; resultCount: number; durationMs: number }) => {
    db.prepare('INSERT INTO query_history (connection_id, index_name, query, result_count, duration_ms) VALUES (?, ?, ?, ?, ?)').run(
      entry.connectionId, entry.index, entry.query, entry.resultCount, entry.durationMs
    );
    // Trim to last 50 per connection
    db.prepare(`DELETE FROM query_history WHERE id NOT IN (SELECT id FROM query_history WHERE connection_id = ? ORDER BY id DESC LIMIT ?) AND connection_id = ?`).run(
      entry.connectionId, MAX_PER_CONNECTION, entry.connectionId
    );
  });

  ipcMain.handle('query-history:list', (_e, connectionId: string, search?: string) => {
    if (search) {
      return db.prepare('SELECT * FROM query_history WHERE connection_id = ? AND query LIKE ? ORDER BY id DESC LIMIT ?').all(connectionId, `%${search}%`, MAX_PER_CONNECTION);
    }
    return db.prepare('SELECT * FROM query_history WHERE connection_id = ? ORDER BY id DESC LIMIT ?').all(connectionId, MAX_PER_CONNECTION);
  });

  ipcMain.handle('query-history:clear', (_e, connectionId: string) => {
    db.prepare('DELETE FROM query_history WHERE connection_id = ?').run(connectionId);
  });
}

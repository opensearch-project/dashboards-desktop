/**
 * Scheduled queries — run queries on a cron schedule, alert on threshold.
 */

import { ipcMain, Notification } from 'electron';
import { Client } from '@opensearch-project/opensearch';
import Database from 'better-sqlite3';

interface ScheduledQuery { id: number; connectionUrl: string; index: string; query: string; cronMs: number; threshold: number; field: string; enabled: number; }

const timers = new Map<number, ReturnType<typeof setInterval>>();

export function registerScheduledQueriesIPC(dbPath: string): void {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS scheduled_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_url TEXT NOT NULL,
    index_name TEXT NOT NULL,
    query TEXT NOT NULL,
    cron_ms INTEGER NOT NULL DEFAULT 60000,
    threshold REAL NOT NULL DEFAULT 0,
    field TEXT NOT NULL DEFAULT 'hits.total.value',
    enabled INTEGER DEFAULT 1
  )`);

  function startQuery(sq: ScheduledQuery) {
    if (timers.has(sq.id)) return;
    const timer = setInterval(async () => {
      try {
        const client = new Client({ node: sq.connectionUrl });
        const res = await client.search({ index: sq.index, body: JSON.parse(sq.query) });
        const value = sq.field.split('.').reduce((o: Record<string, unknown>, k) => (o?.[k] as Record<string, unknown>) ?? {}, res.body as Record<string, unknown>);
        if (typeof value === 'number' && value >= sq.threshold) {
          new Notification({ title: 'Query Alert', body: `${sq.index}: ${sq.field} = ${value} (threshold: ${sq.threshold})` }).show();
        }
      } catch { /* silent */ }
    }, sq.cron_ms);
    timers.set(sq.id, timer);
  }

  // Start all enabled on launch
  const enabled = db.prepare('SELECT * FROM scheduled_queries WHERE enabled = 1').all() as ScheduledQuery[];
  for (const sq of enabled) startQuery(sq);

  ipcMain.handle('scheduled-query:add', (_e, sq: { connectionUrl: string; index: string; query: string; cronMs: number; threshold: number; field: string }) => {
    const info = db.prepare('INSERT INTO scheduled_queries (connection_url, index_name, query, cron_ms, threshold, field) VALUES (?, ?, ?, ?, ?, ?)').run(
      sq.connectionUrl, sq.index, sq.query, sq.cronMs, sq.threshold, sq.field
    );
    const row = db.prepare('SELECT * FROM scheduled_queries WHERE id = ?').get(info.lastInsertRowid) as ScheduledQuery;
    startQuery(row);
    return row;
  });

  ipcMain.handle('scheduled-query:list', () => db.prepare('SELECT * FROM scheduled_queries').all());

  ipcMain.handle('scheduled-query:remove', (_e, id: number) => {
    const timer = timers.get(id);
    if (timer) { clearInterval(timer); timers.delete(id); }
    db.prepare('DELETE FROM scheduled_queries WHERE id = ?').run(id);
  });

  ipcMain.handle('scheduled-query:toggle', (_e, id: number, enabled: boolean) => {
    db.prepare('UPDATE scheduled_queries SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    if (!enabled) { const t = timers.get(id); if (t) { clearInterval(t); timers.delete(id); } }
    else { const sq = db.prepare('SELECT * FROM scheduled_queries WHERE id = ?').get(id) as ScheduledQuery; if (sq) startQuery(sq); }
  });
}

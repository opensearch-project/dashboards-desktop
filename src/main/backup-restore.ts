/**
 * Backup/Restore — export/import SQLite data as JSON.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import Database from 'better-sqlite3';

const DB_PATH = join(homedir(), '.osd', 'osd.db');
const TABLES = ['connections', 'settings', 'conversations', 'messages', 'credentials'];

export function registerBackupRestoreIPC(): void {
  ipcMain.handle('osd:backup', async () => {
    const win = BrowserWindow.getAllWindows()[0];
    const { filePath } = await dialog.showSaveDialog(win!, {
      title: 'Export Backup',
      defaultPath: `osd-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return null;

    const db = new Database(DB_PATH, { readonly: true });
    const data: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      try { data[table] = db.prepare(`SELECT * FROM ${table}`).all(); } catch { /* table may not exist */ }
    }
    db.close();

    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  });

  ipcMain.handle('osd:restore', async () => {
    const win = BrowserWindow.getAllWindows()[0];
    const { filePaths } = await dialog.showOpenDialog(win!, {
      title: 'Import Backup',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!filePaths[0]) return null;

    const raw = readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw) as Record<string, Record<string, unknown>[]>;

    // Validate
    if (typeof data !== 'object' || !Object.keys(data).some(k => TABLES.includes(k))) {
      throw new Error('Invalid backup file — no recognized tables found');
    }

    const { response } = await dialog.showMessageBox(win!, {
      type: 'warning',
      title: 'Restore Backup',
      message: 'This will replace all current data. Continue?',
      buttons: ['Restore', 'Cancel'],
      defaultId: 1,
    });
    if (response !== 0) return null;

    const db = new Database(DB_PATH);
    for (const table of TABLES) {
      if (!data[table]?.length) continue;
      const rows = data[table];
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(',');
      db.exec(`DELETE FROM ${table}`);
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
      const tx = db.transaction(() => { for (const row of rows) stmt.run(...cols.map(c => row[c])); });
      tx();
    }
    db.close();
    return filePaths[0];
  });
}

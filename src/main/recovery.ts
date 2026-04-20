/**
 * Recovery — factory reset (clear DB + optionally remove OSD binary).
 */

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DB_PATH = join(homedir(), '.osd', 'osd.db');
const OSD_DIR = join(homedir(), '.osd-desktop', 'osd');

export function registerRecoveryIPC(): void {
  ipcMain.handle('osd:factory-reset', async () => {
    const win = BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(win!, {
      type: 'warning',
      title: 'Factory Reset',
      message: 'Reset all settings and data?',
      detail: 'This will delete your database (connections, settings, chat history) and optionally remove the downloaded OSD installation.',
      buttons: ['Reset Settings Only', 'Reset Everything (+ remove OSD)', 'Cancel'],
      defaultId: 2,
    });

    if (response === 2) return 'cancelled';

    // Delete SQLite DB
    if (existsSync(DB_PATH)) rmSync(DB_PATH);

    // Optionally remove OSD installation
    if (response === 1 && existsSync(OSD_DIR)) {
      rmSync(OSD_DIR, { recursive: true });
    }

    // Restart app
    app.relaunch();
    app.exit(0);
    return 'ok';
  });
}

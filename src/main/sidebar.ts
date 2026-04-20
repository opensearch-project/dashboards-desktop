/**
 * Shell layout manager — main window hosts sidebar + content,
 * OSD runs in a BrowserView that shows/hides based on active page.
 */

import { BrowserWindow, BrowserView, ipcMain } from 'electron';
import * as path from 'path';
import { execFile } from 'child_process';

const SIDEBAR_WIDTH = 48;
let osdView: BrowserView | null = null;

export function setupShell(mainWindow: BrowserWindow, osdPort: string): void {
  // Main window loads shell.html (sidebar + content area)
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'shell.html'));

  // OSD in a BrowserView, positioned after sidebar
  osdView = new BrowserView({
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.addBrowserView(osdView);
  osdView.webContents.loadURL(`http://localhost:${osdPort}`);
  positionOsd(mainWindow);
  mainWindow.on('resize', () => positionOsd(mainWindow));

  // Show/hide OSD when switching pages
  ipcMain.handle('shell:show-osd', () => {
    if (osdView && mainWindow) {
      mainWindow.addBrowserView(osdView);
      positionOsd(mainWindow);
    }
  });

  ipcMain.handle('shell:hide-osd', () => {
    if (osdView && mainWindow) {
      mainWindow.removeBrowserView(osdView);
    }
  });
}

export function setupShellNoOsd(mainWindow: BrowserWindow): void {
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'shell.html'));
}

function positionOsd(win: BrowserWindow): void {
  if (!osdView) return;
  const [width, height] = win.getContentSize();
  osdView.setBounds({ x: SIDEBAR_WIDTH, y: 0, width: width - SIDEBAR_WIDTH, height });
}

export function getSidebarWidth(): number {
  return SIDEBAR_WIDTH;
}

// --- IPC: Plugin management ---
export function registerSidebarIPC(osdBinPath: string): void {
  const pluginBin = path.join(path.dirname(osdBinPath), 'opensearch-dashboards-plugin');

  ipcMain.handle('sidebar:plugin-install', async (_e, source: string) =>
    new Promise((resolve, reject) => {
      execFile(pluginBin, ['install', source], { timeout: 120_000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    })
  );

  ipcMain.handle('sidebar:plugin-remove', async (_e, name: string) =>
    new Promise((resolve, reject) => {
      execFile(pluginBin, ['remove', name], { timeout: 60_000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    })
  );

  ipcMain.handle('sidebar:plugin-list', async () =>
    new Promise((resolve, reject) => {
      execFile(pluginBin, ['list'], (err, stdout) => {
        if (err) reject(new Error(err.message));
        else resolve(stdout.trim().split('\n').filter(Boolean));
      });
    })
  );
}

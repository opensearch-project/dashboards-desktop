/**
 * Sidebar — loads fee's React sidebar (collapsible 240px / 48px).
 */

import { BrowserWindow, BrowserView, ipcMain } from 'electron';
import * as path from 'path';
import { execFile } from 'child_process';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 48;
let sidebarView: BrowserView | null = null;
let expanded = true;

export function setupSidebar(mainWindow: BrowserWindow): void {
  sidebarView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  sidebarView.webContents.loadFile(
    path.join(__dirname, '..', 'renderer', 'sidebar', 'sidebar.html')
  ).catch((err: Error) => console.error('[Sidebar] Failed to load:', err.message));

  mainWindow.addBrowserView(sidebarView);
  positionSidebar(mainWindow);
  mainWindow.on('resize', () => positionSidebar(mainWindow));

  ipcMain.handle('sidebar:toggle', () => {
    expanded = !expanded;
    positionSidebar(mainWindow);
    // Notify OSD view to resize
    mainWindow.emit('sidebar-resized');
    return expanded;
  });

  ipcMain.handle('sidebar:is-expanded', () => expanded);
}

function positionSidebar(win: BrowserWindow): void {
  if (!sidebarView) return;
  const [, height] = win.getContentSize();
  sidebarView.setBounds({ x: 0, y: 0, width: getSidebarWidth(), height });
}

export function getSidebarWidth(): number {
  return expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;
}

export function destroySidebar(): void {
  if (sidebarView) {
    sidebarView.webContents.close();
    sidebarView = null;
  }
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

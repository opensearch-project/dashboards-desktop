/**
 * Sidebar Manager — left-side BrowserView for desktop management.
 * Collapsible: 240px expanded, 48px collapsed (icon-only).
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
      sandbox: true,
    },
  });

  sidebarView.webContents.loadFile(
    path.join(__dirname, '..', 'renderer', 'sidebar', 'sidebar.html')
  ).catch((err: Error) => console.error('[Sidebar] Failed to load:', err.message));

  mainWindow.addBrowserView(sidebarView);
  positionSidebar(mainWindow);

  mainWindow.on('resize', () => positionSidebar(mainWindow));

  // Toggle collapse
  ipcMain.handle('sidebar:toggle', () => {
    expanded = !expanded;
    positionSidebar(mainWindow);
    return expanded;
  });

  ipcMain.handle('sidebar:is-expanded', () => expanded);
}

function positionSidebar(win: BrowserWindow): void {
  if (!sidebarView) return;
  const [, height] = win.getContentSize();
  const width = expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;
  sidebarView.setBounds({ x: 0, y: 0, width, height });
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
  ipcMain.handle('sidebar:plugin-install', async (_e, source: string) => {
    const pluginBin = path.join(path.dirname(osdBinPath), 'opensearch-dashboards-plugin');
    return new Promise((resolve, reject) => {
      execFile(pluginBin, ['install', source], { timeout: 120_000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
  });

  ipcMain.handle('sidebar:plugin-remove', async (_e, name: string) => {
    const pluginBin = path.join(path.dirname(osdBinPath), 'opensearch-dashboards-plugin');
    return new Promise((resolve, reject) => {
      execFile(pluginBin, ['remove', name], { timeout: 60_000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
  });

  ipcMain.handle('sidebar:plugin-list', async () => {
    const pluginBin = path.join(path.dirname(osdBinPath), 'opensearch-dashboards-plugin');
    return new Promise((resolve, reject) => {
      execFile(pluginBin, ['list'], (err, stdout) => {
        if (err) reject(new Error(err.message));
        else resolve(stdout.trim().split('\n').filter(Boolean));
      });
    });
  });
}

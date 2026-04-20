/**
 * Sidebar — Slack-style icon strip on the left edge of the window.
 * 48px wide, dark background, icon buttons for navigation.
 * No separate BrowserView — rendered as a CSS column in the main window frame.
 * Controls OSD via IPC without modifying OSD source.
 */

import { BrowserWindow, BrowserView, ipcMain } from 'electron';
import * as path from 'path';
import { execFile } from 'child_process';

const SIDEBAR_WIDTH = 48;
let sidebarView: BrowserView | null = null;

export function setupSidebar(mainWindow: BrowserWindow): void {
  sidebarView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const html = `data:text/html;charset=utf-8,${encodeURIComponent(SIDEBAR_HTML)}`;
  sidebarView.webContents.loadURL(html);

  mainWindow.addBrowserView(sidebarView);
  positionSidebar(mainWindow);
  mainWindow.on('resize', () => positionSidebar(mainWindow));
}

function positionSidebar(win: BrowserWindow): void {
  if (!sidebarView) return;
  const [, height] = win.getContentSize();
  sidebarView.setBounds({ x: 0, y: 0, width: SIDEBAR_WIDTH, height });
}

export function getSidebarWidth(): number {
  return SIDEBAR_WIDTH;
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

const SIDEBAR_HTML = `<!DOCTYPE html>
<html><head><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 48px; height: 100vh; overflow: hidden;
  background: #1b1b2f; display: flex; flex-direction: column;
  align-items: center; padding: 12px 0; gap: 8px;
  font-family: -apple-system, system-ui, sans-serif;
  -webkit-app-region: drag;
}
.btn {
  width: 36px; height: 36px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: background 0.15s;
  -webkit-app-region: no-drag;
}
.btn:hover { background: #2d2d4a; }
.btn.active { background: #3a3a5c; }
.btn svg { width: 20px; height: 20px; fill: #a0a0c0; }
.btn:hover svg, .btn.active svg { fill: #e8e8f0; }
.spacer { flex: 1; }
.divider { width: 24px; height: 1px; background: #2d2d4a; margin: 4px 0; }
</style></head><body>
  <button class="btn active" title="Home" onclick="nav('home')">
    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  </button>
  <button class="btn" title="Connections" onclick="nav('connections')">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
  </button>
  <div class="divider"></div>
  <button class="btn" title="Chat (⌘K)" onclick="nav('chat')">
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
  </button>
  <div class="spacer"></div>
  <button class="btn" title="Bounce OSD" onclick="nav('bounce')">
    <svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
  </button>
  <button class="btn" title="Feedback" onclick="nav('feedback')">
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg>
  </button>
  <button class="btn" title="Settings" onclick="nav('settings')">
    <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
  </button>
<script>
  const { ipcRenderer } = require('electron');
  function nav(target) {
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    if (target !== 'bounce') event.currentTarget.classList.add('active');
    if (target === 'home') ipcRenderer.invoke('osd:navigate', '/app/home');
    else if (target === 'chat') ipcRenderer.invoke('chat-overlay:toggle');
    else if (target === 'bounce') {
      event.currentTarget.classList.add('active');
      ipcRenderer.invoke('osd:bounce').then(() => {
        event.currentTarget.classList.remove('active');
      });
    }
    else if (target === 'settings') ipcRenderer.invoke('sidebar:open-settings');
    else if (target === 'connections') ipcRenderer.invoke('sidebar:open-connections');
    else if (target === 'feedback') ipcRenderer.invoke('sidebar:feedback');
  }
</script>
</body></html>`;

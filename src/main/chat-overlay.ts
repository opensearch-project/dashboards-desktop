/**
 * Chat manager — BrowserView that fills the content area when active.
 * Toggle: Cmd+K or sidebar chat button.
 */

import { BrowserWindow, BrowserView, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';

let chatView: BrowserView | null = null;
let mainWin: BrowserWindow | null = null;
let visible = false;

const SIDEBAR_WIDTH = 48;

export function setupChatOverlay(mainWindow: BrowserWindow): void {
  mainWin = mainWindow;
  chatView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  chatView.webContents.loadFile(
    path.join(__dirname, '..', 'renderer', 'chat-overlay.html')
  );

  globalShortcut.register('CommandOrControl+K', () => {
    toggleChat();
  });

  ipcMain.removeHandler('chat-overlay:close');
  ipcMain.handle('chat-overlay:close', () => hideChat());

  ipcMain.removeHandler('chat-overlay:toggle');
  ipcMain.handle('chat-overlay:toggle', () => toggleChat());
}

function toggleChat(): void {
  if (visible) hideChat();
  else showChat();
}

export function showChat(): void {
  if (!chatView || !mainWin) return;
  // Hide OSD
  ipcMain.emit('shell:hide-osd-internal');
  // Show chat BrowserView
  mainWin.addBrowserView(chatView);
  const [width, height] = mainWin.getContentSize();
  chatView.setBounds({ x: SIDEBAR_WIDTH, y: 0, width: width - SIDEBAR_WIDTH, height });
  visible = true;
  chatView.webContents.focus();

  mainWin.removeAllListeners('resize');
  mainWin.on('resize', () => {
    if (visible && chatView && mainWin) {
      const [w, h] = mainWin.getContentSize();
      chatView.setBounds({ x: SIDEBAR_WIDTH, y: 0, width: w - SIDEBAR_WIDTH, height: h });
    }
  });
}

export function hideChat(): void {
  if (!chatView || !mainWin) return;
  mainWin.removeBrowserView(chatView);
  visible = false;
}

export function destroyChatOverlay(): void {
  if (chatView) {
    chatView.webContents.close();
    chatView = null;
  }
  globalShortcut.unregister('CommandOrControl+K');
}

export function isChatVisible(): boolean {
  return visible;
}

/**
 * Chat overlay manager — creates and manages a BrowserView sidebar
 * that renders the agent chat panel alongside the OSD web UI.
 *
 * Toggle: Cmd+K (macOS) / Ctrl+K (Linux/Windows)
 */

import { BrowserWindow, BrowserView, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';

let chatView: BrowserView | null = null;
let visible = false;
const CHAT_WIDTH = 420;

export function setupChatOverlay(mainWindow: BrowserWindow): void {
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

  // Initially hidden
  chatView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  mainWindow.addBrowserView(chatView);

  // Resize chat when window resizes
  mainWindow.on('resize', () => {
    if (visible) positionChat(mainWindow);
  });

  // Register toggle shortcut
  globalShortcut.register('CommandOrControl+K', () => {
    toggleChat(mainWindow);
  });

  // Handle close from chat panel (remove first to avoid double-register on macOS reactivate)
  ipcMain.removeHandler('chat-overlay:close');
  ipcMain.handle('chat-overlay:close', () => {
    hideChat(mainWindow);
  });
}

function positionChat(win: BrowserWindow): void {
  if (!chatView) return;
  const [width, height] = win.getContentSize();
  chatView.setBounds({
    x: width - CHAT_WIDTH,
    y: 0,
    width: CHAT_WIDTH,
    height,
  });
}

function toggleChat(win: BrowserWindow): void {
  if (visible) hideChat(win);
  else showChat(win);
}

function showChat(win: BrowserWindow): void {
  if (!chatView) return;
  visible = true;
  positionChat(win);
  chatView.webContents.focus();
}

function hideChat(win: BrowserWindow): void {
  if (!chatView) return;
  visible = false;
  chatView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  win.webContents.focus();
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

/**
 * Chat — registers Cmd+K shortcut to switch to chat page.
 * Chat UI renders as an iframe in shell.html, not a BrowserView.
 */

import { BrowserWindow, ipcMain, globalShortcut } from 'electron';

export function setupChatOverlay(mainWindow: BrowserWindow): void {
  // Cmd+K toggles chat page via shell
  globalShortcut.register('CommandOrControl+K', () => {
    mainWindow.webContents.executeJavaScript(`
      document.querySelector('[data-page="chat"]').click();
    `).catch(() => {});
  });

  // IPC for sidebar button
  ipcMain.removeHandler('chat-overlay:toggle');
  ipcMain.handle('chat-overlay:toggle', () => {
    mainWindow.webContents.executeJavaScript(`
      document.querySelector('[data-page="chat"]').click();
    `).catch(() => {});
  });

  ipcMain.removeHandler('chat-overlay:close');
  ipcMain.handle('chat-overlay:close', () => {});
}

export function destroyChatOverlay(): void {
  globalShortcut.unregister('CommandOrControl+K');
}

export function isChatVisible(): boolean {
  return false;
}

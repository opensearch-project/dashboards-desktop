'use strict';

const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'OpenSearch Dashboards Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

// --- IPC: credential storage via safeStorage ---
ipcMain.handle('credentials:save', (_e, key, value) => {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const buf = safeStorage.encryptString(value);
  // store in memory for now; Phase 2 will persist to SQLite
  global.__creds = global.__creds || {};
  global.__creds[key] = buf;
  return true;
});

ipcMain.handle('credentials:load', (_e, key) => {
  if (!global.__creds?.[key]) return null;
  return safeStorage.decryptString(global.__creds[key]);
});

// --- IPC: connection test ---
ipcMain.handle('connection:test', async (_e, opts) => {
  const { testConnection } = require('../core/connection');
  return testConnection(opts);
});

// --- IPC: agent chat ---
ipcMain.handle('agent:chat', async (_e, { message, model }) => {
  const { chat } = require('../core/agent');
  return chat(message, model);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

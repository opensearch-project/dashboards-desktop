import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import { IPC } from '../core/types';
import type { ConnectionInput } from '../core/types';
import { initStorage, getStorage } from '../core/storage';
import {
  addConnection,
  updateConnection,
  deleteConnection,
  listConnections,
  testConnection,
} from '../core/connections';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'OpenSearch Dashboards Desktop',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

// --- IPC: Storage ---
ipcMain.handle(IPC.STORAGE_INIT, async () => {
  await initStorage();
  return true;
});

// --- IPC: Credentials via safeStorage ---
ipcMain.handle(IPC.CREDENTIALS_SAVE, (_e, key: string, value: string) => {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const buf = safeStorage.encryptString(value);
  credentialStore.set(key, buf);
  return true;
});

ipcMain.handle(IPC.CREDENTIALS_LOAD, (_e, key: string) => {
  const buf = credentialStore.get(key);
  if (!buf) return null;
  return safeStorage.decryptString(buf);
});

// --- IPC: Connections ---
ipcMain.handle(IPC.CONNECTION_ADD, async (_e, input: ConnectionInput) => {
  return addConnection(input);
});

ipcMain.handle(IPC.CONNECTION_UPDATE, async (_e, id: string, input: Partial<ConnectionInput>) => {
  return updateConnection(id, input);
});

ipcMain.handle(IPC.CONNECTION_DELETE, async (_e, id: string) => {
  return deleteConnection(id);
});

ipcMain.handle(IPC.CONNECTION_LIST, async (_e, workspaceId?: string) => {
  return listConnections(workspaceId);
});

ipcMain.handle(IPC.CONNECTION_TEST, async (_e, input: ConnectionInput) => {
  return testConnection(input);
});

// --- IPC: Workspaces ---
ipcMain.handle(IPC.WORKSPACE_LIST, async () => {
  const db = getStorage();
  return db.listWorkspaces();
});

ipcMain.handle(IPC.WORKSPACE_CREATE, async (_e, name: string) => {
  const db = getStorage();
  return db.createWorkspace(name);
});

// --- IPC: Settings ---
ipcMain.handle(IPC.SETTINGS_GET, async (_e, key: string) => {
  const db = getStorage();
  return db.getSetting(key);
});

ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: string) => {
  const db = getStorage();
  db.setSetting(key, value);
  return true;
});

// In-memory credential store (encrypted buffers)
const credentialStore = new Map<string, Buffer>();

// --- App lifecycle ---
app.whenReady().then(async () => {
  await initStorage();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import { IPC } from '../core/types';
import type { ConnectionInput } from '../core/types';
import { initStorage, getStorageProxy } from '../core/storage';
import { testConnection } from '../core/connections';

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
  const db = getStorageProxy();
  return db.addConnectionAsync(input);
});

ipcMain.handle(IPC.CONNECTION_UPDATE, async (_e, id: string, input: Partial<ConnectionInput>) => {
  const db = getStorageProxy();
  return db.updateConnectionAsync(id, input as Record<string, unknown>);
});

ipcMain.handle(IPC.CONNECTION_DELETE, async (_e, id: string) => {
  const db = getStorageProxy();
  return db.deleteConnectionAsync(id);
});

ipcMain.handle(IPC.CONNECTION_LIST, async (_e, workspaceId?: string) => {
  const db = getStorageProxy();
  return db.listConnectionsAsync(workspaceId);
});

ipcMain.handle(IPC.CONNECTION_TEST, async (_e, input: ConnectionInput) => {
  return testConnection(input);
});

// --- IPC: Workspaces ---
ipcMain.handle(IPC.WORKSPACE_LIST, async () => {
  const db = getStorageProxy();
  return db.listWorkspacesAsync();
});

ipcMain.handle(IPC.WORKSPACE_CREATE, async (_e, name: string) => {
  const db = getStorageProxy();
  return db.createWorkspaceAsync(name);
});

// --- IPC: Settings ---
ipcMain.handle(IPC.SETTINGS_GET, async (_e, key: string) => {
  const db = getStorageProxy();
  return db.getSettingAsync(key);
});

ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: string) => {
  const db = getStorageProxy();
  await db.setSettingAsync(key, value);
  return true;
});

// In-memory credential store (encrypted buffers)
const credentialStore = new Map<string, Buffer>();

// --- Agent Runtime ---
import { ModelRouter } from '../core/agent/model-router';
import { ToolRegistry } from '../core/agent/tool-registry';
import { ConversationManager } from '../core/agent/conversation';
import { AgentRuntime } from '../core/agent/runtime';
import { OllamaProvider } from '../core/agent/providers/ollama';
import { opensearchQueryTool } from '../core/agent/tools/opensearch-query';
import { elasticsearchQueryTool } from '../core/agent/tools/elasticsearch-query';
import { clusterHealthTool } from '../core/agent/tools/cluster-health';
import { indexManageTool } from '../core/agent/tools/index-manage';
import type { StreamEvent } from '../core/agent/types';
import { initDatabase } from '../core/storage';

let agentRuntime: AgentRuntime | null = null;

function getOrCreateRuntime(): AgentRuntime {
  if (agentRuntime) return agentRuntime;

  const router = new ModelRouter();
  router.register(new OllamaProvider());

  const tools = new ToolRegistry();
  tools.register(opensearchQueryTool);
  tools.register(elasticsearchQueryTool);
  tools.register(clusterHealthTool);
  tools.register(indexManageTool);

  const dbPath = path.join(require('os').homedir(), '.osd', 'osd.db');
  const db = initDatabase(dbPath);
  const conversations = new ConversationManager(db);

  agentRuntime = new AgentRuntime(
    router, tools, conversations,
    'ollama:llama3', 'default',
    () => null // TODO: wire to active connection from UI state
  );
  return agentRuntime;
}

ipcMain.handle('agent:send', async (_e, conversationId: string, message: string) => {
  const runtime = getOrCreateRuntime();
  const emit = (event: StreamEvent) => {
    mainWindow?.webContents.send('agent:stream', event);
  };
  await runtime.chat(conversationId, message, emit);
});

ipcMain.handle('agent:cancel', () => {
  agentRuntime?.cancel();
});

ipcMain.handle('agent:switchModel', (_e, specifier: string) => {
  const runtime = getOrCreateRuntime();
  runtime.setModel(specifier);
  return true;
});

ipcMain.handle('agent:listModels', async () => {
  const runtime = getOrCreateRuntime();
  const router = (runtime as unknown as { router: ModelRouter }).router;
  return router.listAllModels();
});

ipcMain.handle('agent:getModel', () => {
  return agentRuntime?.getModel() ?? 'ollama:llama3';
});

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

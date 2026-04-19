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
  return db.addConnectionAsync(input as Record<string, unknown>);
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
import { McpSupervisor } from '../core/mcp/supervisor';
import { McpDiscovery } from '../core/mcp/discovery';
import { McpToolBridge } from '../core/mcp/tool-bridge';
import { loadConfig } from '../core/mcp/config';

let agentRuntime: AgentRuntime | null = null;
let mcpBridge: McpToolBridge | null = null;

function getOrCreateRuntime(): AgentRuntime {
  if (agentRuntime) return agentRuntime;

  const router = new ModelRouter();
  router.register(new OllamaProvider());

  const tools = new ToolRegistry();
  tools.register(opensearchQueryTool);
  tools.register(elasticsearchQueryTool);
  tools.register(clusterHealthTool);
  tools.register(indexManageTool);

  // Wire MCP discovery into tool registry
  const supervisor = new McpSupervisor();
  const discovery = new McpDiscovery(supervisor);
  mcpBridge = new McpToolBridge(tools, discovery, supervisor);
  mcpBridge.listen();

  // Start configured MCP servers and sync their tools (async, non-blocking)
  void initMcpServers(supervisor).then(() => mcpBridge!.sync());

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

/** Load MCP config and start all enabled servers */
async function initMcpServers(supervisor: McpSupervisor): Promise<void> {
  const config = loadConfig();
  const starts = Object.entries(config.mcpServers)
    .filter(([_, cfg]) => cfg.enabled !== false)
    .map(([name, cfg]) => supervisor.start(name, cfg).catch(() => { /* log and continue */ }));
  await Promise.allSettled(starts);
  supervisor.startHealthChecks();
}

ipcMain.handle(IPC.AGENT_SEND, async (_e, message: string, conversationId?: string) => {
  const runtime = getOrCreateRuntime();
  // Create conversation if not provided
  const convId = conversationId ?? 'default';
  const emit = (event: StreamEvent) => {
    mainWindow?.webContents.send(IPC.AGENT_STREAM, event);
  };
  await runtime.chat(convId, message, emit);
});

ipcMain.handle(IPC.AGENT_CANCEL, () => {
  agentRuntime?.cancel();
});

ipcMain.handle(IPC.MODEL_SWITCH, (_e, specifier: string) => {
  const runtime = getOrCreateRuntime();
  runtime.setModel(specifier);
  return true;
});

ipcMain.handle(IPC.MODEL_LIST, async () => {
  const runtime = getOrCreateRuntime();
  const router = (runtime as unknown as { router: ModelRouter }).router;
  return router.listAllModels();
});

ipcMain.handle(IPC.MODEL_CURRENT, () => {
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

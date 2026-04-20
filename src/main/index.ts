import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import { IPC } from '../core/types';
import type { ConnectionInput } from '../core/types';
import { initStorage, getStorageProxy } from '../core/storage';
import { testConnection } from '../core/connections';

let mainWindow: BrowserWindow | null = null;
let destroyChatOverlay: () => void = () => {};

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'OpenSearch Dashboards Desktop',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load OSD if running, otherwise show local fallback
  const osdPort = process.env.OSD_PORT ?? '5601';
  const osdUrl = `http://localhost:${osdPort}`;
  mainWindow.loadURL(osdUrl).catch(() => {
    // OSD not ready yet — show loading page
    mainWindow!.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  });
}

// --- IPC error serialization (MUST be before all handlers) ---
const originalHandle = ipcMain.handle.bind(ipcMain);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ipcMain.handle = ((channel: string, listener: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>) => {
  return originalHandle(channel, async (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await listener(event, ...args);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      throw { message, stack, __ipcError: true };
    }
  });
}) as typeof ipcMain.handle;

// --- IPC: Storage ---
ipcMain.handle(IPC.STORAGE_INIT, async () => {
  await initStorage();
  return true;
});

// --- IPC: Credentials via safeStorage + SQLite persistence ---
ipcMain.handle(IPC.CREDENTIALS_SAVE, async (_e, key: string, value: string) => {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const buf = safeStorage.encryptString(value);
  const db = getStorageProxy();
  await db.saveCredentialAsync(key, buf);
  return true;
});

ipcMain.handle(IPC.CREDENTIALS_LOAD, async (_e, key: string) => {
  const db = getStorageProxy();
  const buf = await db.loadCredentialAsync(key);
  if (!buf) return null;
  return safeStorage.decryptString(buf);
});

// --- IPC: Connections ---
ipcMain.handle(IPC.CONNECTION_ADD, async (_e, input: ConnectionInput) => {
  const db = getStorageProxy();
  return db.addConnectionAsync(input as unknown as Record<string, unknown>);
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

// --- IPC: Settings moved to main/ipc/settings.ts ---

// --- IPC: Admin — Cluster, Indices, Security ---
import { Client as OSClient } from '@opensearch-project/opensearch';
import { Client as ESClient } from '@elastic/elasticsearch';
import * as osSecurity from '../core/admin/opensearch/security';

// Helper: get active connection URL and type (placeholder — will be wired to UI state)
let activeConnectionUrl = '';
let activeConnectionType: 'opensearch' | 'elasticsearch' = 'opensearch';

ipcMain.handle(
  'admin:setActiveConnection',
  (_e, url: string, type: 'opensearch' | 'elasticsearch') => {
    activeConnectionUrl = url;
    activeConnectionType = type;
  },
);

function requireActiveConnection(): void {
  if (!activeConnectionUrl)
    throw new Error('No active connection. Add a connection in Settings first.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function osClient(): any {
  requireActiveConnection();
  return new OSClient({ node: activeConnectionUrl });
}
function esClient(): ESClient {
  requireActiveConnection();
  return new ESClient({ node: activeConnectionUrl });
}

// Cluster
ipcMain.handle(IPC.CLUSTER_HEALTH, async () => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().cluster.health();
    return res.body;
  }
  return esClient().cluster.health();
});

ipcMain.handle(IPC.CLUSTER_NODES, async () => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().nodes.stats();
    return res.body;
  }
  return esClient().nodes.stats();
});

ipcMain.handle(IPC.CLUSTER_SHARDS, async () => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().cat.shards({ format: 'json' });
    return res.body;
  }
  return esClient().cat.shards({ format: 'json' });
});

// Indices
ipcMain.handle(IPC.INDICES_LIST, async () => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().cat.indices({ format: 'json' });
    return res.body;
  }
  return esClient().cat.indices({ format: 'json' });
});

ipcMain.handle(IPC.INDICES_CREATE, async (_e, index: string, body?: Record<string, unknown>) => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().indices.create({ index, body });
    return res.body;
  }
  return esClient().indices.create({ index, ...body });
});

ipcMain.handle(IPC.INDICES_DELETE, async (_e, index: string) => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().indices.delete({ index });
    return res.body;
  }
  return esClient().indices.delete({ index });
});

ipcMain.handle(IPC.INDICES_REINDEX, async (_e, source: string, dest: string) => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().reindex({
      body: { source: { index: source }, dest: { index: dest } },
    });
    return res.body;
  }
  return esClient().reindex({ source: { index: source }, dest: { index: dest } });
});

ipcMain.handle(IPC.INDICES_ALIASES, async () => {
  if (activeConnectionType === 'opensearch') {
    const res = await osClient().cat.aliases({ format: 'json' });
    return res.body;
  }
  return esClient().cat.aliases({ format: 'json' });
});

// Security (OpenSearch only — Elasticsearch uses different API)
ipcMain.handle(IPC.SECURITY_ROLES_LIST, async () => osSecurity.listRoles(activeConnectionUrl));
ipcMain.handle(IPC.SECURITY_ROLES_SAVE, async (_e, name: string, body: Record<string, unknown>) =>
  osSecurity.createRole(activeConnectionUrl, name, body),
);
ipcMain.handle(IPC.SECURITY_ROLES_DELETE, async (_e, name: string) =>
  osSecurity.deleteRole(activeConnectionUrl, name),
);
ipcMain.handle(IPC.SECURITY_USERS_LIST, async () => osSecurity.listUsers(activeConnectionUrl));
ipcMain.handle(IPC.SECURITY_USERS_SAVE, async (_e, name: string, body: Record<string, unknown>) =>
  osSecurity.createUser(activeConnectionUrl, name, body),
);
ipcMain.handle(IPC.SECURITY_USERS_DELETE, async (_e, name: string) =>
  osSecurity.deleteUser(activeConnectionUrl, name),
);
ipcMain.handle(IPC.SECURITY_TENANTS_LIST, async () => osSecurity.listTenants(activeConnectionUrl));
ipcMain.handle(IPC.SECURITY_TENANTS_SAVE, async (_e, name: string, body: Record<string, unknown>) =>
  osSecurity.createTenant(activeConnectionUrl, name, body),
);
ipcMain.handle(IPC.SECURITY_TENANTS_DELETE, async (_e, name: string) =>
  osSecurity.deleteTenant(activeConnectionUrl, name),
);

// --- IPC: Missing index ops ---
ipcMain.handle(IPC.INDICES_CLOSE, async (_e, index: string) => {
  if (activeConnectionType === 'opensearch')
    return (await osClient().indices.close({ index })).body;
  return esClient().indices.close({ index });
});
ipcMain.handle(IPC.INDICES_OPEN, async (_e, index: string) => {
  if (activeConnectionType === 'opensearch') return (await osClient().indices.open({ index })).body;
  return esClient().indices.open({ index });
});
ipcMain.handle(IPC.INDICES_UPDATE_ALIAS, async (_e, actions: unknown) => {
  if (activeConnectionType === 'opensearch')
    return (await osClient().indices.updateAliases({ body: { actions } })).body;
  return esClient().indices.updateAliases({ actions } as Record<string, unknown>);
});

// --- IPC: Conversations ---
ipcMain.handle(IPC.CONVERSATION_LIST, async (_e, workspaceId: string) => {
  return getStorageProxy().listConversationsAsync(workspaceId);
});
ipcMain.handle(IPC.CONVERSATION_CREATE, async (_e, workspaceId: string, title?: string) => {
  const model = agentRuntime?.getModel() ?? 'ollama:llama3';
  return getStorageProxy().createConversationAsync(workspaceId, model, title);
});
ipcMain.handle(IPC.CONVERSATION_DELETE, async (_e, id: string) => {
  return getStorageProxy().deleteConversationAsync(id);
});
ipcMain.handle(IPC.CONVERSATION_MESSAGES, async (_e, conversationId: string) => {
  return getStorageProxy().getMessagesAsync(conversationId);
});
ipcMain.handle(IPC.CONVERSATION_RENAME, async (_e, id: string, title: string) => {
  return getStorageProxy().renameConversationAsync(id, title);
});

// --- IPC: Connection Switching (re-registers signing proxy) ---
ipcMain.handle(IPC.CONNECTION_SWITCH, async (_e, connectionId: string) => {
  const db = getStorageProxy();
  const conns = await db.listConnectionsAsync() as Array<{ id: string; url: string; auth_type: string; username?: string; region?: string }>;
  const conn = conns.find(c => c.id === connectionId);
  if (!conn) throw new Error(`Connection ${connectionId} not found`);

  const { clearSigningProxy, registerSigningProxy } = await import('../core/osd/signing-proxy.js');
  clearSigningProxy();

  const auth: { type: string; username?: string; password?: string; apiKey?: string; region?: string; accessKeyId?: string; secretAccessKey?: string } = { type: conn.auth_type };
  if (conn.auth_type === 'basic') {
    auth.username = conn.username;
    const cred = await db.loadCredentialAsync(`conn:${conn.id}:password`);
    auth.password = cred ? Buffer.from(cred).toString() : '';
  } else if (conn.auth_type === 'apikey') {
    const cred = await db.loadCredentialAsync(`conn:${conn.id}:apikey`);
    auth.apiKey = cred ? Buffer.from(cred).toString() : '';
  } else if (conn.auth_type === 'sigv4') {
    auth.region = conn.region;
    const ak = await db.loadCredentialAsync(`conn:${conn.id}:accessKeyId`);
    const sk = await db.loadCredentialAsync(`conn:${conn.id}:secretAccessKey`);
    auth.accessKeyId = ak ? Buffer.from(ak).toString() : '';
    auth.secretAccessKey = sk ? Buffer.from(sk).toString() : '';
  }

  registerSigningProxy(conn.url, auth as Parameters<typeof registerSigningProxy>[1]);
  return { id: conn.id, url: conn.url };
});

// --- IPC: OAuth (implemented below with real PKCE flows) ---
ipcMain.handle(IPC.AUTH_LOGOUT, () => {
  return true;
});
ipcMain.handle(IPC.AUTH_CURRENT_USER, () => {
  return null;
});

// --- IPC: Agent Personas ---
import { listPersonas, switchPersona, getActivePersona } from '../core/skills/personas';
ipcMain.handle(IPC.AGENT_LIST_PERSONAS, () => listPersonas());
ipcMain.handle(IPC.AGENT_SWITCH_PERSONA, (_e, name: string) => {
  switchPersona(name);
  return true;
});
ipcMain.handle(IPC.AGENT_ACTIVE_PERSONA, () => getActivePersona());

// --- IPC: Message Pinning ---
ipcMain.handle(IPC.MESSAGE_PIN, async (_e, messageId: string) => {
  return getStorageProxy().pinMessageAsync(messageId);
});
ipcMain.handle(IPC.MESSAGE_UNPIN, async (_e, messageId: string) => {
  return getStorageProxy().unpinMessageAsync(messageId);
});
ipcMain.handle(IPC.MESSAGE_LIST_PINNED, async (_e, conversationId: string) => {
  return getStorageProxy().listPinnedMessagesAsync(conversationId);
});

// --- Agent Runtime ---
import { ModelRouter } from '../core/agent/model-router';
import { ToolRegistry } from '../core/agent/tool-registry';
import { ConversationManager } from '../core/agent/conversation';
import { AgentRuntime } from '../core/agent/runtime';
import { OllamaProvider } from '../core/agent/providers/ollama';
import { OpenAIProvider } from '../core/agent/providers/openai';
import { AnthropicProvider } from '../core/agent/providers/anthropic';
import { BedrockProvider } from '../core/agent/providers/bedrock';
import { OpenAICompatibleProvider } from '../core/agent/providers/openai-compatible';
import { opensearchQueryTool } from '../core/agent/tools/opensearch-query';
import { elasticsearchQueryTool } from '../core/agent/tools/elasticsearch-query';
import { clusterHealthTool } from '../core/agent/tools/cluster-health';
import { indexManageTool } from '../core/agent/tools/index-manage';
import { adminOpenSearchTool } from '../core/agent/tools/admin-opensearch';
import { adminElasticsearchTool } from '../core/agent/tools/admin-elasticsearch';
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
  router.register(new BedrockProvider());

  // Register cloud providers if API keys are configured (async, non-blocking)
  void (async () => {
    try {
      const db = getStorageProxy();
      const openaiKey = await db.getSettingAsync('openai_api_key');
      if (openaiKey) router.register(new OpenAIProvider({ apiKey: openaiKey }));
      const anthropicKey = await db.getSettingAsync('anthropic_api_key');
      if (anthropicKey) router.register(new AnthropicProvider({ apiKey: anthropicKey }));
      const compatUrl = await db.getSettingAsync('openai_compatible_url');
      if (compatUrl)
        router.register(
          new OpenAICompatibleProvider({
            baseUrl: compatUrl,
            apiKey: (await db.getSettingAsync('openai_compatible_key')) ?? '',
          }),
        );
    } catch (err: unknown) {
      console.error(
        '[agent] Failed to register cloud providers:',
        err instanceof Error ? err.message : err,
      );
    }
  })();

  const tools = new ToolRegistry();
  tools.register(opensearchQueryTool);
  tools.register(elasticsearchQueryTool);
  tools.register(clusterHealthTool);
  tools.register(indexManageTool);
  tools.register(adminOpenSearchTool);
  tools.register(adminElasticsearchTool);

  // Trust levels: admin tools require approval for all actions
  tools.setTrust('admin-opensearch', 'ask');
  tools.setTrust('admin-elasticsearch', 'ask');

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
    router,
    tools,
    conversations,
    'ollama:llama3',
    'default',
    () => null, // TODO: wire to active connection from UI state
  );
  return agentRuntime;
}

/** Load MCP config and start all enabled servers */
async function initMcpServers(supervisor: McpSupervisor): Promise<void> {
  const config = loadConfig();
  const starts = Object.entries(config.mcpServers)
    .filter(([_, cfg]) => cfg.enabled !== false)
    .map(([name, cfg]) =>
      supervisor.start(name, cfg).catch(() => {
        /* log and continue */
      }),
    );
  await Promise.allSettled(starts);
  supervisor.startHealthChecks();
}

ipcMain.handle(IPC.AGENT_SEND, async (_e, message: string, conversationId?: string) => {
  const runtime = getOrCreateRuntime();
  const convId = conversationId ?? 'default';

  const broadcast = (channel: string, ...args: unknown[]) => {
    mainWindow?.webContents.send(channel, ...args);
    for (const view of mainWindow?.getBrowserViews() ?? []) {
      view.webContents.send(channel, ...args);
    }
  };

  // Signal stream start to overlay
  broadcast('chat-overlay:stream-start');

  const emit = (event: StreamEvent) => {
    broadcast(IPC.AGENT_STREAM, event);
    // Feed fee's overlay streaming API
    if (event.type === 'token') {
      broadcast('chat-overlay:stream-token', event.content);
    }
  };

  try {
    await runtime.chat(convId, message, emit);
  } finally {
    broadcast('chat-overlay:stream-end');
  }
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
  return runtime.getRouter().listAllModels();
});

ipcMain.handle(IPC.MODEL_CURRENT, () => {
  return agentRuntime?.getModel() ?? 'ollama:llama3';
});

// --- IPC: Conversation branching ---
import { branchConversation } from '../core/agent/branching';

ipcMain.handle(
  IPC.CONVERSATION_BRANCH,
  (_e, conversationId: string, messageId: string, workspaceId: string) => {
    const dbPath = path.join(require('os').homedir(), '.osd', 'osd.db');
    const db = initDatabase(dbPath);
    return branchConversation(db, conversationId, messageId, workspaceId);
  },
);

// --- IPC: Auto-routing settings ---
ipcMain.handle(IPC.AUTOROUTING_GET, () => {
  const runtime = getOrCreateRuntime();
  return runtime.autoRouterConfig;
});

ipcMain.handle(
  IPC.AUTOROUTING_SET,
  (
    _e,
    config: Partial<{
      enabled: boolean;
      localModel: string;
      cloudModel: string;
      complexityThreshold: number;
    }>,
  ) => {
    const runtime = getOrCreateRuntime();
    Object.assign(runtime.autoRouterConfig, config);
    if (!config.enabled) runtime.clearModelOverride();
    return runtime.autoRouterConfig;
  },
);

// --- IPC: Multi-Agent ---
import { MultiAgentOrchestrator } from '../core/agent/multi/orchestrator';
import type { AgentConfig } from '../core/agent/multi/agent-instance';
import type { RoutingStrategy } from '../core/agent/multi/orchestrator';

let multiAgent: MultiAgentOrchestrator | null = null;

function getOrCreateMultiAgent(): MultiAgentOrchestrator {
  if (multiAgent) return multiAgent;
  const runtime = getOrCreateRuntime();
  multiAgent = new MultiAgentOrchestrator(runtime.getRouter(), runtime.getTools());
  multiAgent.init();
  return multiAgent;
}

ipcMain.handle(IPC.MULTI_AGENT_LIST, () => {
  const ma = getOrCreateMultiAgent();
  return ma.registry.list().map((a) => ({ id: a.id, name: a.name, model: a.model }));
});

ipcMain.handle(IPC.MULTI_AGENT_SPAWN, (_e, config: AgentConfig) => {
  const ma = getOrCreateMultiAgent();
  ma.spawnAgent(config);
  return { id: config.id, name: config.name, model: config.model };
});

ipcMain.handle(IPC.MULTI_AGENT_KILL, (_e, id: string) => {
  const ma = getOrCreateMultiAgent();
  return ma.registry.kill(id);
});

ipcMain.handle(IPC.MULTI_AGENT_ROUTE, async (_e, message: string, strategy?: RoutingStrategy) => {
  const ma = getOrCreateMultiAgent();
  const context = {
    workspaceId: 'default',
    activeConnection: null,
    signal: new AbortController().signal,
  };
  const events: unknown[] = [];
  for await (const event of ma.route(message, strategy ?? 'single', context)) {
    mainWindow?.webContents.send(IPC.AGENT_STREAM, event);
    for (const view of mainWindow?.getBrowserViews() ?? []) {
      view.webContents.send(IPC.AGENT_STREAM, event);
    }
    events.push(event);
  }
  return events;
});

// --- IPC: OAuth ---
import { loginGithub } from '../core/auth/github';
import { loginGoogle } from '../core/auth/google';

ipcMain.handle(IPC.AUTH_LOGIN_GITHUB, async () => {
  const db = getStorageProxy();
  const clientId = await db.getSettingAsync('github_client_id');
  if (!clientId) throw new Error('GitHub OAuth not configured. Set github_client_id in Settings.');
  return loginGithub(clientId, 'osd://auth/github/callback');
});
ipcMain.handle(IPC.AUTH_LOGIN_GOOGLE, async () => {
  const db = getStorageProxy();
  const clientId = await db.getSettingAsync('google_client_id');
  if (!clientId) throw new Error('Google OAuth not configured. Set google_client_id in Settings.');
  return loginGoogle(clientId, 'osd://auth/google/callback');
});

// --- Error handling ---
process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});

// --- App lifecycle ---
import { buildAppMenu } from './menu';
import { registerAllM4IPC, setPluginManager, setMcpSupervisor, setUpdateManager } from './ipc';

app.whenReady().then(async () => {
  // 1. Storage + menu
  buildAppMenu();
  await initStorage();
  const db = getStorageProxy();

  // 2. Check OSD binary — guide user to configure
  const { isOsdInstalled, OSD_DIR } = await import('../core/osd/downloader.js');
  let osdBinPath = await db.getSettingAsync('osd_bin_path') as string | null;

  if (!osdBinPath && !isOsdInstalled()) {
    const { dialog, BrowserWindow: BW } = await import('electron');
    const { getLatestArtifact, getPlatformKey, getLatestVersion } = await import('../core/osd/manifest.js');
    const { downloadAndInstall } = await import('../core/osd/downloader.js');

    const platformKey = getPlatformKey();
    let artifact: Awaited<ReturnType<typeof getLatestArtifact>> = null;
    let version = 'latest';
    try {
      version = await getLatestVersion();
      artifact = await getLatestArtifact();
    } catch { /* offline — no download available */ }
    const hasDownload = !!artifact?.url;

    const buttons = hasDownload
      ? [`Download OSD ${version} (${platformKey})`, 'Browse for local install...', 'Connect to localhost:5601', 'Cancel']
      : ['Browse for local install...', 'Connect to localhost:5601', 'Cancel'];

    const detail = hasDownload
      ? `OpenSearch Dashboards ${version} will be downloaded (~${Math.round((artifact!.size || 200_000_000) / 1_000_000)}MB) and installed to ~/.osd-desktop/osd/`
      : `No pre-built OSD available for ${platformKey}. Install manually or connect to a running instance.`;

    const choice = await dialog.showMessageBox({
      type: 'question',
      title: 'Setup OpenSearch Dashboards',
      message: 'How would you like to set up OpenSearch Dashboards?',
      detail,
      buttons,
      defaultId: 0,
    });

    const action = hasDownload
      ? ['download', 'browse', 'external', 'cancel'][choice.response]
      : ['browse', 'external', 'cancel'][choice.response];

    if (action === 'download') {
      // In-app download with progress
      const progressWin = new BW({ width: 450, height: 140, frame: false, resizable: false, alwaysOnTop: true, show: true, backgroundColor: '#1a1a2e' });
      progressWin.loadURL('about:blank');
      progressWin.webContents.on('did-finish-load', () => {
        progressWin.webContents.executeJavaScript(`
          document.body.style.cssText='font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#e8e8f0';
          document.body.innerHTML='<h3 style="margin:0 0 8px">Downloading OSD ${version}</h3><div id="m" style="color:#a0a0c0">Starting...</div><div style="width:80%;height:6px;background:#333;border-radius:3px;margin-top:12px"><div id="bar" style="height:100%;background:#4da6ff;border-radius:3px;width:0%;transition:width 0.3s"></div></div>';
        `).catch(() => {});
      });

      try {
        await downloadAndInstall((p) => {
          const pct = Number(p.percent).toFixed(0);
          progressWin.webContents.executeJavaScript(
            `document.getElementById('m').textContent='${pct}% — ${Math.round(p.bytesDownloaded/1_000_000)}MB downloaded';document.getElementById('bar').style.width='${pct}%'`
          ).catch(() => {});
        });
        progressWin.close();
        osdBinPath = path.join(OSD_DIR, 'bin', 'opensearch-dashboards');
        await db.setSettingAsync('osd_bin_path', osdBinPath);
      } catch (err: unknown) {
        if (!progressWin.isDestroyed()) progressWin.close();
        await dialog.showMessageBox({ type: 'error', title: 'Download Failed', message: `${(err as Error).message}` });
      }
    } else if (action === 'browse') {
      const result = await dialog.showOpenDialog({
        title: 'Select opensearch-dashboards startup script',
        message: 'Select bin/opensearch-dashboards from your install or source checkout',
        properties: ['openFile'],
      });
      if (result.filePaths[0]) {
        osdBinPath = result.filePaths[0];
        await db.setSettingAsync('osd_bin_path', osdBinPath);
      }
    } else if (action === 'external') {
      osdBinPath = '__external__';
      await db.setSettingAsync('osd_bin_path', osdBinPath);
    }
  } else if (!osdBinPath && isOsdInstalled()) {
    osdBinPath = path.join(OSD_DIR, 'bin', 'opensearch-dashboards');
    await db.setSettingAsync('osd_bin_path', osdBinPath);
  }

  // 3. Start OSD or connect to external instance
  let osdReady = false;
  if (osdBinPath === '__external__') {
    // Check if OSD is actually running
    const http = await import('http');
    const osdPort = process.env.OSD_PORT ?? '5601';
    osdReady = await new Promise<boolean>(resolve => {
      const req = http.get(`http://localhost:${osdPort}/api/status`, res => resolve(res.statusCode === 200));
      req.on('error', () => resolve(false));
      req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
    if (!osdReady) console.log('[OSD] localhost:5601 not reachable — showing fallback page');
  } else if (osdBinPath) {
    const { OsdLifecycle } = await import('../core/osd/lifecycle.js');
    const { generateDefaultYml } = await import('../core/osd/default-config.js');
    const { writeFileSync, existsSync, mkdirSync } = await import('fs');

    // Write opensearch_dashboards.yml only on first install
    const osdDir = path.dirname(path.dirname(osdBinPath));
    const configDir = path.join(osdDir, 'config');
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
    const ymlPath = path.join(configDir, 'opensearch_dashboards.yml');
    if (!existsSync(ymlPath)) {
      const yml = generateDefaultYml();
      writeFileSync(ymlPath, yml, 'utf-8');
      console.log(`[OSD] Default config written to ${ymlPath}`);
    }

    const osd = new OsdLifecycle({ binPath: osdBinPath, port: Number(process.env.OSD_PORT ?? 5601) });
    osd.on('status', (s: string) => console.log(`[OSD] ${s}`));
    osd.on('log', (msg: string) => process.stdout.write(`[OSD] ${msg}`));
    try {
      await osd.start();
      osdReady = true;
    } catch (err) {
      console.error('[OSD] Failed to start:', err);
    }

    // Graceful shutdown
    app.on('before-quit', () => osd.stop());

    // Bounce IPC — kill and restart OSD
    ipcMain.handle('osd:bounce', async () => {
      osd.stop();
      await new Promise(r => setTimeout(r, 2000));
      await osd.start();
      return 'ok';
    });

    ipcMain.handle('osd:status', () => osd.status);

    ipcMain.handle('osd:navigate', (_e, urlPath: string) => {
      const osdPort = process.env.OSD_PORT ?? '5601';
      const win = BrowserWindow.getAllWindows()[0];
      const osdView = win?.getBrowserViews().find(v => v.webContents.getURL().includes('localhost'));
      if (osdView) osdView.webContents.loadURL(`http://localhost:${osdPort}${urlPath}`);
    });

    ipcMain.handle('__navigate_home__', () => {
      const osdPort = process.env.OSD_PORT ?? '5601';
      const win = BrowserWindow.getAllWindows()[0];
      const osdView = win?.getBrowserViews().find(v => v.webContents.getURL().includes('localhost'));
      if (osdView) osdView.webContents.loadURL(`http://localhost:${osdPort}/app/home`);
    });
  }

  // 4. Create window — loads OSD if ready, fallback otherwise
  createWindow();
  const win = BrowserWindow.getAllWindows()[0]!;

  // Load OSD if ready (add first — will be behind sidebar)
  if (osdReady) {
    const osdPort = process.env.OSD_PORT ?? '5601';
    const { BrowserView: BV } = await import('electron');
    const { getSidebarWidth } = await import('./sidebar.js');
    const osdView = new BV({
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    win.addBrowserView(osdView);
    const [width, height] = win.getContentSize();
    const sidebarW = getSidebarWidth();
    osdView.setBounds({ x: sidebarW, y: 0, width: width - sidebarW, height });
    osdView.webContents.loadURL(`http://localhost:${osdPort}`);
    win.on('resize', () => {
      const [w, h] = win.getContentSize();
      osdView.setBounds({ x: getSidebarWidth(), y: 0, width: w - getSidebarWidth(), height: h });
    });
  }

  // Sidebar (left panel — added after OSD so it's on top)
  const { setupSidebar, registerSidebarIPC } = await import('./sidebar.js');
  setupSidebar(win);
  if (osdBinPath && osdBinPath !== '__external__') {
    registerSidebarIPC(osdBinPath);
  }

  // Chat overlay (right panel — always available via Cmd+K)
  const chatOverlay = await import('./chat-overlay.js');
  const { setupChatOverlay } = chatOverlay;
  destroyChatOverlay = chatOverlay.destroyChatOverlay;
  setupChatOverlay(win);

  // 5. Register M4 IPC bridges
  registerAllM4IPC();

  // 6. Backup/Restore + Recovery
  const { registerBackupRestoreIPC } = await import('./backup-restore.js');
  const { registerRecoveryIPC } = await import('./recovery.js');
  registerBackupRestoreIPC();
  registerRecoveryIPC();

  // 3. Wire devops backends when available (setter injection)
  try {
    const pluginMgr = await import('../core/plugins/manager.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPluginManager(pluginMgr as any);
  } catch {
    /* not yet landed */
  }

  try {
    const { McpSupervisor } = await import('../core/mcp/supervisor.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMcpSupervisor(new McpSupervisor() as any);
  } catch {
    /* not yet landed */
  }

  try {
    const updateMgr = await import('../core/updates/update-checker.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setUpdateManager(updateMgr as any);
  } catch {
    /* not yet landed */
  }

  // 4. Lazy background tasks (after window shows)
  setTimeout(() => {
    // MCP servers start after window is visible
    try {
      const { McpSupervisor: Mcp } = require('../core/mcp/supervisor');
      const supervisor = new Mcp();
      supervisor.startAll?.();
    } catch {
      /* MCP not available */
    }
  }, 1000);
});

app.on('window-all-closed', () => {
  destroyChatOverlay();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

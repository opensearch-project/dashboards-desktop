import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../core/types';
import type { ConnectionInput, StreamEvent } from '../core/types';

const api = {
  storage: {
    init: () => ipcRenderer.invoke(IPC.STORAGE_INIT),
  },
  credentials: {
    save: (key: string, value: string) => ipcRenderer.invoke(IPC.CREDENTIALS_SAVE, key, value),
    load: (key: string) => ipcRenderer.invoke(IPC.CREDENTIALS_LOAD, key),
  },
  connections: {
    add: (input: ConnectionInput) => ipcRenderer.invoke(IPC.CONNECTION_ADD, input),
    update: (id: string, input: Partial<ConnectionInput>) =>
      ipcRenderer.invoke(IPC.CONNECTION_UPDATE, id, input),
    delete: (id: string) => ipcRenderer.invoke(IPC.CONNECTION_DELETE, id),
    list: (workspaceId?: string) => ipcRenderer.invoke(IPC.CONNECTION_LIST, workspaceId),
    test: (input: ConnectionInput) => ipcRenderer.invoke(IPC.CONNECTION_TEST, input),
  },
  workspaces: {
    list: () => ipcRenderer.invoke(IPC.WORKSPACE_LIST),
    create: (name: string) => ipcRenderer.invoke(IPC.WORKSPACE_CREATE, name),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
    getAll: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
  },
  agent: {
    send: (message: string, conversationId?: string) =>
      ipcRenderer.invoke(IPC.AGENT_SEND, message, conversationId),
    cancel: () => ipcRenderer.invoke(IPC.AGENT_CANCEL),
    onStream: (cb: (event: StreamEvent) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, event: StreamEvent) => cb(event);
      ipcRenderer.on(IPC.AGENT_STREAM, handler);
      return () => {
        ipcRenderer.removeListener(IPC.AGENT_STREAM, handler);
      };
    },
  },
  models: {
    list: () => ipcRenderer.invoke(IPC.MODEL_LIST),
    switch: (modelId: string) => ipcRenderer.invoke(IPC.MODEL_SWITCH, modelId),
    current: () => ipcRenderer.invoke(IPC.MODEL_CURRENT),
  },
  conversations: {
    list: (workspaceId: string) => ipcRenderer.invoke(IPC.CONVERSATION_LIST, workspaceId),
    create: (workspaceId: string, title?: string) =>
      ipcRenderer.invoke(IPC.CONVERSATION_CREATE, workspaceId, title),
    delete: (id: string) => ipcRenderer.invoke(IPC.CONVERSATION_DELETE, id),
    rename: (id: string, title: string) => ipcRenderer.invoke(IPC.CONVERSATION_RENAME, id, title),
    messages: (conversationId: string) =>
      ipcRenderer.invoke(IPC.CONVERSATION_MESSAGES, conversationId),
  },
  cluster: {
    health: () => ipcRenderer.invoke(IPC.CLUSTER_HEALTH),
    nodes: () => ipcRenderer.invoke(IPC.CLUSTER_NODES),
    shards: () => ipcRenderer.invoke(IPC.CLUSTER_SHARDS),
  },
  indices: {
    list: () => ipcRenderer.invoke(IPC.INDICES_LIST),
    create: (name: string, settings?: object, mappings?: object) =>
      ipcRenderer.invoke(IPC.INDICES_CREATE, name, settings, mappings),
    delete: (name: string) => ipcRenderer.invoke(IPC.INDICES_DELETE, name),
    close: (name: string) => ipcRenderer.invoke(IPC.INDICES_CLOSE, name),
    open: (name: string) => ipcRenderer.invoke(IPC.INDICES_OPEN, name),
    reindex: (source: string, dest: string) =>
      ipcRenderer.invoke(IPC.INDICES_REINDEX, source, dest),
    aliases: () => ipcRenderer.invoke(IPC.INDICES_ALIASES),
    updateAlias: (actions: object[]) => ipcRenderer.invoke(IPC.INDICES_UPDATE_ALIAS, actions),
  },
  security: {
    roles: {
      list: () => ipcRenderer.invoke(IPC.SECURITY_ROLES_LIST),
      save: (name: string, body: object) => ipcRenderer.invoke(IPC.SECURITY_ROLES_SAVE, name, body),
      delete: (name: string) => ipcRenderer.invoke(IPC.SECURITY_ROLES_DELETE, name),
    },
    users: {
      list: () => ipcRenderer.invoke(IPC.SECURITY_USERS_LIST),
      save: (username: string, body: object) =>
        ipcRenderer.invoke(IPC.SECURITY_USERS_SAVE, username, body),
      delete: (username: string) => ipcRenderer.invoke(IPC.SECURITY_USERS_DELETE, username),
    },
    tenants: {
      list: () => ipcRenderer.invoke(IPC.SECURITY_TENANTS_LIST),
      save: (name: string, body: object) =>
        ipcRenderer.invoke(IPC.SECURITY_TENANTS_SAVE, name, body),
      delete: (name: string) => ipcRenderer.invoke(IPC.SECURITY_TENANTS_DELETE, name),
    },
  },
  auth: {
    loginGithub: () => ipcRenderer.invoke(IPC.AUTH_LOGIN_GITHUB),
    loginGoogle: () => ipcRenderer.invoke(IPC.AUTH_LOGIN_GOOGLE),
    logout: () => ipcRenderer.invoke(IPC.AUTH_LOGOUT),
    currentUser: () => ipcRenderer.invoke(IPC.AUTH_CURRENT_USER),
  },
  plugins: {
    list: () => ipcRenderer.invoke(IPC.PLUGIN_LIST),
    install: (source: string) => ipcRenderer.invoke(IPC.PLUGIN_INSTALL, source),
    uninstall: (name: string) => ipcRenderer.invoke(IPC.PLUGIN_UNINSTALL, name),
    enable: (name: string) => ipcRenderer.invoke(IPC.PLUGIN_ENABLE, name),
    disable: (name: string) => ipcRenderer.invoke(IPC.PLUGIN_DISABLE, name),
  },
  skills: {
    list: () => ipcRenderer.invoke(IPC.SKILL_LIST),
    install: (source: string) => ipcRenderer.invoke(IPC.SKILL_INSTALL, source),
    remove: (name: string) => ipcRenderer.invoke(IPC.SKILL_REMOVE, name),
    activate: (name: string) => ipcRenderer.invoke(IPC.SKILL_ACTIVATE, name),
  },
  agents: {
    listPersonas: () => ipcRenderer.invoke(IPC.AGENT_LIST_PERSONAS),
    switchPersona: (id: string) => ipcRenderer.invoke(IPC.AGENT_SWITCH_PERSONA, id),
    activePersona: () => ipcRenderer.invoke(IPC.AGENT_ACTIVE_PERSONA),
  },
  mcp: {
    list: () => ipcRenderer.invoke(IPC.MCP_LIST),
    install: (source: string) => ipcRenderer.invoke(IPC.MCP_INSTALL, source),
    start: (name: string) => ipcRenderer.invoke(IPC.MCP_START, name),
    stop: (name: string) => ipcRenderer.invoke(IPC.MCP_STOP, name),
    restart: (name: string) => ipcRenderer.invoke(IPC.MCP_RESTART, name),
    getConfig: (name: string) => ipcRenderer.invoke(IPC.MCP_CONFIG_GET, name),
    setConfig: (name: string, config: object) =>
      ipcRenderer.invoke(IPC.MCP_CONFIG_SET, name, config),
    tools: (name: string) => ipcRenderer.invoke(IPC.MCP_TOOLS, name),
  },
  updates: {
    check: () => ipcRenderer.invoke(IPC.UPDATE_CHECK),
    install: () => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
    channel: () => ipcRenderer.invoke(IPC.UPDATE_CHANNEL),
    setChannel: (ch: string) => ipcRenderer.invoke(IPC.UPDATE_SET_CHANNEL, ch),
  },
  osdUpgrade: {
    checkAvailable: () => ipcRenderer.invoke('osd:check-upgrade'),
    getVersion: () => ipcRenderer.invoke('osd:get-version'),
    upgrade: () => ipcRenderer.invoke('osd:upgrade'),
    onProgress: (cb: (progress: { percent: number }) => void) => {
      ipcRenderer.on('osd:upgrade-progress', (_e, p) => cb(p));
      return () => ipcRenderer.removeAllListeners('osd:upgrade-progress');
    },
  },
  messages: {
    pin: (messageId: string) => ipcRenderer.invoke(IPC.MESSAGE_PIN, messageId),
    unpin: (messageId: string) => ipcRenderer.invoke(IPC.MESSAGE_UNPIN, messageId),
    listPinned: (conversationId: string) =>
      ipcRenderer.invoke(IPC.MESSAGE_LIST_PINNED, conversationId),
  },
  feedback: {
    collectMeta: () => ipcRenderer.invoke('feedback:collect-meta'),
    submit: (json: string) => ipcRenderer.invoke('feedback:submit', json),
  },
};

contextBridge.exposeInMainWorld('osd', api);

/** Type declaration for renderer access */
export type OsdApi = typeof api;

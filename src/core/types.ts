/** Auth types for data source connections */
export type AuthType = 'basic' | 'apikey' | 'aws-sigv4' | 'none';

/** Connection configuration stored in SQLite */
export interface Connection {
  id: string;
  name: string;
  url: string;
  type: 'opensearch' | 'elasticsearch';
  auth_type: AuthType;
  workspace_id: string;
  username?: string;
  region?: string;
  created_at: string;
  updated_at: string;
}

/** Input for creating/updating a connection */
export interface ConnectionInput {
  name: string;
  url: string;
  type: 'opensearch' | 'elasticsearch';
  auth_type: AuthType;
  workspace_id: string;
  username?: string;
  password?: string;
  api_key?: string;
  region?: string;
}

/** Result of a connection test */
export interface ConnectionTestResult {
  success: boolean;
  cluster_name?: string;
  version?: string;
  error?: string;
}

/** Workspace configuration */
export interface Workspace {
  id: string;
  name: string;
  is_default: number;
  created_at: string;
}

/** App settings key-value */
export interface Setting {
  key: string;
  value: string;
}

/** IPC channel names — single source of truth */
export const IPC = {
  STORAGE_INIT: 'storage:init',
  CONNECTION_ADD: 'connection:add',
  CONNECTION_UPDATE: 'connection:update',
  CONNECTION_DELETE: 'connection:delete',
  CONNECTION_LIST: 'connection:list',
  CONNECTION_TEST: 'connection:test',
  CREDENTIALS_SAVE: 'credentials:save',
  CREDENTIALS_LOAD: 'credentials:load',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  AGENT_SEND: 'agent:send',
  AGENT_CANCEL: 'agent:cancel',
  AGENT_STREAM: 'agent:stream',
  MODEL_LIST: 'model:list',
  MODEL_SWITCH: 'model:switch',
  MODEL_CURRENT: 'model:current',
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_DELETE: 'conversation:delete',
  CONVERSATION_RENAME: 'conversation:rename',
  CONVERSATION_MESSAGES: 'conversation:messages',
  // M3: Admin
  CLUSTER_HEALTH: 'cluster:health',
  CLUSTER_NODES: 'cluster:nodes',
  CLUSTER_SHARDS: 'cluster:shards',
  INDICES_LIST: 'indices:list',
  INDICES_CREATE: 'indices:create',
  INDICES_DELETE: 'indices:delete',
  INDICES_CLOSE: 'indices:close',
  INDICES_OPEN: 'indices:open',
  INDICES_REINDEX: 'indices:reindex',
  INDICES_ALIASES: 'indices:aliases',
  INDICES_UPDATE_ALIAS: 'indices:updateAlias',
  SECURITY_ROLES_LIST: 'security:roles:list',
  SECURITY_ROLES_SAVE: 'security:roles:save',
  SECURITY_ROLES_DELETE: 'security:roles:delete',
  SECURITY_USERS_LIST: 'security:users:list',
  SECURITY_USERS_SAVE: 'security:users:save',
  SECURITY_USERS_DELETE: 'security:users:delete',
  SECURITY_TENANTS_LIST: 'security:tenants:list',
  SECURITY_TENANTS_SAVE: 'security:tenants:save',
  SECURITY_TENANTS_DELETE: 'security:tenants:delete',
  AUTH_LOGIN_GITHUB: 'auth:login:github',
  AUTH_LOGIN_GOOGLE: 'auth:login:google',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CURRENT_USER: 'auth:currentUser',
} as const;

/** Streaming event from agent runtime → renderer (§3 of AGENT-RUNTIME-DESIGN) */
export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_call_start'; name: string; id: string }
  | { type: 'tool_call_input'; delta: string }
  | { type: 'tool_call_end'; id: string }
  | { type: 'tool_result'; id: string; output: string; isError: boolean }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string; code: string };

/** Model info returned by model:list */
export interface ModelInfo {
  id: string;
  displayName: string;
  provider: string;
  local: boolean;
  supportsTools: boolean;
}

/** Conversation metadata */
export interface Conversation {
  id: string;
  workspace_id: string;
  title: string;
  model: string;
  created_at: number;
  updated_at: number;
}

/** Chat message stored in SQLite */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: string;
  tool_call_id?: string;
  created_at: number;
}

/** Cluster health response */
export interface ClusterHealth {
  cluster_name: string;
  status: 'green' | 'yellow' | 'red';
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  unassigned_shards: number;
  storage_total_bytes: number;
  storage_used_bytes: number;
}

/** Node info */
export interface ClusterNode {
  id: string;
  name: string;
  ip: string;
  roles: string[];
  cpu_percent: number;
  heap_percent: number;
  disk_used_percent: number;
  disk_total_bytes: number;
}

/** Shard info */
export interface ShardInfo {
  index: string;
  shard: number;
  primary: boolean;
  state: string;
  node: string;
  docs: number;
  store_bytes: number;
}

/** Index info */
export interface IndexInfo {
  name: string;
  health: 'green' | 'yellow' | 'red';
  status: 'open' | 'close';
  docs_count: number;
  store_size_bytes: number;
  primary_shards: number;
  replica_shards: number;
  aliases: string[];
}

/** Security role */
export interface SecurityRole {
  name: string;
  cluster_permissions: string[];
  index_permissions: { index_patterns: string[]; allowed_actions: string[] }[];
  tenant_permissions: { tenant_patterns: string[]; allowed_actions: string[] }[];
}

/** Security user */
export interface SecurityUser {
  username: string;
  backend_roles: string[];
  roles: string[];
  attributes: Record<string, string>;
}

/** Security tenant */
export interface SecurityTenant {
  name: string;
  description: string;
}

/** OAuth user */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  provider: 'github' | 'google';
}

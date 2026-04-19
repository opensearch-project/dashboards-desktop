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
  workspace_id?: string;
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

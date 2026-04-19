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
} as const;

/**
 * Connection pool — reuses clients per connectionId.
 * Creates on first use, invalidates on edit/delete.
 * Tracks active connection per workspace.
 */

import { createClient, type UnifiedClient } from './factory';

interface PooledConnection {
  url: string;
  type: 'opensearch' | 'elasticsearch';
  auth_type: string;
  username?: string;
  password?: string;
  api_key?: string;
  region?: string;
}

const pool = new Map<string, UnifiedClient>();
const activePerWorkspace = new Map<string, string>(); // workspaceId → connectionId

export function getClient(connectionId: string, config: PooledConnection): UnifiedClient {
  let client = pool.get(connectionId);
  if (!client) {
    client = createClient(config);
    pool.set(connectionId, client);
  }
  return client;
}

export function invalidate(connectionId: string): void {
  pool.delete(connectionId);
}

export function invalidateAll(): void {
  pool.clear();
}

export function setActiveConnection(workspaceId: string, connectionId: string): void {
  activePerWorkspace.set(workspaceId, connectionId);
}

export function getActiveConnectionId(workspaceId: string): string | undefined {
  return activePerWorkspace.get(workspaceId);
}

export function clearActiveConnection(workspaceId: string): void {
  activePerWorkspace.delete(workspaceId);
}

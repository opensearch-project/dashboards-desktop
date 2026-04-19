/**
 * Connection manager — CRUD for data source connections.
 *
 * Supports both OpenSearch and Elasticsearch via their native JS clients.
 * All cluster communication runs in the main process (clients are Node-only).
 * Credentials are encrypted via Electron safeStorage.
 */

import { safeStorage } from 'electron';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import { getStorage } from './storage';
import type { Connection, ConnectionInput, ConnectionTestResult } from './types';

// ---------------------------------------------------------------------------
// Credential helpers
// ---------------------------------------------------------------------------

const credentialStore = new Map<string, Buffer>();

function saveCredential(connectionId: string, key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) return;
  credentialStore.set(`${connectionId}:${key}`, safeStorage.encryptString(value));
}

function loadCredential(connectionId: string, key: string): string | null {
  const buf = credentialStore.get(`${connectionId}:${key}`);
  if (!buf) return null;
  return safeStorage.decryptString(buf);
}

function clearCredentials(connectionId: string): void {
  for (const k of credentialStore.keys()) {
    if (k.startsWith(`${connectionId}:`)) credentialStore.delete(k);
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function addConnection(input: ConnectionInput): Promise<Connection> {
  const db = getStorage();
  const id = uuidv4();

  // Get default workspace if none specified
  let workspaceId = input.workspace_id;
  if (!workspaceId) {
    const workspaces = (await db.listWorkspaces()) as Array<{ id: string; is_default: number }>;
    const def = workspaces.find((w) => w.is_default === 1);
    workspaceId = def?.id ?? workspaces[0]?.id;
    if (!workspaceId) throw new Error('No workspace available');
  }

  await db.insertConnection(
    id,
    input.name,
    input.url,
    input.type,
    input.auth_type,
    workspaceId,
    input.username ?? null,
    input.region ?? null
  );

  // Store sensitive credentials in memory (encrypted)
  if (input.password) saveCredential(id, 'password', input.password);
  if (input.api_key) saveCredential(id, 'api_key', input.api_key);

  return (await db.getConnection(id)) as Connection;
}

export async function updateConnection(
  id: string,
  input: Partial<ConnectionInput>
): Promise<Connection> {
  const db = getStorage();
  const { password, api_key, workspace_id, ...dbFields } = input;

  const fields: Record<string, unknown> = { ...dbFields };
  if (workspace_id) fields.workspace_id = workspace_id;

  if (Object.keys(fields).length > 0) {
    await db.updateConnection(id, fields);
  }

  if (password) saveCredential(id, 'password', password);
  if (api_key) saveCredential(id, 'api_key', api_key);

  return (await db.getConnection(id)) as Connection;
}

export async function deleteConnection(id: string): Promise<void> {
  const db = getStorage();
  await db.deleteConnection(id);
  clearCredentials(id);
}

export async function listConnections(workspaceId?: string): Promise<Connection[]> {
  const db = getStorage();
  return (await db.listConnections(workspaceId)) as Connection[];
}

// ---------------------------------------------------------------------------
// Connection testing
// ---------------------------------------------------------------------------

export async function testConnection(input: ConnectionInput): Promise<ConnectionTestResult> {
  try {
    if (input.type === 'opensearch') {
      return await testOpenSearch(input);
    } else {
      return await testElasticsearch(input);
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testOpenSearch(input: ConnectionInput): Promise<ConnectionTestResult> {
  const opts: Record<string, unknown> = { node: input.url };

  if (input.auth_type === 'basic' && input.username && input.password) {
    opts.auth = { username: input.username, password: input.password };
  }

  const client = new OpenSearchClient(opts);
  const info = await client.info();
  const body = info.body;
  return {
    success: true,
    cluster_name: body.cluster_name,
    version: body.version?.number,
  };
}

async function testElasticsearch(input: ConnectionInput): Promise<ConnectionTestResult> {
  const opts: Record<string, unknown> = { node: input.url };

  if (input.auth_type === 'basic' && input.username && input.password) {
    opts.auth = { username: input.username, password: input.password };
  } else if (input.auth_type === 'apikey' && input.api_key) {
    opts.auth = { apiKey: input.api_key };
  }

  const client = new ElasticsearchClient(opts as ConstructorParameters<typeof ElasticsearchClient>[0]);
  const info = await client.info();
  return {
    success: true,
    cluster_name: info.cluster_name,
    version: info.version?.number,
  };
}

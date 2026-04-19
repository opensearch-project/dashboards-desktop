/**
 * SQLite storage module.
 *
 * Exports:
 * - Synchronous functions (initDatabase, addConnection, etc.) for direct use and testing
 * - StorageProxy class for async worker-thread usage from the Electron main process
 *
 * Schema: connections, workspaces, settings, conversations, messages, schema_version
 * Features: WAL mode, auto-init, migration system
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const LATEST_SCHEMA_VERSION = 3;

interface Migration {
  version: number;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      );
      INSERT INTO schema_version (version) VALUES (1);

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('opensearch', 'elasticsearch')),
        auth_type TEXT NOT NULL CHECK (auth_type IN ('basic', 'apikey', 'aws-sigv4', 'none')),
        workspace_id TEXT NOT NULL,
        username TEXT,
        region TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS credentials (
        connection_id TEXT PRIMARY KEY,
        encrypted_blob BLOB NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
      );
      UPDATE schema_version SET version = 2;
    `,
  },
  {
    version: 3,
    up: `
      ALTER TABLE conversations ADD COLUMN model TEXT NOT NULL DEFAULT '';
      ALTER TABLE messages ADD COLUMN tool_calls TEXT;
      ALTER TABLE messages ADD COLUMN tool_call_id TEXT;
      ALTER TABLE messages ADD COLUMN token_count INTEGER;
      CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
      UPDATE schema_version SET version = 3;
    `,
  },
];

// ---------------------------------------------------------------------------
// Synchronous API — direct DB access (for testing and in-process use)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

export function initDatabase(dbPath: string): DB {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  ensureDefaultWorkspace(db);
  return db;
}

export function getSchemaVersion(db: DB): number {
  try {
    const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

function runMigrations(db: DB): void {
  let current = getSchemaVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.exec(m.up);
      current = m.version;
    }
  }
}

function ensureDefaultWorkspace(db: DB): void {
  const existing = db.prepare('SELECT id FROM workspaces WHERE is_default = 1').get();
  if (!existing) {
    db.prepare('INSERT INTO workspaces (id, name, is_default) VALUES (?, ?, 1)').run(crypto.randomUUID(), 'Default');
  }
}

// --- Connections ---

interface ConnectionInput {
  name: string;
  url: string;
  type: string;
  auth_type: string;
  workspace_id: string;
  username?: string;
  region?: string;
}

export function addConnection(db: DB, input: ConnectionInput): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO connections (id, name, url, type, auth_type, workspace_id, username, region)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.name, input.url, input.type, input.auth_type, input.workspace_id, input.username ?? null, input.region ?? null);
  return id;
}

export function getConnection(db: DB, id: string): unknown {
  return db.prepare('SELECT * FROM connections WHERE id = ?').get(id);
}

export function listConnections(db: DB, workspaceId?: string): unknown[] {
  if (workspaceId) {
    return db.prepare('SELECT * FROM connections WHERE workspace_id = ? ORDER BY name').all(workspaceId);
  }
  return db.prepare('SELECT * FROM connections ORDER BY name').all();
}

export function updateConnection(db: DB, id: string, fields: Record<string, unknown>): void {
  const sets = Object.keys(fields).map((k) => `${k} = ?`).concat("updated_at = datetime('now')");
  const vals = Object.values(fields);
  db.prepare(`UPDATE connections SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
}

export function deleteConnection(db: DB, id: string): void {
  db.prepare('DELETE FROM connections WHERE id = ?').run(id);
}

// --- Workspaces ---

export function listWorkspaces(db: DB): unknown[] {
  return db.prepare('SELECT * FROM workspaces ORDER BY is_default DESC, name').all();
}

export function createWorkspace(db: DB, name: string): string {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run(id, name);
  return id;
}

// --- Settings ---

export function getSetting(db: DB, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(db: DB, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// --- Credentials ---

export function saveCredential(db: DB, connectionId: string, encryptedBlob: Buffer): void {
  db.prepare(
    `INSERT OR REPLACE INTO credentials (connection_id, encrypted_blob, updated_at) VALUES (?, ?, datetime('now'))`
  ).run(connectionId, encryptedBlob);
}

export function loadCredential(db: DB, connectionId: string): Buffer | undefined {
  const row = db.prepare('SELECT encrypted_blob FROM credentials WHERE connection_id = ?').get(connectionId) as { encrypted_blob: Buffer } | undefined;
  return row?.encrypted_blob;
}

export function deleteCredential(db: DB, connectionId: string): void {
  db.prepare('DELETE FROM credentials WHERE connection_id = ?').run(connectionId);
}

// ---------------------------------------------------------------------------
// Worker thread: handles messages from StorageProxy
// ---------------------------------------------------------------------------

if (!isMainThread && parentPort) {
  const dbPath = workerData.dbPath as string;
  const db = initDatabase(dbPath);

  parentPort.on('message', (req: { id: number; method: string; args: unknown[] }) => {
    try {
      let result: unknown;
      switch (req.method) {
        case 'addConnection': result = addConnection(db, req.args[0] as ConnectionInput); break;
        case 'getConnection': result = getConnection(db, req.args[0] as string); break;
        case 'listConnections': result = listConnections(db, req.args[0] as string | undefined); break;
        case 'updateConnection': result = updateConnection(db, req.args[0] as string, req.args[1] as Record<string, unknown>); break;
        case 'deleteConnection': result = deleteConnection(db, req.args[0] as string); break;
        case 'listWorkspaces': result = listWorkspaces(db); break;
        case 'createWorkspace': result = createWorkspace(db, req.args[0] as string); break;
        case 'getSetting': result = getSetting(db, req.args[0] as string); break;
        case 'setSetting': result = setSetting(db, req.args[0] as string, req.args[1] as string); break;
        case 'saveCredential': result = saveCredential(db, req.args[0] as string, Buffer.from(req.args[1] as ArrayBuffer)); break;
        case 'loadCredential': {
          const buf = loadCredential(db, req.args[0] as string);
          result = buf ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : undefined;
          break;
        }
        case 'deleteCredential': result = deleteCredential(db, req.args[0] as string); break;
        default: throw new Error(`Unknown method: ${req.method}`);
      }
      parentPort!.postMessage({ id: req.id, result });
    } catch (err: unknown) {
      parentPort!.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

// ---------------------------------------------------------------------------
// StorageProxy — async wrapper for worker thread (used by Electron main process)
// ---------------------------------------------------------------------------

export class StorageProxy {
  private worker: Worker;
  private nextId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(dbPath: string) {
    this.worker = new Worker(__filename, { workerData: { dbPath } });
    this.worker.on('message', (resp: { id: number; result?: unknown; error?: string }) => {
      const p = this.pending.get(resp.id);
      if (!p) return;
      this.pending.delete(resp.id);
      if (resp.error) p.reject(new Error(resp.error));
      else p.resolve(resp.result);
    });
  }

  private call(method: string, ...args: unknown[]): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, method, args });
    });
  }

  addConnectionAsync(input: Record<string, unknown>) { return this.call('addConnection', input) as Promise<string>; }
  getConnectionAsync(id: string) { return this.call('getConnection', id); }
  listConnectionsAsync(workspaceId?: string) { return this.call('listConnections', workspaceId) as Promise<unknown[]>; }
  updateConnectionAsync(id: string, fields: Record<string, unknown>) { return this.call('updateConnection', id, fields); }
  deleteConnectionAsync(id: string) { return this.call('deleteConnection', id); }
  listWorkspacesAsync() { return this.call('listWorkspaces') as Promise<unknown[]>; }
  createWorkspaceAsync(name: string) { return this.call('createWorkspace', name) as Promise<string>; }
  getSettingAsync(key: string) { return this.call('getSetting', key) as Promise<string | undefined>; }
  setSettingAsync(key: string, value: string) { return this.call('setSetting', key, value); }
  saveCredentialAsync(connectionId: string, encryptedBlob: Buffer) { return this.call('saveCredential', connectionId, encryptedBlob); }
  async loadCredentialAsync(connectionId: string): Promise<Buffer | undefined> {
    const ab = await this.call('loadCredential', connectionId) as ArrayBuffer | undefined;
    return ab ? Buffer.from(ab) : undefined;
  }
  deleteCredentialAsync(connectionId: string) { return this.call('deleteCredential', connectionId); }

  async close(): Promise<void> {
    await this.worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// Singleton for Electron main process
// ---------------------------------------------------------------------------

let storageProxy: StorageProxy | null = null;

function getDbPath(): string {
  const dir = path.join(os.homedir(), '.osd');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'osd.db');
}

export async function initStorage(): Promise<StorageProxy> {
  if (storageProxy) return storageProxy;
  storageProxy = new StorageProxy(getDbPath());
  await storageProxy.listWorkspacesAsync();
  return storageProxy;
}

export function getStorageProxy(): StorageProxy {
  if (!storageProxy) throw new Error('Storage not initialized — call initStorage() first');
  return storageProxy;
}

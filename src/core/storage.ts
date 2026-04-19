/**
 * SQLite storage module — runs in a worker thread to avoid blocking the main process.
 *
 * Schema: connections, workspaces, settings, conversations, schema_version
 * Features: WAL mode, auto-init ~/.osd/osd.db, migration system
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Types for worker messages
// ---------------------------------------------------------------------------

interface WorkerRequest {
  id: number;
  method: string;
  args: unknown[];
}

interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Schema migrations
// ---------------------------------------------------------------------------

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
      INSERT INTO schema_version (version) VALUES (0);

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

      UPDATE schema_version SET version = 1;
    `,
  },
];

// ---------------------------------------------------------------------------
// Worker thread: runs SQLite operations
// ---------------------------------------------------------------------------

if (!isMainThread && parentPort) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');
  const dbPath = workerData.dbPath as string;
  const db = new Database(dbPath);

  // Enable WAL mode for concurrent reads
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  // Ensure default workspace exists
  const existing = db.prepare('SELECT id FROM workspaces WHERE is_default = 1').get();
  if (!existing) {
    const { v4: uuidv4 } = require('uuid');
    db.prepare(
      'INSERT INTO workspaces (id, name, is_default) VALUES (?, ?, 1)'
    ).run(uuidv4(), 'Default');
  }

  parentPort.on('message', (req: WorkerRequest) => {
    try {
      const result = handleMethod(db, req.method, req.args);
      parentPort!.postMessage({ id: req.id, result } as WorkerResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      parentPort!.postMessage({ id: req.id, error: msg } as WorkerResponse);
    }
  });
}

function runMigrations(db: InstanceType<typeof import('better-sqlite3')>): void {
  // Get current version
  let currentVersion = 0;
  try {
    const row = db.prepare('SELECT version FROM schema_version').get() as
      | { version: number }
      | undefined;
    if (row) currentVersion = row.version;
  } catch {
    // Table doesn't exist yet — version 0
  }

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec(migration.up);
    }
  }
}

function handleMethod(
  db: InstanceType<typeof import('better-sqlite3')>,
  method: string,
  args: unknown[]
): unknown {
  switch (method) {
    // --- Connections ---
    case 'insertConnection':
      return db
        .prepare(
          `INSERT INTO connections (id, name, url, type, auth_type, workspace_id, username, region, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .run(...(args as string[]));

    case 'updateConnection': {
      const [id, fields] = args as [string, Record<string, unknown>];
      const sets = Object.keys(fields)
        .map((k) => `${k} = ?`)
        .concat("updated_at = datetime('now')");
      const vals = Object.values(fields);
      return db.prepare(`UPDATE connections SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    }

    case 'deleteConnection':
      return db.prepare('DELETE FROM connections WHERE id = ?').run(args[0] as string);

    case 'getConnection':
      return db.prepare('SELECT * FROM connections WHERE id = ?').get(args[0] as string);

    case 'listConnections':
      if (args[0]) {
        return db
          .prepare('SELECT * FROM connections WHERE workspace_id = ? ORDER BY name')
          .all(args[0] as string);
      }
      return db.prepare('SELECT * FROM connections ORDER BY name').all();

    // --- Workspaces ---
    case 'listWorkspaces':
      return db.prepare('SELECT * FROM workspaces ORDER BY is_default DESC, name').all();

    case 'createWorkspace': {
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run(id, args[0] as string);
      return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    }

    // --- Settings ---
    case 'getSetting': {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(args[0] as string) as
        | { value: string }
        | undefined;
      return row?.value ?? null;
    }

    case 'setSetting':
      return db
        .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run(args[0] as string, args[1] as string);

    default:
      throw new Error(`Unknown storage method: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// Main thread: proxy that communicates with the worker
// ---------------------------------------------------------------------------

export class StorageProxy {
  private worker: Worker;
  private nextId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(dbPath: string) {
    this.worker = new Worker(__filename, { workerData: { dbPath } });
    this.worker.on('message', (resp: WorkerResponse) => {
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
      this.worker.postMessage({ id, method, args } as WorkerRequest);
    });
  }

  // Connections
  insertConnection(...args: string[]) { return this.call('insertConnection', ...args); }
  updateConnection(id: string, fields: Record<string, unknown>) { return this.call('updateConnection', id, fields); }
  deleteConnection(id: string) { return this.call('deleteConnection', id); }
  getConnection(id: string) { return this.call('getConnection', id); }
  listConnections(workspaceId?: string) { return this.call('listConnections', workspaceId); }

  // Workspaces
  listWorkspaces() { return this.call('listWorkspaces'); }
  createWorkspace(name: string) { return this.call('createWorkspace', name); }

  // Settings
  getSetting(key: string) { return this.call('getSetting', key); }
  setSetting(key: string, value: string) { return this.call('setSetting', key, value); }

  async close(): Promise<void> {
    await this.worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// Singleton management
// ---------------------------------------------------------------------------

let storage: StorageProxy | null = null;

function getDbPath(): string {
  const dir = path.join(os.homedir(), '.osd');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'osd.db');
}

export async function initStorage(): Promise<StorageProxy> {
  if (storage) return storage;
  storage = new StorageProxy(getDbPath());
  // Warm up — ensure migrations ran
  await storage.listWorkspaces();
  return storage;
}

export function getStorage(): StorageProxy {
  if (!storage) throw new Error('Storage not initialized — call initStorage() first');
  return storage;
}

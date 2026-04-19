import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock uuid before importing storage
vi.mock('uuid', () => ({ v4: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) }));

import {
  initDatabase,
  getSchemaVersion,
  LATEST_SCHEMA_VERSION,
  addConnection,
  getConnection,
  listConnections,
  updateConnection,
  deleteConnection,
  listWorkspaces,
  createWorkspace,
  getSetting,
  setSetting,
} from '../../src/core/storage';

let tmpDir: string;
let dbPath: string;
let db: ReturnType<typeof initDatabase>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-test-'));
  dbPath = path.join(tmpDir, 'osd.db');
  db = initDatabase(dbPath);
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Storage: auto-init', () => {
  it('creates DB file and all required tables', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
    const tables: { name: string }[] = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    const names = tables.map((t) => t.name);
    expect(names).toContain('connections');
    expect(names).toContain('workspaces');
    expect(names).toContain('settings');
    expect(names).toContain('conversations');
    expect(names).toContain('messages');
    expect(names).toContain('schema_version');
  });

  it('enables WAL mode', () => {
    const result = db.pragma('journal_mode');
    expect(result[0].journal_mode).toBe('wal');
  });

  it('enables foreign keys', () => {
    const result = db.pragma('foreign_keys');
    expect(result[0].foreign_keys).toBe(1);
  });

  it('is idempotent — calling init twice does not error', () => {
    const db2 = initDatabase(dbPath);
    db2.close();
  });
});

describe('Storage: schema migrations', () => {
  it('sets schema version to LATEST_SCHEMA_VERSION on fresh init', () => {
    expect(getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
  });

  it('returns 0 for a DB with no schema_version table', () => {
    const emptyPath = path.join(tmpDir, 'empty.db');
    const Database = require('better-sqlite3');
    const emptyDb = new Database(emptyPath);
    expect(getSchemaVersion(emptyDb)).toBe(0);
    emptyDb.close();
  });
});

describe('Storage: connections CRUD', () => {
  let wsId: string;

  beforeEach(() => {
    const ws = listWorkspaces(db);
    wsId = (ws[0] as { id: string }).id;
  });

  it('adds a connection and retrieves it', () => {
    const id = addConnection(db, {
      name: 'test-cluster',
      url: 'https://localhost:9200',
      type: 'opensearch',
      auth_type: 'basic',
      workspace_id: wsId,
    });
    expect(id).toBeTruthy();

    const conn = getConnection(db, id) as Record<string, unknown>;
    expect(conn.name).toBe('test-cluster');
    expect(conn.url).toBe('https://localhost:9200');
    expect(conn.type).toBe('opensearch');
    expect(conn.auth_type).toBe('basic');
    expect(conn.workspace_id).toBe(wsId);
  });

  it('lists connections filtered by workspace', () => {
    const ws2 = createWorkspace(db, 'Other');
    addConnection(db, { name: 'a', url: 'https://a:9200', type: 'opensearch', auth_type: 'none', workspace_id: wsId });
    addConnection(db, { name: 'b', url: 'https://b:9200', type: 'elasticsearch', auth_type: 'apikey', workspace_id: wsId });
    addConnection(db, { name: 'c', url: 'https://c:9200', type: 'opensearch', auth_type: 'none', workspace_id: ws2 });

    const conns = listConnections(db, wsId) as { name: string }[];
    expect(conns).toHaveLength(2);
    expect(conns.map((c) => c.name).sort()).toEqual(['a', 'b']);
  });

  it('lists all connections when no workspace filter', () => {
    addConnection(db, { name: 'x', url: 'https://x:9200', type: 'opensearch', auth_type: 'none', workspace_id: wsId });
    const all = listConnections(db);
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('updates a connection', () => {
    const id = addConnection(db, { name: 'old', url: 'https://localhost:9200', type: 'opensearch', auth_type: 'none', workspace_id: wsId });
    updateConnection(db, id, { name: 'new' });
    const conn = getConnection(db, id) as Record<string, unknown>;
    expect(conn.name).toBe('new');
  });

  it('deletes a connection', () => {
    const id = addConnection(db, { name: 'del', url: 'https://localhost:9200', type: 'opensearch', auth_type: 'none', workspace_id: wsId });
    deleteConnection(db, id);
    expect(getConnection(db, id)).toBeUndefined();
  });
});

describe('Storage: workspaces', () => {
  it('creates a default workspace on init', () => {
    const ws = listWorkspaces(db) as { is_default: number }[];
    expect(ws.length).toBeGreaterThanOrEqual(1);
    expect(ws.some((w) => w.is_default === 1)).toBe(true);
  });

  it('creates and lists workspaces', () => {
    const id = createWorkspace(db, 'My Workspace');
    expect(id).toBeTruthy();
    const ws = listWorkspaces(db) as { name: string }[];
    expect(ws.some((w) => w.name === 'My Workspace')).toBe(true);
  });

  it('default workspace is listed first', () => {
    createWorkspace(db, 'AAA');
    const ws = listWorkspaces(db) as { is_default: number }[];
    expect(ws[0].is_default).toBe(1);
  });
});

describe('Storage: settings', () => {
  it('sets and gets a setting', () => {
    setSetting(db, 'theme', 'dark');
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('returns undefined for missing setting', () => {
    expect(getSetting(db, 'nonexistent')).toBeUndefined();
  });

  it('overwrites existing setting via INSERT OR REPLACE', () => {
    setSetting(db, 'model', 'ollama:llama3');
    setSetting(db, 'model', 'anthropic:claude');
    expect(getSetting(db, 'model')).toBe('anthropic:claude');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Storage module will be at @core/storage — tests define the contract
// sde implements src/core/storage.ts to pass these tests

let tmpDir: string;
let dbPath: string;

function getStorage() {
  // Dynamic import so each test gets fresh module state
  return require('../../src/core/storage');
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-test-'));
  dbPath = path.join(tmpDir, 'osd.db');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Storage: auto-init', () => {
  it('creates DB file and tables on init', async () => {
    const storage = getStorage();
    const db = storage.initDatabase(dbPath);
    expect(fs.existsSync(dbPath)).toBe(true);

    // Verify core tables exist
    const tables: { name: string }[] = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    const names = tables.map((t) => t.name);
    expect(names).toContain('connections');
    expect(names).toContain('workspaces');
    expect(names).toContain('settings');
    expect(names).toContain('conversations');
    expect(names).toContain('messages');
    db.close();
  });

  it('enables WAL mode', async () => {
    const storage = getStorage();
    const db = storage.initDatabase(dbPath);
    const result = db.pragma('journal_mode');
    expect(result[0].journal_mode).toBe('wal');
    db.close();
  });

  it('is idempotent — calling init twice does not error', async () => {
    const storage = getStorage();
    const db1 = storage.initDatabase(dbPath);
    db1.close();
    const db2 = storage.initDatabase(dbPath);
    db2.close();
  });
});

describe('Storage: schema migrations', () => {
  it('tracks schema version', async () => {
    const storage = getStorage();
    const db = storage.initDatabase(dbPath);
    const version = storage.getSchemaVersion(db);
    expect(typeof version).toBe('number');
    expect(version).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it('runs pending migrations on init', async () => {
    const storage = getStorage();
    const db = storage.initDatabase(dbPath);
    const version = storage.getSchemaVersion(db);
    // After fresh init, should be at latest version
    expect(version).toBe(storage.LATEST_SCHEMA_VERSION);
    db.close();
  });
});

describe('Storage: connections CRUD', () => {
  let db: any;
  let storage: any;

  beforeEach(() => {
    storage = getStorage();
    db = storage.initDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
  });

  it('adds a connection and retrieves it', () => {
    const id = storage.addConnection(db, {
      name: 'test-cluster',
      url: 'https://localhost:9200',
      type: 'opensearch',
      auth_type: 'basic',
      workspace_id: 'default',
    });
    expect(id).toBeTruthy();

    const conn = storage.getConnection(db, id);
    expect(conn.name).toBe('test-cluster');
    expect(conn.url).toBe('https://localhost:9200');
    expect(conn.type).toBe('opensearch');
    expect(conn.auth_type).toBe('basic');
  });

  it('lists connections for a workspace', () => {
    storage.addConnection(db, {
      name: 'conn-1',
      url: 'https://a:9200',
      type: 'opensearch',
      auth_type: 'none',
      workspace_id: 'ws-1',
    });
    storage.addConnection(db, {
      name: 'conn-2',
      url: 'https://b:9200',
      type: 'elasticsearch',
      auth_type: 'apikey',
      workspace_id: 'ws-1',
    });
    storage.addConnection(db, {
      name: 'conn-other',
      url: 'https://c:9200',
      type: 'opensearch',
      auth_type: 'none',
      workspace_id: 'ws-2',
    });

    const conns = storage.listConnections(db, 'ws-1');
    expect(conns).toHaveLength(2);
    expect(conns.map((c: any) => c.name).sort()).toEqual(['conn-1', 'conn-2']);
  });

  it('updates a connection', () => {
    const id = storage.addConnection(db, {
      name: 'old-name',
      url: 'https://localhost:9200',
      type: 'opensearch',
      auth_type: 'none',
      workspace_id: 'default',
    });

    storage.updateConnection(db, id, { name: 'new-name' });
    const conn = storage.getConnection(db, id);
    expect(conn.name).toBe('new-name');
  });

  it('deletes a connection', () => {
    const id = storage.addConnection(db, {
      name: 'to-delete',
      url: 'https://localhost:9200',
      type: 'opensearch',
      auth_type: 'none',
      workspace_id: 'default',
    });

    storage.deleteConnection(db, id);
    const conn = storage.getConnection(db, id);
    expect(conn).toBeUndefined();
  });
});

describe('Storage: workspaces CRUD', () => {
  let db: any;
  let storage: any;

  beforeEach(() => {
    storage = getStorage();
    db = storage.initDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
  });

  it('creates a default workspace on init', () => {
    const workspaces = storage.listWorkspaces(db);
    expect(workspaces.length).toBeGreaterThanOrEqual(1);
    expect(workspaces.some((w: any) => w.is_default === 1)).toBe(true);
  });

  it('creates and lists workspaces', () => {
    const id = storage.createWorkspace(db, 'My Workspace');
    expect(id).toBeTruthy();

    const workspaces = storage.listWorkspaces(db);
    expect(workspaces.some((w: any) => w.name === 'My Workspace')).toBe(true);
  });
});

describe('Storage: settings CRUD', () => {
  let db: any;
  let storage: any;

  beforeEach(() => {
    storage = getStorage();
    db = storage.initDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
  });

  it('sets and gets a setting', () => {
    storage.setSetting(db, 'theme', 'dark');
    expect(storage.getSetting(db, 'theme')).toBe('dark');
  });

  it('returns undefined for missing setting', () => {
    expect(storage.getSetting(db, 'nonexistent')).toBeUndefined();
  });

  it('overwrites existing setting', () => {
    storage.setSetting(db, 'model', 'ollama:llama3');
    storage.setSetting(db, 'model', 'anthropic:claude');
    expect(storage.getSetting(db, 'model')).toBe('anthropic:claude');
  });
});

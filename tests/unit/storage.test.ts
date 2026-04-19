import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock uuid
vi.mock('uuid', () => ({ v4: vi.fn(() => 'uuid-' + Math.random().toString(36).slice(2, 8)) }));

// In-memory SQLite mock that simulates better-sqlite3 API
function createMockDb() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const pragmas: Record<string, unknown> = {};
  const stmtResults = new Map<string, unknown[]>();

  return {
    pragma: vi.fn((cmd: string) => {
      if (cmd.includes('=')) {
        const [key, val] = cmd.split('=').map((s) => s.trim());
        pragmas[key] = val;
        return;
      }
      if (cmd === 'journal_mode') return [{ journal_mode: pragmas['journal_mode'] || 'wal' }];
      if (cmd === 'foreign_keys') return [{ foreign_keys: pragmas['foreign_keys'] === 'ON' ? 1 : 0 }];
      return [];
    }),
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
    close: vi.fn(),
    _pragmas: pragmas,
  };
}

let mockDb: ReturnType<typeof createMockDb>;

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn(() => {
      mockDb = createMockDb();
      return mockDb;
    }),
  };
});

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-test-'));
  dbPath = path.join(tmpDir, 'osd.db');
  vi.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Storage: initDatabase', () => {
  it('creates a Database instance and enables WAL + foreign keys', async () => {
    const storage = await import('../../src/core/storage');
    const db = storage.initDatabase(dbPath);
    expect(db.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    expect(db.pragma).toHaveBeenCalledWith('foreign_keys = ON');
  });

  it('runs migrations via db.exec', async () => {
    const storage = await import('../../src/core/storage');
    const db = storage.initDatabase(dbPath);
    // Should have called exec with migration SQL containing CREATE TABLE
    expect(db.exec).toHaveBeenCalled();
    const execCall = (db.exec as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(execCall).toContain('CREATE TABLE');
    expect(execCall).toContain('connections');
    expect(execCall).toContain('workspaces');
    expect(execCall).toContain('settings');
    expect(execCall).toContain('conversations');
    expect(execCall).toContain('messages');
  });

  it('exports LATEST_SCHEMA_VERSION as a number >= 1', async () => {
    const storage = await import('../../src/core/storage');
    expect(typeof storage.LATEST_SCHEMA_VERSION).toBe('number');
    expect(storage.LATEST_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe('Storage: getSchemaVersion', () => {
  it('returns 0 when schema_version table does not exist', async () => {
    const storage = await import('../../src/core/storage');
    const fakeDb = {
      prepare: vi.fn(() => ({
        get: vi.fn(() => { throw new Error('no such table'); }),
      })),
    };
    expect(storage.getSchemaVersion(fakeDb)).toBe(0);
  });

  it('returns version from schema_version table', async () => {
    const storage = await import('../../src/core/storage');
    const fakeDb = {
      prepare: vi.fn(() => ({
        get: vi.fn(() => ({ version: 1 })),
      })),
    };
    expect(storage.getSchemaVersion(fakeDb)).toBe(1);
  });
});

describe('Storage: addConnection', () => {
  it('inserts a row and returns an id', async () => {
    const storage = await import('../../src/core/storage');
    const mockRun = vi.fn();
    const fakeDb = {
      prepare: vi.fn(() => ({ run: mockRun, get: vi.fn(), all: vi.fn(() => []) })),
    };
    const id = storage.addConnection(fakeDb, {
      name: 'test', url: 'https://localhost:9200', type: 'opensearch',
      auth_type: 'basic', workspace_id: 'ws-1',
    });
    expect(id).toBeTruthy();
    expect(mockRun).toHaveBeenCalled();
  });
});

describe('Storage: getConnection', () => {
  it('queries by id', async () => {
    const storage = await import('../../src/core/storage');
    const mockGet = vi.fn(() => ({ id: 'abc', name: 'test' }));
    const fakeDb = { prepare: vi.fn(() => ({ get: mockGet })) };
    const result = storage.getConnection(fakeDb, 'abc');
    expect(result).toEqual({ id: 'abc', name: 'test' });
    expect(mockGet).toHaveBeenCalledWith('abc');
  });

  it('returns undefined for missing connection', async () => {
    const storage = await import('../../src/core/storage');
    const fakeDb = { prepare: vi.fn(() => ({ get: vi.fn(() => undefined) })) };
    expect(storage.getConnection(fakeDb, 'missing')).toBeUndefined();
  });
});

describe('Storage: deleteConnection', () => {
  it('deletes by id', async () => {
    const storage = await import('../../src/core/storage');
    const mockRun = vi.fn();
    const fakeDb = { prepare: vi.fn(() => ({ run: mockRun })) };
    storage.deleteConnection(fakeDb, 'abc');
    expect(mockRun).toHaveBeenCalledWith('abc');
  });
});

describe('Storage: settings', () => {
  it('setSetting calls INSERT OR REPLACE', async () => {
    const storage = await import('../../src/core/storage');
    const mockRun = vi.fn();
    const fakeDb = { prepare: vi.fn(() => ({ run: mockRun })) };
    storage.setSetting(fakeDb, 'theme', 'dark');
    expect(mockRun).toHaveBeenCalledWith('theme', 'dark');
  });

  it('getSetting returns value or undefined', async () => {
    const storage = await import('../../src/core/storage');
    const fakeDb = { prepare: vi.fn(() => ({ get: vi.fn(() => ({ value: 'dark' })) })) };
    expect(storage.getSetting(fakeDb, 'theme')).toBe('dark');

    const fakeDb2 = { prepare: vi.fn(() => ({ get: vi.fn(() => undefined) })) };
    expect(storage.getSetting(fakeDb2, 'missing')).toBeUndefined();
  });
});

describe('Storage: workspaces', () => {
  it('createWorkspace inserts and returns id', async () => {
    const storage = await import('../../src/core/storage');
    const mockRun = vi.fn();
    const fakeDb = { prepare: vi.fn(() => ({ run: mockRun, get: vi.fn(), all: vi.fn(() => []) })) };
    const id = storage.createWorkspace(fakeDb, 'My WS');
    expect(id).toBeTruthy();
    expect(mockRun).toHaveBeenCalled();
  });

  it('listWorkspaces returns array', async () => {
    const storage = await import('../../src/core/storage');
    const mockAll = vi.fn(() => [{ id: '1', name: 'Default', is_default: 1 }]);
    const fakeDb = { prepare: vi.fn(() => ({ all: mockAll })) };
    const ws = storage.listWorkspaces(fakeDb);
    expect(ws).toHaveLength(1);
    expect((ws[0] as { name: string }).name).toBe('Default');
  });
});

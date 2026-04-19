import { describe, it, expect, vi } from 'vitest';

// Mock uuid
vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 8)) }));

// Mock better-sqlite3 so the module loads without native bindings.
// storage.ts uses require('better-sqlite3') at runtime inside initDatabase,
// but the module-level worker_threads code also triggers on import.
vi.mock('better-sqlite3', () => ({ default: vi.fn() }));

// Mock worker_threads to prevent worker code from running on import
vi.mock('worker_threads', async (importOriginal) => {
  const actual = await importOriginal<typeof import('worker_threads')>();
  return {
    ...actual,
    default: actual,
    isMainThread: true,
    parentPort: null,
    workerData: {},
    Worker: vi.fn(),
  };
});

import {
  LATEST_SCHEMA_VERSION,
  getSchemaVersion,
  addConnection,
  getConnection,
  listConnections,
  updateConnection,
  deleteConnection,
  listWorkspaces,
  createWorkspace,
  getSetting,
  setSetting,
  createConversation,
  listConversations,
  deleteConversation,
  addMessage,
  getMessages,
  deleteWorkspace,
  renameConversation,
  pinMessage,
  unpinMessage,
  listPinnedMessages,
} from '../../src/core/storage';

// Helper: create a fake db object that mimics better-sqlite3 API
function fakeDb(overrides: Record<string, unknown> = {}) {
  const mockRun = vi.fn();
  const mockGet = vi.fn();
  const mockAll = vi.fn(() => []);
  return {
    prepare: vi.fn(() => ({ run: mockRun, get: mockGet, all: mockAll })),
    pragma: vi.fn(),
    exec: vi.fn(),
    _mockRun: mockRun,
    _mockGet: mockGet,
    _mockAll: mockAll,
    ...overrides,
  };
}

describe('Storage: constants', () => {
  it('exports LATEST_SCHEMA_VERSION >= 1', () => {
    expect(typeof LATEST_SCHEMA_VERSION).toBe('number');
    expect(LATEST_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe('Storage: getSchemaVersion', () => {
  it('returns 0 when table does not exist', () => {
    const db = { prepare: vi.fn(() => ({ get: vi.fn(() => { throw new Error('no such table'); }) })) };
    expect(getSchemaVersion(db)).toBe(0);
  });

  it('returns version from schema_version table', () => {
    const db = { prepare: vi.fn(() => ({ get: vi.fn(() => ({ version: 1 })) })) };
    expect(getSchemaVersion(db)).toBe(1);
  });
});

describe('Storage: addConnection', () => {
  it('inserts and returns an id', () => {
    const db = fakeDb();
    const id = addConnection(db, {
      name: 'test', url: 'https://localhost:9200', type: 'opensearch',
      auth_type: 'basic', workspace_id: 'ws-1',
    });
    expect(id).toBeTruthy();
    expect(db._mockRun).toHaveBeenCalled();
  });
});

describe('Storage: getConnection', () => {
  it('queries by id and returns result', () => {
    const mockGet = vi.fn(() => ({ id: 'abc', name: 'test' }));
    const db = { prepare: vi.fn(() => ({ get: mockGet })) };
    expect(getConnection(db, 'abc')).toEqual({ id: 'abc', name: 'test' });
    expect(mockGet).toHaveBeenCalledWith('abc');
  });

  it('returns undefined for missing connection', () => {
    const db = { prepare: vi.fn(() => ({ get: vi.fn(() => undefined) })) };
    expect(getConnection(db, 'missing')).toBeUndefined();
  });
});

describe('Storage: listConnections', () => {
  it('filters by workspace when provided', () => {
    const mockAll = vi.fn(() => [{ id: '1', name: 'a' }]);
    const db = { prepare: vi.fn(() => ({ all: mockAll })) };
    const result = listConnections(db, 'ws-1');
    expect(result).toHaveLength(1);
    expect(mockAll).toHaveBeenCalledWith('ws-1');
  });

  it('returns all when no workspace filter', () => {
    const mockAll = vi.fn(() => [{ id: '1' }, { id: '2' }]);
    const db = { prepare: vi.fn(() => ({ all: mockAll })) };
    expect(listConnections(db)).toHaveLength(2);
  });
});

describe('Storage: updateConnection', () => {
  it('updates fields by id', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    updateConnection(db, 'abc', { name: 'new-name' });
    expect(mockRun).toHaveBeenCalled();
    expect(db.prepare).toHaveBeenCalled();
  });
});

describe('Storage: deleteConnection', () => {
  it('deletes by id', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    deleteConnection(db, 'abc');
    expect(mockRun).toHaveBeenCalledWith('abc');
  });
});

describe('Storage: workspaces', () => {
  it('createWorkspace returns id', () => {
    const db = fakeDb();
    const id = createWorkspace(db, 'My WS');
    expect(id).toBeTruthy();
    expect(db._mockRun).toHaveBeenCalled();
  });

  it('listWorkspaces returns array', () => {
    const mockAll = vi.fn(() => [{ id: '1', name: 'Default', is_default: 1 }]);
    const db = { prepare: vi.fn(() => ({ all: mockAll })) };
    const ws = listWorkspaces(db);
    expect(ws).toHaveLength(1);
  });
});

describe('Storage: settings', () => {
  it('setSetting calls run with key and value', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    setSetting(db, 'theme', 'dark');
    expect(mockRun).toHaveBeenCalledWith('theme', 'dark');
  });

  it('getSetting returns value', () => {
    const db = { prepare: vi.fn(() => ({ get: vi.fn(() => ({ value: 'dark' })) })) };
    expect(getSetting(db, 'theme')).toBe('dark');
  });

  it('getSetting returns undefined for missing key', () => {
    const db = { prepare: vi.fn(() => ({ get: vi.fn(() => undefined) })) };
    expect(getSetting(db, 'missing')).toBeUndefined();
  });
});

describe('Storage: conversations', () => {
  it('createConversation returns id', () => {
    const db = fakeDb();
    const id = createConversation(db, 'ws-1', 'ollama:llama3', 'Test chat');
    expect(id).toBeTruthy();
    expect(db._mockRun).toHaveBeenCalled();
  });

  it('createConversation uses default title when omitted', () => {
    const db = fakeDb();
    createConversation(db, 'ws-1', 'ollama:llama3');
    expect(db._mockRun).toHaveBeenCalledWith(
      expect.any(String), 'ws-1', 'New conversation', 'ollama:llama3'
    );
  });

  it('listConversations returns array for workspace', () => {
    const mockAll = vi.fn(() => [{ id: 'c1', title: 'Chat 1' }]);
    const db = { prepare: vi.fn(() => ({ all: mockAll })) };
    expect(listConversations(db, 'ws-1')).toHaveLength(1);
    expect(mockAll).toHaveBeenCalledWith('ws-1');
  });

  it('deleteConversation deletes by id', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    deleteConversation(db, 'c1');
    expect(mockRun).toHaveBeenCalledWith('c1');
  });

  it('renameConversation updates title', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    renameConversation(db, 'c1', 'New title');
    expect(mockRun).toHaveBeenCalledWith('New title', 'c1');
  });
});

describe('Storage: messages', () => {
  it('addMessage returns id and updates conversation', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    const id = addMessage(db, 'c1', 'user', 'Hello');
    expect(id).toBeTruthy();
    // Called twice: insert message + update conversation updated_at
    expect(db.prepare).toHaveBeenCalledTimes(2);
  });

  it('addMessage stores tool_calls and tool_call_id', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    addMessage(db, 'c1', 'assistant', 'result', '[{"name":"query"}]', 'tc-1');
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String), 'c1', 'assistant', 'result', '[{"name":"query"}]', 'tc-1', expect.any(Number)
    );
  });

  it('addMessage computes token_count as ceil(length/4)', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    addMessage(db, 'c1', 'user', 'Hello world!'); // 12 chars → ceil(12/4) = 3
    const tokenArg = mockRun.mock.calls[0][6];
    expect(tokenArg).toBe(3);
  });

  it('getMessages returns array', () => {
    const mockAll = vi.fn(() => [{ id: 'm1', role: 'user', content: 'Hi' }]);
    const db = { prepare: vi.fn(() => ({ all: mockAll })) };
    expect(getMessages(db, 'c1')).toHaveLength(1);
    expect(mockAll).toHaveBeenCalledWith('c1');
  });
});

describe('Storage: message pinning', () => {
  it('pinMessage sets pinned = 1', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    pinMessage(db, 'm1');
    expect(mockRun).toHaveBeenCalledWith('m1');
  });

  it('unpinMessage sets pinned = 0', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    unpinMessage(db, 'm1');
    expect(mockRun).toHaveBeenCalledWith('m1');
  });

  it('listPinnedMessages returns only pinned messages', () => {
    const mockAll = vi.fn(() => [{ id: 'm2', role: 'assistant', content: 'Important', pinned: 1 }]);
    const db = { prepare: vi.fn(() => ({ all: mockAll })) };
    const pinned = listPinnedMessages(db, 'c1');
    expect(pinned).toHaveLength(1);
    expect(mockAll).toHaveBeenCalledWith('c1');
  });
});

describe('Storage: deleteWorkspace', () => {
  it('deletes workspace by id', () => {
    const mockRun = vi.fn();
    const db = { prepare: vi.fn(() => ({ run: mockRun })) };
    deleteWorkspace(db, 'ws-1');
    expect(mockRun).toHaveBeenCalledWith('ws-1');
  });
});
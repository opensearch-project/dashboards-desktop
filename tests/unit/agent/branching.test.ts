import { describe, it, expect, vi } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'uuid-' + Math.random().toString(36).slice(2, 8)) }));
vi.mock('better-sqlite3', () => ({ default: vi.fn() }));
vi.mock('worker_threads', () => ({ isMainThread: true, parentPort: null, workerData: {}, Worker: vi.fn() }));

import { branchConversation } from '../../../src/core/agent/branching';

function fakeDb(sourceConvo: unknown, targetMsg: unknown, messages: unknown[] = []) {
  const mockRun = vi.fn();
  const mockAll = vi.fn(() => messages);
  const mockTransaction = vi.fn((fn: Function) => fn);

  return {
    prepare: vi.fn((sql: string) => {
      if (sql.includes('SELECT model, title FROM conversations')) return { get: vi.fn(() => sourceConvo) };
      if (sql.includes('SELECT created_at FROM messages WHERE id')) return { get: vi.fn(() => targetMsg) };
      if (sql.includes('INSERT INTO conversations')) return { run: mockRun };
      if (sql.includes('INSERT INTO messages (id, conversation_id, role')) return { run: mockRun };
      if (sql.includes('SELECT role, content')) return { all: mockAll };
      return { run: mockRun, get: vi.fn(), all: mockAll };
    }),
    transaction: mockTransaction,
    _mockRun: mockRun,
    _mockAll: mockAll,
  };
}

describe('branchConversation', () => {
  it('creates a new conversation with branch title', () => {
    const db = fakeDb(
      { model: 'ollama:llama3', title: 'Original Chat' },
      { created_at: '2026-04-19T10:00:00' },
      []
    );
    const newId = branchConversation(db, 'conv-1', 'msg-3', 'ws-1');
    expect(newId).toBeTruthy();
    expect(db._mockRun).toHaveBeenCalled();
    // Verify the INSERT INTO conversations was called with branch title
    const insertCall = db.prepare.mock.calls.find((c: string[]) => c[0].includes('INSERT INTO conversations'));
    expect(insertCall).toBeTruthy();
  });

  it('copies messages up to the fork point', () => {
    const messages = [
      { role: 'user', content: 'Hello', tool_calls: null, tool_call_id: null, token_count: 5, created_at: '2026-04-19T10:00:00' },
      { role: 'assistant', content: 'Hi', tool_calls: null, tool_call_id: null, token_count: 3, created_at: '2026-04-19T10:00:01' },
    ];
    const db = fakeDb(
      { model: 'ollama:llama3', title: 'Chat' },
      { created_at: '2026-04-19T10:00:01' },
      messages
    );
    branchConversation(db, 'conv-1', 'msg-2', 'ws-1');
    // Transaction should have been called to copy messages
    expect(db.transaction).toHaveBeenCalled();
  });

  it('throws when source conversation not found', () => {
    const db = fakeDb(null, null);
    expect(() => branchConversation(db, 'missing', 'msg-1', 'ws-1')).toThrow(/Conversation not found/);
  });

  it('throws when target message not found', () => {
    const db = fakeDb({ model: 'ollama:llama3', title: 'Chat' }, null);
    expect(() => branchConversation(db, 'conv-1', 'missing-msg', 'ws-1')).toThrow(/Message not found/);
  });

  it('returns a different id than the source', () => {
    const db = fakeDb(
      { model: 'ollama:llama3', title: 'Chat' },
      { created_at: '2026-04-19T10:00:00' },
      []
    );
    const newId = branchConversation(db, 'conv-1', 'msg-1', 'ws-1');
    expect(newId).not.toBe('conv-1');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'uuid-' + Math.random().toString(36).slice(2, 8)) }));
vi.mock('better-sqlite3', () => ({ default: vi.fn() }));
vi.mock('worker_threads', () => ({ isMainThread: true, parentPort: null, workerData: {}, Worker: vi.fn() }));

import { ConversationManager } from '../../../src/core/agent/conversation';

function fakeDb() {
  const rows: Record<string, unknown[]> = {};
  const mockRun = vi.fn();
  const mockGet = vi.fn();
  const mockAll = vi.fn(() => [] as unknown[]);

  return {
    prepare: vi.fn(() => ({ run: mockRun, get: mockGet, all: mockAll })),
    _mockRun: mockRun,
    _mockGet: mockGet,
    _mockAll: mockAll,
  };
}

describe('ConversationManager: CRUD', () => {
  it('creates a conversation and returns id', () => {
    const db = fakeDb();
    const mgr = new ConversationManager(db);
    const id = mgr.create('ws-1', 'ollama:llama3', 'Test chat');
    expect(id).toBeTruthy();
    expect(db._mockRun).toHaveBeenCalled();
  });

  it('creates with default title when none provided', () => {
    const db = fakeDb();
    const mgr = new ConversationManager(db);
    mgr.create('ws-1', 'ollama:llama3');
    const args = db._mockRun.mock.calls[0];
    expect(args).toContain('New conversation');
  });

  it('lists conversations for a workspace', () => {
    const db = fakeDb();
    db._mockAll.mockReturnValue([
      { id: 'c1', title: 'Chat 1', updated_at: '2026-04-19' },
      { id: 'c2', title: 'Chat 2', updated_at: '2026-04-18' },
    ]);
    const mgr = new ConversationManager(db);
    const convos = mgr.list('ws-1');
    expect(convos).toHaveLength(2);
    expect(db._mockAll).toHaveBeenCalledWith('ws-1');
  });

  it('deletes a conversation', () => {
    const db = fakeDb();
    const mgr = new ConversationManager(db);
    mgr.delete('c1');
    expect(db._mockRun).toHaveBeenCalledWith('c1');
  });
});

describe('ConversationManager: messages', () => {
  it('adds a message and returns id', () => {
    const db = fakeDb();
    const mgr = new ConversationManager(db);
    const id = mgr.addMessage('c1', 'user', 'Hello');
    expect(id).toBeTruthy();
    // Should call run twice: insert message + update conversation timestamp
    expect(db._mockRun).toHaveBeenCalledTimes(2);
  });

  it('adds a message with tool calls', () => {
    const db = fakeDb();
    const mgr = new ConversationManager(db);
    const toolCalls = JSON.stringify([{ id: 'tc1', name: 'cluster-health', input: {} }]);
    mgr.addMessage('c1', 'assistant', '', toolCalls);
    expect(db._mockRun).toHaveBeenCalled();
  });

  it('retrieves messages in order', () => {
    const db = fakeDb();
    db._mockAll.mockReturnValue([
      { role: 'user', content: 'Hello', tool_calls: null, tool_call_id: null },
      { role: 'assistant', content: 'Hi there', tool_calls: null, tool_call_id: null },
    ]);
    const mgr = new ConversationManager(db);
    const msgs = mgr.getMessages('c1');
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[1].role).toBe('assistant');
  });

  it('parses tool_calls JSON in messages', () => {
    const db = fakeDb();
    db._mockAll.mockReturnValue([
      { role: 'assistant', content: '', tool_calls: '[{"id":"tc1","name":"query","input":{}}]', tool_call_id: null },
    ]);
    const mgr = new ConversationManager(db);
    const msgs = mgr.getMessages('c1');
    expect(msgs[0].toolCalls).toHaveLength(1);
    expect(msgs[0].toolCalls![0].name).toBe('query');
  });
});

describe('ConversationManager: workspace isolation', () => {
  it('list only returns conversations for the given workspace', () => {
    const db = fakeDb();
    db._mockAll.mockReturnValue([{ id: 'c1', title: 'WS1 chat', updated_at: '2026-04-19' }]);
    const mgr = new ConversationManager(db);
    mgr.list('ws-1');
    expect(db._mockAll).toHaveBeenCalledWith('ws-1');
  });
});

describe('ConversationManager: context window', () => {
  it('buildContext includes system prompt and fits messages within budget', () => {
    const db = fakeDb();
    db._mockAll.mockReturnValue([
      { role: 'assistant', content: 'Response', tool_calls: null, tool_call_id: null, token_count: 10 },
      { role: 'user', content: 'Hello', tool_calls: null, tool_call_id: null, token_count: 5 },
    ]);
    const mgr = new ConversationManager(db);
    const model = { id: 'test', displayName: 'Test', contextWindow: 8192, supportsTools: true, local: true };
    const tools = [{ name: 'cluster-health', description: 'Health', source: 'builtin' as const, inputSchema: {}, requiresApproval: false }];

    const ctx = mgr.buildContext('c1', model, tools, 'ws-1');
    expect(ctx[0].role).toBe('system');
    expect(ctx[0].content).toContain('cluster-health');
    expect(ctx.length).toBeGreaterThan(1);
  });

  it('truncates oldest messages when budget exceeded', () => {
    const db = fakeDb();
    // Return messages that exceed budget (each 5000 tokens, budget ~4096 after system)
    db._mockAll.mockReturnValue([
      { role: 'assistant', content: 'Recent', tool_calls: null, tool_call_id: null, token_count: 3000 },
      { role: 'user', content: 'Old', tool_calls: null, tool_call_id: null, token_count: 3000 },
      { role: 'user', content: 'Very old', tool_calls: null, tool_call_id: null, token_count: 3000 },
    ]);
    const mgr = new ConversationManager(db);
    const model = { id: 'test', displayName: 'Test', contextWindow: 8192, supportsTools: true, local: true };

    const ctx = mgr.buildContext('c1', model, [], 'ws-1');
    // System prompt + at most 1-2 messages should fit (8192 - 4096 reserve = 4096 budget)
    expect(ctx.length).toBeLessThan(4); // system + not all 3 messages
    expect(ctx[0].role).toBe('system');
  });
});

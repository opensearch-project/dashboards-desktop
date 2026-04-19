import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process.spawn
const mockChild = () => {
  const child = new EventEmitter() as any;
  child.pid = 12345;
  child.exitCode = null;
  child.stdin = { write: vi.fn() };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn((signal?: string) => {
    if (signal === 'SIGKILL' || signal === 'SIGTERM' || !signal) {
      child.exitCode = 1;
      child.emit('exit', 1, signal);
    }
  });
  return child;
};

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockChild()),
}));

import { McpSupervisor } from '../../../src/core/mcp/supervisor';
import { spawn } from 'child_process';

let supervisor: McpSupervisor;

beforeEach(() => {
  vi.clearAllMocks();
  supervisor = new McpSupervisor();
});

afterEach(async () => {
  await supervisor.shutdownAll();
});

const testConfig = { command: 'node', args: ['echo-server.js'] };

describe('McpSupervisor: lifecycle', () => {
  it('starts a server and sets status to running', async () => {
    await supervisor.start('echo', testConfig);
    const state = supervisor.get('echo');
    expect(state?.status).toBe('running');
    expect(spawn).toHaveBeenCalledWith('node', ['echo-server.js'], expect.any(Object));
  });

  it('stops a server gracefully', async () => {
    await supervisor.start('echo', testConfig);
    await supervisor.stop('echo');
    expect(supervisor.get('echo')?.status).toBe('stopped');
  });

  it('shutdownAll stops all servers', async () => {
    await supervisor.start('a', testConfig);
    await supervisor.start('b', testConfig);
    await supervisor.shutdownAll();
    expect(supervisor.get('a')?.status).toBe('stopped');
    expect(supervisor.get('b')?.status).toBe('stopped');
  });

  it('lists all servers without process objects', async () => {
    await supervisor.start('echo', testConfig);
    const list = supervisor.list();
    const entry = list.get('echo');
    expect(entry).toBeDefined();
    expect((entry as any).process).toBeUndefined();
    expect(entry?.status).toBe('running');
  });
});

describe('McpSupervisor: crash recovery', () => {
  it('emits restarting event on crash', async () => {
    const restartingCb = vi.fn();
    supervisor.on('restarting', restartingCb);

    await supervisor.start('echo', testConfig);
    const state = supervisor.get('echo')!;

    // Simulate crash
    state.process!.emit('exit', 1, null);

    expect(restartingCb).toHaveBeenCalledWith('echo', expect.any(Number), 1);
  });

  it('emits max-restarts after exceeding limit', async () => {
    const maxCb = vi.fn();
    supervisor.on('max-restarts', maxCb);

    await supervisor.start('echo', testConfig);
    const state = supervisor.get('echo')!;

    // Simulate 5 crashes (MAX_RESTARTS = 5)
    for (let i = 0; i < 5; i++) {
      state.restarts = i;
      state.status = 'running';
      state.process = mockChild() as any;
    }
    state.restarts = 5;
    state.process!.emit('exit', 1, null);

    expect(maxCb).toHaveBeenCalledWith('echo');
  });
});

describe('McpSupervisor: restart', () => {
  it('resets restart count on manual restart', async () => {
    await supervisor.start('echo', testConfig);
    const state = supervisor.get('echo')!;
    state.restarts = 3;
    await supervisor.restart('echo');
    expect(supervisor.get('echo')?.restarts).toBe(0);
  });

  it('throws on restart of unknown server', async () => {
    await expect(supervisor.restart('unknown')).rejects.toThrow(/Unknown MCP server/);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpToolBridge } from '../../../src/core/mcp/tool-bridge';
import { ToolRegistry } from '../../../src/core/agent/tool-registry';
import type { ToolContext } from '../../../src/core/agent/types';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

// Mock McpDiscovery
function mockDiscovery(tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; source: string }>) {
  return {
    discoverAll: vi.fn(),
    discoverServer: vi.fn().mockResolvedValue(tools),
    getAllTools: vi.fn().mockReturnValue(tools),
  } as any;
}

// Mock McpSupervisor with a fake stdio process
function mockSupervisor() {
  const emitter = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const states = new Map<string, { status: string; process: { stdin: PassThrough; stdout: PassThrough } }>();

  return {
    supervisor: {
      on: emitter.on.bind(emitter),
      get: (name: string) => states.get(name),
      _emit: emitter.emit.bind(emitter),
      _addServer: (name: string) => {
        const s = new PassThrough();
        const o = new PassThrough();
        states.set(name, { status: 'running', process: { stdin: s, stdout: o } });
        return { stdin: s, stdout: o };
      },
      _stopServer: (name: string) => {
        const state = states.get(name);
        if (state) state.status = 'stopped';
      },
    } as any,
    states,
  };
}

describe('McpToolBridge', () => {
  it('registers MCP tools into the agent registry on sync', async () => {
    const registry = new ToolRegistry();
    const tools = [
      { name: 'echo', description: 'Echo tool', inputSchema: { type: 'object' }, source: 'test-server' },
      { name: 'add', description: 'Add tool', inputSchema: { type: 'object' }, source: 'test-server' },
    ];
    const discovery = mockDiscovery(tools);
    const { supervisor } = mockSupervisor();
    const bridge = new McpToolBridge(registry, discovery, supervisor);

    await bridge.sync();

    const registered = registry.listForModel();
    expect(registered.map(t => t.name).sort()).toEqual(['test-server/add', 'test-server/echo']);
  });

  it('executes tool via JSON-RPC stdio and returns result', async () => {
    const registry = new ToolRegistry();
    const tools = [{ name: 'echo', description: 'Echo', inputSchema: {}, source: 'srv' }];
    const discovery = mockDiscovery(tools);
    const { supervisor } = mockSupervisor();
    const io = supervisor._addServer('srv');

    const bridge = new McpToolBridge(registry, discovery, supervisor);
    await bridge.sync();

    // Simulate server responding to JSON-RPC
    io.stdin.on('data', (chunk: Buffer) => {
      const req = JSON.parse(chunk.toString().trim());
      const response = { jsonrpc: '2.0', id: req.id, result: { content: [{ text: 'hello back' }] } };
      io.stdout.write(JSON.stringify(response) + '\n');
    });

    const ctx: ToolContext = { workspaceId: 'test', activeConnection: null };
    const result = await registry.execute('srv/echo', { message: 'hello' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toBe('hello back');
  });

  it('returns error when server is not running', async () => {
    const registry = new ToolRegistry();
    const tools = [{ name: 'echo', description: 'Echo', inputSchema: {}, source: 'srv' }];
    const discovery = mockDiscovery(tools);
    const { supervisor } = mockSupervisor();
    supervisor._addServer('srv');
    supervisor._stopServer('srv');

    const bridge = new McpToolBridge(registry, discovery, supervisor);
    await bridge.sync();

    const ctx: ToolContext = { workspaceId: 'test', activeConnection: null };
    const result = await registry.execute('srv/echo', { message: 'fail' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/not running/);
  });

  it('returns error content from JSON-RPC error response', async () => {
    const registry = new ToolRegistry();
    const tools = [{ name: 'bad', description: 'Bad', inputSchema: {}, source: 'srv' }];
    const discovery = mockDiscovery(tools);
    const { supervisor } = mockSupervisor();
    const io = supervisor._addServer('srv');

    const bridge = new McpToolBridge(registry, discovery, supervisor);
    await bridge.sync();

    io.stdin.on('data', (chunk: Buffer) => {
      const req = JSON.parse(chunk.toString().trim());
      io.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -1, message: 'tool failed' } }) + '\n');
    });

    const ctx: ToolContext = { workspaceId: 'test', activeConnection: null };
    const result = await registry.execute('srv/bad', {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toBe('tool failed');
  });

  it('handles abort signal cancellation', async () => {
    const registry = new ToolRegistry();
    const tools = [{ name: 'slow', description: 'Slow', inputSchema: {}, source: 'srv' }];
    const discovery = mockDiscovery(tools);
    const { supervisor } = mockSupervisor();
    supervisor._addServer('srv');
    // Don't respond — let abort cancel it

    const bridge = new McpToolBridge(registry, discovery, supervisor);
    await bridge.sync();

    const controller = new AbortController();
    const ctx: ToolContext = { workspaceId: 'test', activeConnection: null, signal: controller.signal };

    const promise = registry.execute('srv/slow', {}, ctx);
    setTimeout(() => controller.abort(), 50);
    const result = await promise;
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/Cancelled/i);
  });

  it('prunes tools when server dies', async () => {
    const registry = new ToolRegistry();
    const tools = [{ name: 'echo', description: 'Echo', inputSchema: {}, source: 'srv' }];
    const discovery = mockDiscovery(tools);
    const { supervisor } = mockSupervisor();
    supervisor._addServer('srv');

    const bridge = new McpToolBridge(registry, discovery, supervisor);
    await bridge.sync();
    expect(registry.listForModel().length).toBe(1);

    supervisor._stopServer('srv');
    bridge['pruneDeadTools']();
    expect(registry.listForModel().length).toBe(0);
  });
});

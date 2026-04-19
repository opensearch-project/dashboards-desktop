import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { McpDiscovery } from '../../../src/core/mcp/discovery';
import type { McpSupervisor, ServerState } from '../../../src/core/mcp/supervisor';

function mockSupervisor(servers: Record<string, Partial<ServerState>> = {}): McpSupervisor {
  const map = new Map<string, Omit<ServerState, 'process'>>();
  const fullMap = new Map<string, ServerState>();

  for (const [name, s] of Object.entries(servers)) {
    const state: ServerState = {
      config: { command: 'node', args: [] },
      process: s.process ?? null,
      status: (s.status as any) ?? 'running',
      restarts: 0,
      lastCrash: null,
      memoryMB: 0,
    };
    fullMap.set(name, state);
    const { process: _p, ...rest } = state;
    map.set(name, rest);
  }

  return {
    list: vi.fn(() => map),
    get: vi.fn((name: string) => fullMap.get(name)),
  } as unknown as McpSupervisor;
}

function mockProcess(toolsResponse: unknown) {
  const stdout = new EventEmitter();
  const stdin = {
    write: vi.fn((data: string) => {
      const req = JSON.parse(data);
      // Respond to tools/list
      if (req.method === 'tools/list' || req.method === 'initialize') {
        setTimeout(() => {
          stdout.emit('data', Buffer.from(
            JSON.stringify({ jsonrpc: '2.0', id: req.id, result: toolsResponse }) + '\n'
          ));
        }, 1);
      }
    }),
  };
  return { stdin, stdout, stderr: new EventEmitter(), pid: 999, exitCode: null };
}

describe('McpDiscovery: built-in tools', () => {
  it('registers and returns built-in tools', () => {
    const sup = mockSupervisor();
    const disc = new McpDiscovery(sup);
    disc.registerBuiltinTools([
      { name: 'cluster-health', description: 'Health check', inputSchema: {}, source: 'builtin' },
    ]);
    const tools = disc.getAllTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].source).toBe('builtin');
  });
});

describe('McpDiscovery: server discovery', () => {
  it('discovers tools from a running MCP server', async () => {
    const proc = mockProcess({
      tools: [
        { name: 'echo', description: 'Echo input', inputSchema: { type: 'object' } },
      ],
    });
    const sup = mockSupervisor({ echo: { status: 'running', process: proc as any } });
    const disc = new McpDiscovery(sup);

    const tools = await disc.discoverServer('echo');
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('echo');
    expect(tools[0].source).toBe('echo');
  });

  it('merges MCP tools with built-in tools', async () => {
    const proc = mockProcess({
      tools: [{ name: 'github/repos', description: 'List repos', inputSchema: {} }],
    });
    const sup = mockSupervisor({ github: { status: 'running', process: proc as any } });
    const disc = new McpDiscovery(sup);
    disc.registerBuiltinTools([
      { name: 'cluster-health', description: 'Health', inputSchema: {}, source: 'builtin' },
    ]);

    await disc.discoverServer('github');
    const all = disc.getAllTools();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.name).sort()).toEqual(['cluster-health', 'github/repos']);
  });

  it('returns empty for stopped server', async () => {
    const sup = mockSupervisor({ echo: { status: 'stopped' } });
    const disc = new McpDiscovery(sup);
    const tools = await disc.discoverServer('echo');
    expect(tools).toHaveLength(0);
  });

  it('handles server crash during discovery gracefully', async () => {
    const proc = {
      stdin: { write: vi.fn(() => { /* never respond */ }) },
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      pid: 999,
      exitCode: null,
    };
    const sup = mockSupervisor({ broken: { status: 'running', process: proc as any } });
    const disc = new McpDiscovery(sup);

    // Discovery should timeout and return empty, not throw
    const tools = await disc.discoverServer('broken');
    expect(tools).toHaveLength(0);
  }, 15000);
});

describe('McpDiscovery: getTool', () => {
  it('finds a tool by name across all sources', async () => {
    const proc = mockProcess({
      tools: [{ name: 'echo', description: 'Echo', inputSchema: {} }],
    });
    const sup = mockSupervisor({ echo: { status: 'running', process: proc as any } });
    const disc = new McpDiscovery(sup);
    disc.registerBuiltinTools([
      { name: 'cluster-health', description: 'Health', inputSchema: {}, source: 'builtin' },
    ]);
    await disc.discoverServer('echo');

    expect(disc.getTool('cluster-health')?.source).toBe('builtin');
    expect(disc.getTool('echo')?.source).toBe('echo');
    expect(disc.getTool('nonexistent')).toBeUndefined();
  });
});

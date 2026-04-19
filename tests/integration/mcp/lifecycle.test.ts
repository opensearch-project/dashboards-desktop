import { describe, it, expect, afterAll } from 'vitest';
import { McpSupervisor } from '../../../src/core/mcp/supervisor';
import { McpDiscovery } from '../../../src/core/mcp/discovery';
import * as path from 'path';

const ECHO_SERVER = path.resolve(__dirname, '../../fixtures/mcp/echo-server.ts');

describe('MCP integration: supervisor + discovery + echo server', () => {
  const supervisor = new McpSupervisor();
  const discovery = new McpDiscovery(supervisor);

  afterAll(async () => {
    await supervisor.shutdownAll();
  });

  it('spawns echo server and discovers tools', async () => {
    await supervisor.start('echo', {
      command: 'npx',
      args: ['tsx', ECHO_SERVER],
    });

    const state = supervisor.get('echo');
    expect(state?.status).toBe('running');

    // Give server a moment to initialize
    await new Promise((r) => setTimeout(r, 1000));

    const tools = await discovery.discoverServer('echo');
    expect(tools.length).toBe(2);
    expect(tools.map((t) => t.name).sort()).toEqual(['add', 'echo']);
  }, 15000);

  it('merges MCP tools into unified registry', async () => {
    discovery.registerBuiltinTools([
      { name: 'builtin-test', description: 'test', inputSchema: {}, source: 'builtin' },
    ]);

    const all = discovery.getAllTools();
    expect(all.length).toBe(3); // 1 builtin + 2 MCP
    expect(all.find((t) => t.source === 'builtin')).toBeDefined();
    expect(all.find((t) => t.source === 'echo')).toBeDefined();
  });

  it('finds tool by name across sources', () => {
    expect(discovery.getTool('echo')).toBeDefined();
    expect(discovery.getTool('add')).toBeDefined();
    expect(discovery.getTool('builtin-test')).toBeDefined();
    expect(discovery.getTool('nonexistent')).toBeUndefined();
  });

  it('gracefully handles server stop', async () => {
    await supervisor.stop('echo');
    const state = supervisor.get('echo');
    expect(state?.status).toBe('stopped');
  });
});

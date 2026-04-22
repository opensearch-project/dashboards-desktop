import { describe, it, expect, afterAll } from 'vitest';
import { McpSupervisor } from '../../../src/core/mcp/supervisor';
import { McpDiscovery } from '../../../src/core/mcp/discovery';
import { McpToolBridge } from '../../../src/core/mcp/tool-bridge';
import { ToolRegistry } from '../../../src/core/agent/tool-registry';
import type { ToolContext } from '../../../src/core/agent/types';
import * as path from 'path';

const ECHO_SERVER = path.resolve(__dirname, '../../fixtures/mcp/echo-server.cjs');

describe('MCP tool bridge integration: real echo server', () => {
  const supervisor = new McpSupervisor();
  const discovery = new McpDiscovery(supervisor);
  const registry = new ToolRegistry();
  const bridge = new McpToolBridge(registry, discovery, supervisor);
  const ctx: ToolContext = { workspaceId: 'test', activeConnection: null, signal: new AbortController().signal };

  afterAll(async () => {
    await supervisor.shutdownAll();
  });

  it('spawns echo server, syncs tools into registry', async () => {
    await supervisor.start('echo', { command: 'node', args: [ECHO_SERVER] });
    await new Promise((r) => setTimeout(r, 1500));
    await bridge.sync();

    const tools = registry.listForModel().filter((t) => t.name.startsWith('echo/'));
    expect(tools.length).toBe(2);
    expect(tools.map((t) => t.name).sort()).toEqual(['echo/add', 'echo/echo']);
  }, 15000);

  it('executes echo tool end-to-end via JSON-RPC', async () => {
    const result = await registry.execute('echo/echo', { message: 'hello from integration test' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toBe('hello from integration test');
  }, 10000);

  it('executes add tool end-to-end via JSON-RPC', async () => {
    const result = await registry.execute('echo/add', { a: 100, b: 42 }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toBe('142');
  }, 10000);

  it('handles unknown tool gracefully', async () => {
    const result = await registry.execute('echo/nonexistent', {}, ctx);
    expect(result.isError).toBe(true);
  }, 10000);

  it('returns error after server stops', async () => {
    await supervisor.stop('echo');
    const result = await registry.execute('echo/echo', { message: 'should fail' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/not running/);
  }, 10000);

  it('prunes dead tools from registry', () => {
    bridge['pruneDeadTools']();
    const tools = registry.listForModel().filter((t) => t.name.startsWith('echo/'));
    expect(tools.length).toBe(0);
  });
});

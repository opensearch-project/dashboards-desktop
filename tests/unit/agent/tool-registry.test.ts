import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../../../src/core/agent/tool-registry';
import type { AgentTool, ToolDefinition, ToolResult, ToolContext } from '../../../src/core/agent/types';

function makeTool(name: string, opts: Partial<ToolDefinition> = {}): AgentTool {
  return {
    definition: {
      name,
      description: `${name} tool`,
      source: 'builtin',
      inputSchema: { type: 'object' },
      requiresApproval: false,
      ...opts,
    },
    execute: vi.fn(async () => ({ content: `${name} result`, isError: false })),
  };
}

const ctx: ToolContext = {
  workspaceId: 'ws-1',
  activeConnection: null,
  signal: new AbortController().signal,
};

describe('ToolRegistry: register/lookup', () => {
  it('registers and retrieves a tool', () => {
    const reg = new ToolRegistry();
    const tool = makeTool('cluster-health');
    reg.register(tool);
    expect(reg.get('cluster-health')).toBe(tool);
  });

  it('lists all registered tools', () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('opensearch-query'));
    reg.register(makeTool('cluster-health'));
    const defs = reg.list();
    expect(defs).toHaveLength(2);
    expect(defs.map((d) => d.name).sort()).toEqual(['cluster-health', 'opensearch-query']);
  });

  it('unregisters a tool', () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('temp'));
    reg.unregister('temp');
    expect(reg.get('temp')).toBeUndefined();
  });

  it('returns undefined for unknown tool', () => {
    const reg = new ToolRegistry();
    expect(reg.get('nonexistent')).toBeUndefined();
  });
});

describe('ToolRegistry: dispatch', () => {
  it('executes the correct tool handler', async () => {
    const reg = new ToolRegistry();
    const tool = makeTool('opensearch-query');
    reg.register(tool);
    const result = await reg.execute('opensearch-query', { index: 'logs-*' }, ctx);
    expect(result.content).toBe('opensearch-query result');
    expect(result.isError).toBe(false);
    expect(tool.execute).toHaveBeenCalledWith({ index: 'logs-*' }, ctx);
  });

  it('returns error for unknown tool', async () => {
    const reg = new ToolRegistry();
    const result = await reg.execute('missing', {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/Tool not found/);
  });

  it('catches tool execution errors', async () => {
    const reg = new ToolRegistry();
    const tool = makeTool('failing');
    (tool.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    reg.register(tool);
    const result = await reg.execute('failing', {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/boom/);
  });

  it('enforces timeout', async () => {
    const reg = new ToolRegistry();
    const tool = makeTool('slow');
    (tool.execute as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ content: 'late', isError: false }), 5000))
    );
    reg.register(tool);
    const result = await reg.execute('slow', {}, ctx, 50);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/timed out/);
  });

  it('truncates large output', async () => {
    const reg = new ToolRegistry();
    const tool = makeTool('big');
    const bigOutput = 'x'.repeat(200 * 1024);
    (tool.execute as ReturnType<typeof vi.fn>).mockResolvedValue({ content: bigOutput, isError: false });
    reg.register(tool);
    const result = await reg.execute('big', {}, ctx);
    expect(result.content.length).toBeLessThan(bigOutput.length);
    expect(result.content).toContain('[truncated]');
  });
});

describe('ToolRegistry: MCP tool merge', () => {
  it('registers MCP tools alongside built-in tools', () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('cluster-health'));
    reg.register(makeTool('github/list-repos', { source: 'mcp', mcpServer: 'github' }));
    const defs = reg.list();
    expect(defs).toHaveLength(2);
    expect(defs.find((d) => d.source === 'mcp')?.name).toBe('github/list-repos');
  });

  it('unregistering MCP tools leaves built-ins intact', () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('cluster-health'));
    reg.register(makeTool('github/list-repos', { source: 'mcp' }));
    reg.unregister('github/list-repos');
    expect(reg.list()).toHaveLength(1);
    expect(reg.list()[0].name).toBe('cluster-health');
  });
});

describe('ToolRegistry: trust levels', () => {
  it('defaults to auto for non-approval built-in tools', () => {
    const reg = new ToolRegistry();
    const tool = makeTool('cluster-health', { requiresApproval: false, source: 'builtin' });
    expect(reg.getTrust(tool.definition)).toBe('auto');
  });

  it('defaults to ask for MCP tools', () => {
    const reg = new ToolRegistry();
    const tool = makeTool('github/query', { source: 'mcp', requiresApproval: false });
    expect(reg.getTrust(tool.definition)).toBe('ask');
  });

  it('defaults to ask for approval-required tools', () => {
    const reg = new ToolRegistry();
    const tool = makeTool('index-manage', { requiresApproval: true });
    expect(reg.getTrust(tool.definition)).toBe('ask');
  });

  it('respects trust overrides', () => {
    const reg = new ToolRegistry();
    const tool = makeTool('github/query', { source: 'mcp' });
    reg.setTrust('github/query', 'notify');
    expect(reg.getTrust(tool.definition)).toBe('notify');
  });
});

describe('ToolRegistry: change notifications', () => {
  it('fires onChanged when tools are registered', () => {
    const reg = new ToolRegistry();
    const cb = vi.fn();
    reg.onChanged(cb);
    reg.register(makeTool('test'));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toHaveLength(1);
  });

  it('fires onChanged when tools are unregistered', () => {
    const reg = new ToolRegistry();
    const cb = vi.fn();
    reg.register(makeTool('test'));
    reg.onChanged(cb);
    reg.unregister('test');
    expect(cb).toHaveBeenCalledWith([]);
  });
});

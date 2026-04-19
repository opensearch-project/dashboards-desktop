import { describe, it, expect, vi } from 'vitest';

const mockSearch = vi.fn();
vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({ search: mockSearch })),
}));

import { opensearchQueryTool } from '../../../src/core/agent/tools/opensearch-query';
import { ToolRegistry } from '../../../src/core/agent/tool-registry';
import type { AgentTool, ToolContext } from '../../../src/core/agent/types';

const ctx: ToolContext = {
  workspaceId: 'ws-1',
  activeConnection: { id: 'c1', url: 'http://localhost:9200', type: 'opensearch', auth_type: 'none' },
  signal: new AbortController().signal,
};

describe('opensearch-query tool', () => {
  it('has correct definition', () => {
    expect(opensearchQueryTool.definition.name).toBe('opensearch-query');
    expect(opensearchQueryTool.definition.source).toBe('builtin');
    expect(opensearchQueryTool.definition.requiresApproval).toBe(false);
    expect(opensearchQueryTool.definition.inputSchema).toHaveProperty('required');
  });

  it('returns error when no active connection', async () => {
    const result = await opensearchQueryTool.execute(
      { index: 'logs-*', body: {} },
      { ...ctx, activeConnection: null }
    );
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/No active/);
  });

  it('returns error when connection is not opensearch', async () => {
    const result = await opensearchQueryTool.execute(
      { index: 'logs-*', body: {} },
      { ...ctx, activeConnection: { ...ctx.activeConnection!, type: 'elasticsearch' } }
    );
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/not OpenSearch/);
  });

  it('executes query and returns JSON result', async () => {
    mockSearch.mockResolvedValue({ body: { hits: { total: { value: 42 }, hits: [] } } });
    const result = await opensearchQueryTool.execute(
      { index: 'logs-*', body: { query: { match_all: {} } } },
      ctx
    );
    expect(result.isError).toBe(false);
    expect(result.content).toContain('42');
  });

  it('returns error on query failure', async () => {
    mockSearch.mockRejectedValue(new Error('index_not_found'));
    const result = await opensearchQueryTool.execute(
      { index: 'bad', body: {} },
      ctx
    );
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/index_not_found/);
  });
});

describe('Admin tool trust levels', () => {
  it('read-only tools default to auto trust', () => {
    const reg = new ToolRegistry();
    reg.register(opensearchQueryTool);
    expect(reg.getTrust(opensearchQueryTool.definition)).toBe('auto');
  });

  it('destructive tools require ask trust', () => {
    const reg = new ToolRegistry();
    const deleteTool: AgentTool = {
      definition: {
        name: 'index-manage',
        description: 'Manage indices',
        source: 'builtin',
        inputSchema: {},
        requiresApproval: true,
      },
      execute: vi.fn(async () => ({ content: 'done', isError: false })),
    };
    reg.register(deleteTool);
    expect(reg.getTrust(deleteTool.definition)).toBe('ask');
  });
});

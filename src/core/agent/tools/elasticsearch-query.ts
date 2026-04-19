/**
 * elasticsearch-query — run read queries against the active Elasticsearch connection.
 */

import { Client } from '@elastic/elasticsearch';
import type { AgentTool, ToolContext, ToolResult } from '../types';

export const elasticsearchQueryTool: AgentTool = {
  definition: {
    name: 'elasticsearch-query',
    description:
      'Run a query against the active Elasticsearch connection. Supports full query DSL.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'string', description: 'Index name or pattern (e.g. "logs-*")' },
        body: { type: 'object', description: 'Elasticsearch query DSL body' },
      },
      required: ['index', 'body'],
    },
    requiresApproval: false,
  },

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    if (!context.activeConnection) {
      return { content: 'No active Elasticsearch connection. Add one in Settings.', isError: true };
    }
    const conn = context.activeConnection;
    if (conn.type !== 'elasticsearch') {
      return { content: `Active connection "${conn.url}" is not Elasticsearch.`, isError: true };
    }

    try {
      const clientOpts: Record<string, unknown> = { node: conn.url };
      if (conn.auth_type === 'basic' && conn.username) {
        clientOpts.auth = { username: conn.username, password: conn.password ?? '' };
      }
      const client = new Client(clientOpts as ConstructorParameters<typeof Client>[0]);
      const res = await client.search({
        index: input.index as string,
        ...(input.body as Record<string, unknown>),
      });
      return { content: JSON.stringify(res, null, 2), isError: false };
    } catch (err: unknown) {
      return {
        content: `Query failed: ${err instanceof Error ? err.message : err}`,
        isError: true,
      };
    }
  },
};

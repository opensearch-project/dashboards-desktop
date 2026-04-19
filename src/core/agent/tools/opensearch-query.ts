/**
 * opensearch-query — run read queries against the active OpenSearch connection.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolContext, ToolResult } from '../types';

export const opensearchQueryTool: AgentTool = {
  definition: {
    name: 'opensearch-query',
    description: 'Run a query against the active OpenSearch connection. Supports full query DSL.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'string', description: 'Index name or pattern (e.g. "logs-*")' },
        body: { type: 'object', description: 'OpenSearch query DSL body' },
      },
      required: ['index', 'body'],
    },
    requiresApproval: false,
  },

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    if (!context.activeConnection) {
      return { content: 'No active OpenSearch connection. Add one in Settings.', isError: true };
    }
    const conn = context.activeConnection;
    if (conn.type !== 'opensearch') {
      return { content: `Active connection "${conn.url}" is not OpenSearch.`, isError: true };
    }

    try {
      const client = new Client({ node: conn.url } as ConstructorParameters<typeof Client>[0]);
      const res = await client.search({
        index: input.index as string,
        body: input.body as Record<string, unknown>,
      } as Record<string, unknown>);
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err: unknown) {
      return {
        content: `Query failed: ${err instanceof Error ? err.message : err}`,
        isError: true,
      };
    }
  },
};

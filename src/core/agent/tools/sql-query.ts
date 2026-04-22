/**
 * sql-query — execute SQL via OpenSearch SQL plugin, return formatted results.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const sqlQueryTool: AgentTool = {
  definition: {
    name: 'sql-query',
    description: 'Execute SQL queries via the OpenSearch SQL plugin. Returns tabular results.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query string' },
        format: { type: 'string', enum: ['json', 'csv', 'raw'], description: 'Output format (default json)' },
      },
      required: ['query'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const res = await client.transport.request({ method: 'POST', path: '/_plugins/_sql', body: { query: input.query } });
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err) { return { content: `SQL failed: ${(err as Error).message}`, isError: true }; }
  },
};

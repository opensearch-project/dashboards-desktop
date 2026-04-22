/**
 * query-profiler — run query with profile=true, show shard-level timing.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const queryProfilerTool: AgentTool = {
  definition: {
    name: 'query-profiler',
    description: 'Run a query with profiling enabled. Returns shard-level timing breakdown.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'string', description: 'Index name or pattern' },
        body: { type: 'object', description: 'Query DSL body (profile:true added automatically)' },
      },
      required: ['index', 'body'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      const body = { ...(input.body as Record<string, unknown>), profile: true };
      const res = await client.search({ index: input.index as string, body });
      return { content: JSON.stringify(res.body.profile, null, 2), isError: false };
    } catch (err) { return { content: `Profile failed: ${(err as Error).message}`, isError: true }; }
  },
};

/**
 * Query profiler — run queries with ?profile=true, return shard timing breakdown.
 */
import type { AgentTool, ToolResult, ToolContext } from '../types';

export const queryProfilerTool: AgentTool = {
  definition: {
    name: 'query-profiler',
    description: 'Profile an OpenSearch/Elasticsearch query. Returns per-shard timing breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'string', description: 'Index to query' },
        query: { type: 'object', description: 'Query DSL body' },
      },
      required: ['index', 'query'],
    },
    requiresApproval: false,
  },
  execute: async (input, context): Promise<ToolResult> => {
    const conn = context.activeConnection;
    if (!conn) return { content: 'No active connection', isError: true };
    try {
      const url = `${conn.url}/${encodeURIComponent(input.index as string)}/_search?profile=true`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.query),
        signal: context.signal,
      });
      const data = await res.json();
      const profile = (data as Record<string, unknown>).profile;
      return { content: JSON.stringify(profile, null, 2), isError: false };
    } catch (err) {
      return { content: `Profile failed: ${err instanceof Error ? err.message : err}`, isError: true };
    }
  },
};

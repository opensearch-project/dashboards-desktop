/**
 * cat-api — expose _cat/nodes, _cat/indices, _cat/shards as formatted tables.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const catApiTool: AgentTool = {
  definition: {
    name: 'cat-api',
    description: 'Query OpenSearch _cat APIs for human-readable cluster info: nodes, indices, shards, health, allocation, recovery.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', enum: ['nodes', 'indices', 'shards', 'health', 'allocation', 'recovery', 'segments', 'count'], description: 'Cat endpoint' },
        index: { type: 'string', description: 'Optional index filter' },
        sort: { type: 'string', description: 'Sort column (e.g. "store.size:desc")' },
      },
      required: ['endpoint'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const ep = input.endpoint as string;
    const params: Record<string, unknown> = { v: true, format: 'text' };
    if (input.index) params.index = input.index;
    if (input.sort) params.s = input.sort;
    try {
      const cat = client.cat as Record<string, (...args: unknown[]) => unknown>;
      if (!cat[ep]) return { content: `Unknown cat endpoint: ${ep}`, isError: true };
      const res = await cat[ep](params) as { body: string };
      return { content: res.body as string, isError: false };
    } catch (err) { return { content: `Cat ${ep} failed: ${(err as Error).message}`, isError: true }; }
  },
};

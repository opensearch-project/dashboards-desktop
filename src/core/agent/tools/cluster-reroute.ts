/**
 * cluster-reroute — move/cancel/allocate shards.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const clusterRerouteTool: AgentTool = {
  definition: {
    name: 'cluster-reroute',
    description: 'Reroute shards: move a shard to another node, cancel a relocation, or allocate an unassigned shard.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        commands: { type: 'array', description: 'Array of reroute commands (move/cancel/allocate_replica/allocate_stale_primary)' },
      },
      required: ['commands'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      const res = await client.cluster.reroute({ body: { commands: input.commands } });
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err) { return { content: `Reroute failed: ${(err as Error).message}`, isError: true }; }
  },
};

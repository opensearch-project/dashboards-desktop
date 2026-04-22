/**
 * index-rollover — rollover index based on size/age/doc count.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const indexRolloverTool: AgentTool = {
  definition: {
    name: 'index-rollover',
    description: 'Rollover an index alias to a new index when conditions are met (max_size, max_age, max_docs).',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        alias: { type: 'string', description: 'Alias to rollover' },
        conditions: { type: 'object', description: 'Rollover conditions: { max_size, max_age, max_docs }' },
        dry_run: { type: 'boolean', description: 'If true, check conditions without rolling over' },
      },
      required: ['alias'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      const body: Record<string, unknown> = {};
      if (input.conditions) body.conditions = input.conditions;
      const res = await client.indices.rollover({ alias: input.alias as string, body, dry_run: input.dry_run as boolean });
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err) { return { content: `Rollover failed: ${(err as Error).message}`, isError: true }; }
  },
};

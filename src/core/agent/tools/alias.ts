/**
 * alias — create/delete/list/swap index aliases.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const aliasTool: AgentTool = {
  definition: {
    name: 'alias',
    description: 'Manage index aliases: list all, create, delete, or swap an alias between indices.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'delete', 'swap'], description: 'Action' },
        alias: { type: 'string', description: 'Alias name' },
        index: { type: 'string', description: 'Index name (for create/delete)' },
        old_index: { type: 'string', description: 'Old index (for swap)' },
        new_index: { type: 'string', description: 'New index (for swap)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const alias = input.alias as string;
    try {
      switch (input.action) {
        case 'list': return { content: JSON.stringify((await client.cat.aliases({ v: true, format: 'json' })).body, null, 2), isError: false };
        case 'create':
          await client.indices.putAlias({ index: input.index as string, name: alias });
          return { content: `Alias "${alias}" → "${input.index}" created`, isError: false };
        case 'delete':
          await client.indices.deleteAlias({ index: input.index as string, name: alias });
          return { content: `Alias "${alias}" removed from "${input.index}"`, isError: false };
        case 'swap':
          await client.indices.updateAliases({ body: { actions: [
            { remove: { index: input.old_index as string, alias } },
            { add: { index: input.new_index as string, alias } },
          ]}});
          return { content: `Alias "${alias}" swapped: "${input.old_index}" → "${input.new_index}"`, isError: false };
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `Alias ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

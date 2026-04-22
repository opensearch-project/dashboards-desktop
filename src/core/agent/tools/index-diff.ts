/**
 * index-diff — compare mappings/settings between two indices.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const indexDiffTool: AgentTool = {
  definition: {
    name: 'index-diff',
    description: 'Compare mappings and settings between two indices. Can be on the same or different clusters.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        index_a: { type: 'string', description: 'First index name' },
        cluster_a: { type: 'string', description: 'First cluster URL (uses active connection if omitted)' },
        index_b: { type: 'string', description: 'Second index name' },
        cluster_b: { type: 'string', description: 'Second cluster URL (same as cluster_a if omitted)' },
      },
      required: ['index_a', 'index_b'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    const urlA = (input.cluster_a as string) || context.activeConnection?.url;
    const urlB = (input.cluster_b as string) || urlA;
    if (!urlA) return { content: 'No cluster URL provided', isError: true };
    try {
      const clientA = new Client({ node: urlA });
      const clientB = urlA === urlB ? clientA : new Client({ node: urlB });
      const [a, b] = await Promise.all([
        clientA.indices.get({ index: input.index_a as string }),
        clientB.indices.get({ index: input.index_b as string }),
      ]);
      const infoA = Object.values(a.body)[0] as Record<string, unknown>;
      const infoB = Object.values(b.body)[0] as Record<string, unknown>;
      const diff = {
        mappings: { a: infoA.mappings, b: infoB.mappings, match: JSON.stringify(infoA.mappings) === JSON.stringify(infoB.mappings) },
        settings: { a: infoA.settings, b: infoB.settings, match: JSON.stringify(infoA.settings) === JSON.stringify(infoB.settings) },
      };
      return { content: JSON.stringify(diff, null, 2), isError: false };
    } catch (err) {
      return { content: `Diff failed: ${(err as Error).message}`, isError: true };
    }
  },
};

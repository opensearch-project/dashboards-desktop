/**
 * bulk-index-ops — reindex, close, open, or delete multiple indices at once.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const bulkIndexOpsTool: AgentTool = {
  definition: {
    name: 'bulk-index-ops',
    description: 'Perform bulk operations on multiple indices: reindex, close, open, delete, or freeze.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['close', 'open', 'delete', 'reindex'], description: 'Operation to perform' },
        indices: { type: 'array', items: { type: 'string' }, description: 'List of index names' },
        reindex_dest: { type: 'string', description: 'Destination index (required for reindex)' },
      },
      required: ['action', 'indices'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const indices = input.indices as string[];
    const results: Record<string, string> = {};
    for (const idx of indices) {
      try {
        switch (input.action) {
          case 'close': await client.indices.close({ index: idx }); break;
          case 'open': await client.indices.open({ index: idx }); break;
          case 'delete': await client.indices.delete({ index: idx }); break;
          case 'reindex':
            await client.reindex({ body: { source: { index: idx }, dest: { index: input.reindex_dest as string } } });
            break;
        }
        results[idx] = 'ok';
      } catch (err) {
        results[idx] = (err as Error).message;
      }
    }
    return { content: JSON.stringify({ action: input.action, results }, null, 2), isError: false };
  },
};

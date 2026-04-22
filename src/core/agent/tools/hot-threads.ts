/**
 * hot-threads — capture node hot threads for debugging.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const hotThreadsTool: AgentTool = {
  definition: {
    name: 'hot-threads',
    description: 'Capture hot threads from cluster nodes. Useful for diagnosing CPU-heavy operations.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        threads: { type: 'number', description: 'Number of hot threads per node (default 3)' },
        type: { type: 'string', enum: ['cpu', 'wait', 'block'], description: 'Thread type (default cpu)' },
      },
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const res = await client.nodes.hotThreads({ threads: (input.threads as number) || 3, type: (input.type as string) || 'cpu' } as Record<string, unknown>);
      return { content: String(res.body), isError: false };
    } catch (err) { return { content: `Hot threads failed: ${(err as Error).message}`, isError: true }; }
  },
};

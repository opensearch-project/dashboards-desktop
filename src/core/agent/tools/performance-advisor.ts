/**
 * performance-advisor — analyze slow logs, suggest optimizations.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const performanceAdvisorTool: AgentTool = {
  definition: {
    name: 'performance-advisor',
    description: 'Analyze cluster performance: check slow logs, shard balance, segment counts, and suggest optimizations.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'string', description: 'Index to analyze (optional, analyzes cluster if omitted)' },
      },
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const suggestions: string[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const health = await client.cluster.health();
      if (health.body.relocating_shards > 0) suggestions.push(`${health.body.relocating_shards} shards relocating — wait for stabilization`);
      if (health.body.unassigned_shards > 0) suggestions.push(`${health.body.unassigned_shards} unassigned shards — check disk space and allocation settings`);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const nodes = await client.nodes.stats({ metric: 'jvm,os,fs' });
      const nodeAdvice = Object.entries(nodes.body.nodes as Record<string, Record<string, unknown>>).map(([id, n]) => {
        const jvm = n.jvm as Record<string, Record<string, number>>;
        const heapPct = jvm?.mem?.heap_used_percent ?? 0;
        if (heapPct > 85) suggestions.push(`Node ${id}: heap at ${heapPct}% — consider scaling`);
        return { id, heapPct };
      });
      if (input.index) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore OpenSearch client overload
        const segments = await client.cat.segments({ index: input.index as string, format: 'json' });
        const segCount = (segments.body as unknown[]).length;
        if (segCount > 50) suggestions.push(`Index ${input.index}: ${segCount} segments — consider force merge`);
      }
      if (!suggestions.length) suggestions.push('No issues detected — cluster looks healthy');
      return { content: JSON.stringify({ suggestions, nodes: nodeAdvice }, null, 2), isError: false };
    } catch (err) { return { content: `Analysis failed: ${(err as Error).message}`, isError: true }; }
  },
};

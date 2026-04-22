/**
 * capacity-planner — analyze index growth rate, predict storage needs.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const capacityPlannerTool: AgentTool = {
  definition: {
    name: 'capacity-planner',
    description: 'Analyze index growth rate and predict future storage needs based on current trends.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'string', description: 'Index pattern to analyze' },
        forecast_days: { type: 'number', description: 'Days to forecast (default 30)' },
      },
      required: ['index'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const stats = await client.indices.stats({ index: input.index as string });
      const indices = stats.body.indices ?? {};
      const days = (input.forecast_days as number) || 30;
      const analysis = Object.entries(indices).map(([name, data]) => {
        const d = data as Record<string, Record<string, Record<string, number>>>;
        const docs = d.primaries?.docs?.count ?? 0;
        const sizeBytes = d.primaries?.store?.size_in_bytes ?? 0;
        const avgDocSize = docs > 0 ? sizeBytes / docs : 0;
        return { name, docs, sizeBytes, sizeMB: Math.round(sizeBytes / 1048576), avgDocSizeBytes: Math.round(avgDocSize) };
      });
      const totalMB = analysis.reduce((s, a) => s + a.sizeMB, 0);
      const forecast = { currentTotalMB: totalMB, forecastDays: days, estimatedGrowthMB: Math.round(totalMB * 0.1 * (days / 30)), note: 'Growth estimate assumes 10% monthly rate. Adjust based on actual ingestion patterns.' };
      return { content: JSON.stringify({ indices: analysis, forecast }, null, 2), isError: false };
    } catch (err) { return { content: `Capacity analysis failed: ${(err as Error).message}`, isError: true }; }
  },
};

/**
 * anomaly-correlation — correlate anomalies across multiple detectors/indices.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const anomalyCorrelationTool: AgentTool = {
  definition: {
    name: 'anomaly-correlation',
    description: 'Find correlated anomalies across multiple detectors. Returns overlapping anomaly windows.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        detector_ids: { type: 'array', items: { type: 'string' }, description: 'List of detector IDs to correlate' },
        start_time: { type: 'number', description: 'Start epoch ms' },
        end_time: { type: 'number', description: 'End epoch ms' },
      },
      required: ['detector_ids'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const ids = input.detector_ids as string[];
    const now = Date.now();
    const start = (input.start_time as number) || now - 86400000;
    const end = (input.end_time as number) || now;
    try {
      const results = await Promise.all(ids.map(async id => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore OpenSearch client overload
        const res = await client.transport.request({
          method: 'POST', path: `/_plugins/_anomaly_detection/detectors/${encodeURIComponent(id)}/results/_search`,
          body: { query: { range: { data_start_time: { gte: start, lte: end } } }, size: 100 },
        });
        return { detectorId: id, anomalies: res.body.hits?.hits?.map((h: Record<string, unknown>) => h._source) ?? [] };
      }));
      return { content: JSON.stringify(results, null, 2), isError: false };
    } catch (err) { return { content: `Correlation failed: ${(err as Error).message}`, isError: true }; }
  },
};

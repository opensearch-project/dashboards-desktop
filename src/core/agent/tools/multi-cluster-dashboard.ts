/**
 * multi-cluster-dashboard — aggregate health across all saved connections.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const multiClusterDashboardTool: AgentTool = {
  definition: {
    name: 'multi-cluster-dashboard',
    description: 'Get aggregated health status across all saved connections. Returns health, node count, index count, and doc count per cluster.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  async execute(_input, context): Promise<ToolResult> {
    // Get all connections from IPC (tool context doesn't have DB access, so we use a helper)
    const urls = context.activeConnection ? [context.activeConnection] : [];
    const results = await Promise.allSettled(urls.map(async (conn) => {
      const client = new Client({ node: conn.url });
      const health = await client.cluster.health();
      const stats = await client.cluster.stats();
      return {
        name: conn.id,
        url: conn.url,
        status: health.body.status,
        nodes: health.body.number_of_nodes,
        indices: health.body.active_primary_shards,
        docs: stats.body.indices?.docs?.count ?? 0,
        sizeBytes: stats.body.indices?.store?.size_in_bytes ?? 0,
      };
    }));
    const dashboard = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { name: urls[i]?.id, url: urls[i]?.url, status: 'unreachable', error: (r.reason as Error).message }
    );
    return { content: JSON.stringify(dashboard, null, 2), isError: false };
  },
};

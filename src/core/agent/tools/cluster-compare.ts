/**
 * cluster-compare — compare two OpenSearch clusters side by side.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

async function getClusterInfo(url: string) {
  const client = new Client({ node: url });
  const [health, stats, cat] = await Promise.all([
    client.cluster.health(),
    client.cluster.stats(),
    client.cat.indices({ format: 'json' }),
  ]);
  return {
    health: health.body.status,
    clusterName: health.body.cluster_name,
    nodeCount: health.body.number_of_nodes,
    indexCount: health.body.active_primary_shards,
    version: stats.body.nodes?.versions?.[0] ?? 'unknown',
    totalDocs: stats.body.indices?.docs?.count ?? 0,
    totalSize: stats.body.indices?.store?.size_in_bytes ?? 0,
    indices: (cat.body as Array<Record<string, string>>).length,
  };
}

export const clusterCompareTool: AgentTool = {
  definition: {
    name: 'cluster-compare',
    description: 'Compare two OpenSearch clusters: health, version, node count, index count, doc count, storage size.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        cluster_a: { type: 'string', description: 'URL of first cluster' },
        cluster_b: { type: 'string', description: 'URL of second cluster' },
      },
      required: ['cluster_a', 'cluster_b'],
    },
  },
  async execute(input): Promise<ToolResult> {
    try {
      const [a, b] = await Promise.all([
        getClusterInfo(input.cluster_a as string),
        getClusterInfo(input.cluster_b as string),
      ]);
      return { content: JSON.stringify({ cluster_a: a, cluster_b: b }, null, 2), isError: false };
    } catch (err) {
      return { content: `Compare failed: ${(err as Error).message}`, isError: true };
    }
  },
};

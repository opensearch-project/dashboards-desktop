/**
 * cluster-health — read-only cluster diagnostics for OpenSearch and Elasticsearch.
 */

import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { AgentTool, ToolContext, ToolResult } from '../types';

export const clusterHealthTool: AgentTool = {
  definition: {
    name: 'cluster-health',
    description: 'Get cluster health, node stats, and shard allocation for the active connection.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        detail: { type: 'string', enum: ['summary', 'full'], default: 'summary' },
      },
    },
    requiresApproval: false,
  },

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    if (!context.activeConnection) {
      return { content: 'No active connection.', isError: true };
    }
    const conn = context.activeConnection;
    const detail = (input.detail as string) || 'summary';

    try {
      if (conn.type === 'opensearch') {
        return await getOpenSearchHealth(conn.url, detail);
      } else {
        return await getElasticsearchHealth(conn.url, detail);
      }
    } catch (err: unknown) {
      return {
        content: `Health check failed: ${err instanceof Error ? err.message : err}`,
        isError: true,
      };
    }
  },
};

async function getOpenSearchHealth(url: string, detail: string): Promise<ToolResult> {
  const client = new OpenSearchClient({ node: url } as Record<string, unknown>);
  const health = await (client.cluster as Record<string, () => Promise<{ body: unknown }>>).health();
  const result: Record<string, unknown> = { health: health.body };

  if (detail === 'full') {
    const stats = await (client.cluster as Record<string, () => Promise<{ body: unknown }>>).stats();
    result.stats = stats.body;
  }
  return { content: JSON.stringify(result, null, 2), isError: false };
}

async function getElasticsearchHealth(url: string, detail: string): Promise<ToolResult> {
  const client = new ElasticsearchClient({ node: url } as Record<string, unknown>);
  const health = await client.cluster.health();
  const result: Record<string, unknown> = { health };

  if (detail === 'full') {
    const stats = await client.cluster.stats();
    result.stats = stats;
  }
  return { content: JSON.stringify(result, null, 2), isError: false };
}

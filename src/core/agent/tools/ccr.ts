/**
 * ccr — configure cross-cluster replication leader/follower.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const ccrTool: AgentTool = {
  definition: {
    name: 'ccr',
    description: 'Manage cross-cluster replication: start/stop/status of leader-follower replication.',
    source: 'builtin',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['start', 'stop', 'status', 'autofollow-create', 'autofollow-list'], description: 'Action' },
        leader_index: { type: 'string', description: 'Leader index name' },
        follower_index: { type: 'string', description: 'Follower index name' },
        remote_cluster: { type: 'string', description: 'Remote cluster connection alias' },
        body: { type: 'object', description: 'Additional config' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const follower = encodeURIComponent(input.follower_index as string || '');
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      switch (input.action) {
        case 'start': return ok(await client.transport.request({ method: 'PUT', path: `/_plugins/_replication/${follower}/_start`, body: { leader_alias: input.remote_cluster, leader_index: input.leader_index, ...((input.body as Record<string, unknown>) ?? {}) } }));
        case 'stop': return ok(await client.transport.request({ method: 'POST', path: `/_plugins/_replication/${follower}/_stop` }));
        case 'status': return ok(await client.transport.request({ method: 'GET', path: `/_plugins/_replication/${follower}/_status` }));
        case 'autofollow-create': return ok(await client.transport.request({ method: 'POST', path: '/_plugins/_replication/_autofollow', body: input.body }));
        case 'autofollow-list': return ok(await client.transport.request({ method: 'GET', path: '/_plugins/_replication/autofollow_stats' }));
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `CCR ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

function ok(res: { body: unknown }): ToolResult { return { content: JSON.stringify(res.body, null, 2), isError: false }; }

/**
 * notification-channels — manage SNS/Slack/email/webhook notification destinations.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const notificationChannelsTool: AgentTool = {
  definition: {
    name: 'notification-channels',
    description: 'Manage notification channels: list, create, delete, or test destinations (Slack, email, webhook, SNS).',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'delete', 'test'], description: 'Action' },
        config_id: { type: 'string', description: 'Channel config ID (for delete/test)' },
        body: { type: 'object', description: 'Channel config (for create)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const id = encodeURIComponent(input.config_id as string || '');
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      switch (input.action) {
        case 'list': return ok(await client.transport.request({ method: 'GET', path: '/_plugins/_notifications/configs' }));
        case 'create': return ok(await client.transport.request({ method: 'POST', path: '/_plugins/_notifications/configs', body: input.body }));
        case 'delete': return ok(await client.transport.request({ method: 'DELETE', path: `/_plugins/_notifications/configs/${id}` }));
        case 'test': return ok(await client.transport.request({ method: 'GET', path: `/_plugins/_notifications/feature/test/${id}` }));
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `Notification ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

function ok(res: { body: unknown }): ToolResult { return { content: JSON.stringify(res.body, null, 2), isError: false }; }

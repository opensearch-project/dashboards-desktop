/**
 * data-stream — create/delete/rollover/list data streams.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const dataStreamTool: AgentTool = {
  definition: {
    name: 'data-stream',
    description: 'Manage data streams: list, create, delete, rollover, or get stats.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'delete', 'rollover', 'stats'], description: 'Action' },
        name: { type: 'string', description: 'Data stream name' },
        body: { type: 'object', description: 'Request body (for create)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const name = input.name as string;
    try {
      switch (input.action) {
        case 'list': return ok(await (client.transport.request as Function)({ method: 'GET', path: '/_data_stream' }));
        case 'create': return ok(await (client.transport.request as Function)({ method: 'PUT', path: `/_data_stream/${encodeURIComponent(name)}`, body: input.body as Record<string, any> }));
        case 'delete': return ok(await (client.transport.request as Function)({ method: 'DELETE', path: `/_data_stream/${encodeURIComponent(name)}` }));
        case 'rollover': return ok(await (client.transport.request as Function)({ method: 'POST', path: `/${encodeURIComponent(name)}/_rollover` }));
        case 'stats': return ok(await (client.transport.request as Function)({ method: 'GET', path: `/_data_stream/${encodeURIComponent(name)}/_stats` }));
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `Data stream ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

function ok(res: { body: unknown }): { content: string; isError: boolean } {
  return { content: JSON.stringify(res.body, null, 2), isError: false };
}

/**
 * ism-policy — create/get/attach/remove/explain ISM policies.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

const ISM = '/_plugins/_ism';

export const ismPolicyTool: AgentTool = {
  definition: {
    name: 'ism-policy',
    description: 'Manage Index State Management policies: list, get, create, delete, attach to index, or explain current state.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'delete', 'attach', 'explain'], description: 'Action' },
        policy_id: { type: 'string', description: 'Policy ID' },
        index: { type: 'string', description: 'Index name (for attach/explain)' },
        body: { type: 'object', description: 'Policy body (for create)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const id = input.policy_id as string;
    const idx = input.index as string;
    try {
      switch (input.action) {
        case 'list': return ok(await client.transport.request({ method: 'GET', path: `${ISM}/policies` }));
        case 'get': return ok(await client.transport.request({ method: 'GET', path: `${ISM}/policies/${encodeURIComponent(id)}` }));
        case 'create': return ok(await client.transport.request({ method: 'PUT', path: `${ISM}/policies/${encodeURIComponent(id)}`, body: input.body as Record<string, unknown> }));
        case 'delete': return ok(await client.transport.request({ method: 'DELETE', path: `${ISM}/policies/${encodeURIComponent(id)}` }));
        case 'attach': return ok(await client.transport.request({ method: 'POST', path: `${ISM}/add/${encodeURIComponent(idx)}`, body: { policy_id: id } }));
        case 'explain': return ok(await client.transport.request({ method: 'POST', path: `${ISM}/explain/${encodeURIComponent(idx)}` }));
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `ISM ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

function ok(res: { body: unknown }): ToolResult {
  return { content: JSON.stringify(res.body, null, 2), isError: false };
}

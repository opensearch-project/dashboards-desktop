/**
 * tenant-management — create/switch/delete/list tenants for multi-tenancy.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const tenantManagementTool: AgentTool = {
  definition: {
    name: 'tenant-management',
    description: 'Manage OpenSearch security tenants: list, create, delete, or get tenant details.',
    source: 'builtin',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'delete', 'get'], description: 'Action' },
        tenant: { type: 'string', description: 'Tenant name' },
        description: { type: 'string', description: 'Tenant description (for create)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const name = encodeURIComponent(input.tenant as string || '');
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      switch (input.action) {
        case 'list': return ok(await client.transport.request({ method: 'GET', path: '/_plugins/_security/api/tenants' }));
        case 'get': return ok(await client.transport.request({ method: 'GET', path: `/_plugins/_security/api/tenants/${name}` }));
        case 'create': return ok(await client.transport.request({ method: 'PUT', path: `/_plugins/_security/api/tenants/${name}`, body: { description: input.description || '' } }));
        case 'delete': return ok(await client.transport.request({ method: 'DELETE', path: `/_plugins/_security/api/tenants/${name}` }));
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `Tenant ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

function ok(res: { body: unknown }): ToolResult { return { content: JSON.stringify(res.body, null, 2), isError: false }; }

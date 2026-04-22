/**
 * snapshot — create/restore/delete/list snapshots and repositories.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const snapshotTool: AgentTool = {
  definition: {
    name: 'snapshot',
    description: 'Manage snapshots: list repos, list/create/restore/delete snapshots.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-repos', 'list', 'create', 'restore', 'delete'], description: 'Action' },
        repository: { type: 'string', description: 'Repository name' },
        snapshot: { type: 'string', description: 'Snapshot name (for create/restore/delete)' },
        body: { type: 'object', description: 'Request body (for create repo or restore options)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const repo = input.repository as string;
    const snap = input.snapshot as string;
    try {
      switch (input.action) {
        case 'list-repos': return { content: JSON.stringify((await client.snapshot.getRepository({})).body, null, 2), isError: false };
        case 'list': return { content: JSON.stringify((await client.snapshot.get({ repository: repo, snapshot: '_all' })).body, null, 2), isError: false };
        case 'create': return { content: JSON.stringify((await client.snapshot.create({ repository: repo, snapshot: snap, body: input.body as Record<string, unknown> })).body, null, 2), isError: false };
        case 'restore': return { content: JSON.stringify((await client.snapshot.restore({ repository: repo, snapshot: snap, body: input.body as Record<string, unknown> })).body, null, 2), isError: false };
        case 'delete': return { content: JSON.stringify((await client.snapshot.delete({ repository: repo, snapshot: snap })).body, null, 2), isError: false };
        default: return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) { return { content: `Snapshot ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

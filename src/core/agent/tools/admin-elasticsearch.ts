/**
 * Elasticsearch admin agent tools — ILM, watcher, snapshot, ingest, security.
 * Read actions auto-approve; write/delete actions require approval.
 */

import { Client } from '@elastic/elasticsearch';
import type { AgentTool, ToolContext, ToolResult } from '../types';

function esClient(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Client({ node: url }) as any;
}

function ok(data: unknown): ToolResult {
  return { content: JSON.stringify(data, null, 2), isError: false };
}

function fail(msg: string): ToolResult {
  return { content: msg, isError: true };
}

function requireES(ctx: ToolContext): ToolResult | null {
  if (!ctx.activeConnection) return fail('No active connection.');
  if (ctx.activeConnection.type !== 'elasticsearch') return fail('Active connection is not Elasticsearch.');
  return null;
}

// --- ilm-manage ---

export const esIlmTool: AgentTool = {
  definition: {
    name: 'es-ilm-manage',
    description: 'Manage Elasticsearch Index Lifecycle Management (ILM) policies.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'delete'] },
        name: { type: 'string', description: 'Policy name' },
        body: { type: 'object', description: 'Policy definition for create' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = requireES(ctx);
    if (err) return err;
    const c = esClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list': return ok(await c.ilm.getLifecycle());
        case 'get': return ok(await c.ilm.getLifecycle({ name }));
        case 'create': return ok(await c.ilm.putLifecycle({ name, body }));
        case 'delete': return ok(await c.ilm.deleteLifecycle({ name }));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-ilm-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- watcher-manage ---

export const esWatcherTool: AgentTool = {
  definition: {
    name: 'es-watcher-manage',
    description: 'Manage Elasticsearch Watcher: list/create/edit/delete watches.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete', 'execute'] },
        id: { type: 'string', description: 'Watch ID' },
        body: { type: 'object', description: 'Watch definition for create/update' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = requireES(ctx);
    if (err) return err;
    const c = esClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list': return ok(await c.watcher.queryWatches({ body: { query: { match_all: {} } } }));
        case 'get': return ok(await c.watcher.getWatch({ id }));
        case 'create': return ok(await c.watcher.putWatch({ id, body }));
        case 'update': return ok(await c.watcher.putWatch({ id, body }));
        case 'delete': return ok(await c.watcher.deleteWatch({ id }));
        case 'execute': return ok(await c.watcher.executeWatch({ id }));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-watcher-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- snapshot-manage ---

export const esSnapshotTool: AgentTool = {
  definition: {
    name: 'es-snapshot-manage',
    description: 'Manage Elasticsearch snapshots: list repos, create/restore/delete snapshots.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-repos', 'list-snapshots', 'create-snapshot', 'restore-snapshot', 'delete-snapshot'] },
        repo: { type: 'string', description: 'Repository name' },
        snapshot: { type: 'string', description: 'Snapshot name' },
        body: { type: 'object', description: 'Body for create/restore' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = requireES(ctx);
    if (err) return err;
    const c = esClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const repo = input.repo as string;
    const snapshot = input.snapshot as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-repos': return ok(await c.snapshot.getRepository({}));
        case 'list-snapshots': return ok(await c.snapshot.get({ repository: repo, snapshot: '_all' }));
        case 'create-snapshot': return ok(await c.snapshot.create({ repository: repo, snapshot, body }));
        case 'restore-snapshot': return ok(await c.snapshot.restore({ repository: repo, snapshot, body }));
        case 'delete-snapshot': return ok(await c.snapshot.delete({ repository: repo, snapshot }));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-snapshot-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- ingest-manage ---

export const esIngestTool: AgentTool = {
  definition: {
    name: 'es-ingest-manage',
    description: 'Manage Elasticsearch ingest pipelines: list, create, delete, simulate.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'delete', 'simulate'] },
        id: { type: 'string', description: 'Pipeline ID' },
        body: { type: 'object', description: 'Pipeline definition or simulate docs' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = requireES(ctx);
    if (err) return err;
    const c = esClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list': return ok(await c.ingest.getPipeline());
        case 'get': return ok(await c.ingest.getPipeline({ id }));
        case 'create': return ok(await c.ingest.putPipeline({ id, body }));
        case 'delete': return ok(await c.ingest.deletePipeline({ id }));
        case 'simulate': return ok(await c.ingest.simulate({ id, body }));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-ingest-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- security-manage ---

export const esSecurityTool: AgentTool = {
  definition: {
    name: 'es-security-manage',
    description: 'Manage Elasticsearch native security: users, roles, API keys.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-users', 'get-user', 'create-user', 'delete-user', 'list-roles', 'get-role', 'create-role', 'delete-role', 'list-api-keys', 'create-api-key', 'invalidate-api-key'] },
        name: { type: 'string', description: 'User, role, or API key name/ID' },
        body: { type: 'object', description: 'Request body for create operations' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = requireES(ctx);
    if (err) return err;
    const c = esClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-users': return ok(await c.security.getUser());
        case 'get-user': return ok(await c.security.getUser({ username: name }));
        case 'create-user': return ok(await c.security.putUser({ username: name, body }));
        case 'delete-user': return ok(await c.security.deleteUser({ username: name }));
        case 'list-roles': return ok(await c.security.getRole());
        case 'get-role': return ok(await c.security.getRole({ name }));
        case 'create-role': return ok(await c.security.putRole({ name, body }));
        case 'delete-role': return ok(await c.security.deleteRole({ name }));
        case 'list-api-keys': return ok(await c.security.getApiKey());
        case 'create-api-key': return ok(await c.security.createApiKey({ body }));
        case 'invalidate-api-key': return ok(await c.security.invalidateApiKey({ body: { name } }));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-security-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

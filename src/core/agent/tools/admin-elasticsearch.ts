/**
 * Elasticsearch admin agent tools — wraps src/core/admin/elasticsearch/ modules.
 * Read actions auto-approve; write/delete actions require approval.
 */

import * as ilm from '../../admin/elasticsearch/ilm';
import * as watcher from '../../admin/elasticsearch/watcher';
import * as snapshots from '../../admin/elasticsearch/snapshots';
import * as ingest from '../../admin/elasticsearch/ingest';
import * as security from '../../admin/elasticsearch/security';
import type { AgentTool, ToolContext, ToolResult } from '../types';

function ok(data: unknown): ToolResult { return { content: JSON.stringify(data, null, 2), isError: false }; }
function fail(msg: string): ToolResult { return { content: msg, isError: true }; }

function requireES(ctx: ToolContext): string | null {
  if (!ctx.activeConnection) return null;
  if (ctx.activeConnection.type !== 'elasticsearch') return null;
  return ctx.activeConnection.url;
}

function guard(ctx: ToolContext): ToolResult | null {
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
    const err = guard(ctx); if (err) return err;
    const url = requireES(ctx)!;
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list': return ok(await ilm.listPolicies(url));
        case 'get': return ok(await ilm.getPolicy(url, name));
        case 'create': return ok(await ilm.createPolicy(url, name, body));
        case 'delete': return ok(await ilm.deletePolicy(url, name));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-ilm-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- watcher-manage ---

export const esWatcherTool: AgentTool = {
  definition: {
    name: 'es-watcher-manage',
    description: 'Manage Elasticsearch Watcher: list/create/delete/activate/deactivate watches.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'delete', 'activate', 'deactivate'] },
        id: { type: 'string', description: 'Watch ID' },
        body: { type: 'object', description: 'Watch definition for create' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = guard(ctx); if (err) return err;
    const url = requireES(ctx)!;
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list': return ok(await watcher.listWatches(url));
        case 'get': return ok(await watcher.getWatch(url, id));
        case 'create': return ok(await watcher.createWatch(url, id, body));
        case 'delete': return ok(await watcher.deleteWatch(url, id));
        case 'activate': return ok(await watcher.activateWatch(url, id));
        case 'deactivate': return ok(await watcher.deactivateWatch(url, id));
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
    const err = guard(ctx); if (err) return err;
    const url = requireES(ctx)!;
    const action = input.action as string;
    const repo = input.repo as string;
    const snapshot = input.snapshot as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-repos': return ok(await snapshots.listRepos(url));
        case 'list-snapshots': return ok(await snapshots.listSnapshots(url, repo));
        case 'create-snapshot': return ok(await snapshots.createSnapshot(url, repo, snapshot, body));
        case 'restore-snapshot': return ok(await snapshots.restoreSnapshot(url, repo, snapshot, body));
        case 'delete-snapshot': return ok(await snapshots.deleteSnapshot(url, repo, snapshot));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-snapshot-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- ingest-manage ---

export const esIngestTool: AgentTool = {
  definition: {
    name: 'es-ingest-manage',
    description: 'Manage Elasticsearch ingest pipelines: list, create, delete.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'delete'] },
        id: { type: 'string', description: 'Pipeline ID' },
        body: { type: 'object', description: 'Pipeline definition' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = guard(ctx); if (err) return err;
    const url = requireES(ctx)!;
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list': return ok(await ingest.listPipelines(url));
        case 'get': return ok(await ingest.getPipeline(url, id));
        case 'create': return ok(await ingest.createPipeline(url, id, body));
        case 'delete': return ok(await ingest.deletePipeline(url, id));
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
        action: { type: 'string', enum: ['list-users', 'create-user', 'delete-user', 'list-roles', 'create-role', 'delete-role', 'list-api-keys', 'create-api-key', 'invalidate-api-key'] },
        name: { type: 'string', description: 'User, role, or API key name/ID' },
        body: { type: 'object', description: 'Request body for create operations' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = guard(ctx); if (err) return err;
    const url = requireES(ctx)!;
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list-users': return ok(await security.listUsers(url));
        case 'create-user': return ok(await security.createUser(url, name, body));
        case 'delete-user': return ok(await security.deleteUser(url, name));
        case 'list-roles': return ok(await security.listRoles(url));
        case 'create-role': return ok(await security.createRole(url, name, body));
        case 'delete-role': return ok(await security.deleteRole(url, name));
        case 'list-api-keys': return ok(await security.listApiKeys(url));
        case 'create-api-key': return ok(await security.createApiKey(url, body));
        case 'invalidate-api-key': return ok(await security.invalidateApiKey(url, [name]));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`es-security-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

/**
 * OpenSearch admin agent tools — wraps src/core/admin/opensearch/ modules.
 * Read actions auto-approve; write/delete actions require approval.
 */

import * as security from '../../admin/opensearch/security';
import * as alerting from '../../admin/opensearch/alerting';
import * as ism from '../../admin/opensearch/ism';
import * as snapshots from '../../admin/opensearch/snapshots';
import * as ingest from '../../admin/opensearch/ingest';
import type { AgentTool, ToolContext, ToolResult } from '../types';

function ok(data: unknown): ToolResult { return { content: JSON.stringify(data, null, 2), isError: false }; }
function fail(msg: string): ToolResult { return { content: msg, isError: true }; }

function requireOS(ctx: ToolContext): string | null {
  if (!ctx.activeConnection) return null;
  if (ctx.activeConnection.type !== 'opensearch') return null;
  return ctx.activeConnection.url;
}

function guard(ctx: ToolContext): ToolResult | null {
  if (!ctx.activeConnection) return fail('No active connection.');
  if (ctx.activeConnection.type !== 'opensearch') return fail('Active connection is not OpenSearch.');
  return null;
}

// --- security-manage ---

export const osSecurityTool: AgentTool = {
  definition: {
    name: 'os-security-manage',
    description: 'Manage OpenSearch Security: list/create/delete roles, users, and tenants.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-roles', 'get-role', 'create-role', 'delete-role', 'list-users', 'create-user', 'delete-user', 'list-tenants', 'create-tenant', 'delete-tenant'] },
        name: { type: 'string', description: 'Role, user, or tenant name' },
        body: { type: 'object', description: 'Request body for create operations' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = guard(ctx); if (err) return err;
    const url = requireOS(ctx)!;
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list-roles': return ok(await security.listRoles(url));
        case 'get-role': return ok(await security.getRole(url, name));
        case 'create-role': return ok(await security.createRole(url, name, body));
        case 'delete-role': return ok(await security.deleteRole(url, name));
        case 'list-users': return ok(await security.listUsers(url));
        case 'create-user': return ok(await security.createUser(url, name, body));
        case 'delete-user': return ok(await security.deleteUser(url, name));
        case 'list-tenants': return ok(await security.listTenants(url));
        case 'create-tenant': return ok(await security.createTenant(url, name, body));
        case 'delete-tenant': return ok(await security.deleteTenant(url, name));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`os-security-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- alerting-manage ---

export const osAlertingTool: AgentTool = {
  definition: {
    name: 'os-alerting-manage',
    description: 'Manage OpenSearch Alerting: list/create/update/delete monitors and destinations.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-monitors', 'get-monitor', 'create-monitor', 'update-monitor', 'delete-monitor', 'list-destinations', 'create-destination', 'delete-destination'] },
        id: { type: 'string', description: 'Monitor or destination ID' },
        body: { type: 'object', description: 'Request body for create/update' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = guard(ctx); if (err) return err;
    const url = requireOS(ctx)!;
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list-monitors': return ok(await alerting.listMonitors(url));
        case 'get-monitor': return ok(await alerting.getMonitor(url, id));
        case 'create-monitor': return ok(await alerting.createMonitor(url, body));
        case 'update-monitor': return ok(await alerting.updateMonitor(url, id, body));
        case 'delete-monitor': return ok(await alerting.deleteMonitor(url, id));
        case 'list-destinations': return ok(await alerting.listDestinations(url));
        case 'create-destination': return ok(await alerting.createDestination(url, body));
        case 'delete-destination': return ok(await alerting.deleteDestination(url, id));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`os-alerting-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- ism-manage ---

export const osIsmTool: AgentTool = {
  definition: {
    name: 'os-ism-manage',
    description: 'Manage OpenSearch Index State Management (ISM) policies.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-policies', 'get-policy', 'create-policy', 'delete-policy'] },
        id: { type: 'string', description: 'Policy ID' },
        body: { type: 'object', description: 'Policy definition for create' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = guard(ctx); if (err) return err;
    const url = requireOS(ctx)!;
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown>;
    try {
      switch (action) {
        case 'list-policies': return ok(await ism.listPolicies(url));
        case 'get-policy': return ok(await ism.getPolicy(url, id));
        case 'create-policy': return ok(await ism.createPolicy(url, id, body));
        case 'delete-policy': return ok(await ism.deletePolicy(url, id));
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`os-ism-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- snapshot-manage ---

export const osSnapshotTool: AgentTool = {
  definition: {
    name: 'os-snapshot-manage',
    description: 'Manage OpenSearch snapshots: list repos, create/restore/delete snapshots.',
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
    const url = requireOS(ctx)!;
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
    } catch (e: unknown) { return fail(`os-snapshot-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- ingest-manage ---

export const osIngestTool: AgentTool = {
  definition: {
    name: 'os-ingest-manage',
    description: 'Manage OpenSearch ingest pipelines: list, create, delete.',
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
    const url = requireOS(ctx)!;
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
    } catch (e: unknown) { return fail(`os-ingest-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

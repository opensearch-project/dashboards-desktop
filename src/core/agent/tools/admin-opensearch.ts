/**
 * OpenSearch admin agent tools — security, alerting, ISM, snapshot, ingest.
 * Read actions auto-approve; write/delete actions require approval.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolContext, ToolResult } from '../types';

function osClient(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Client({ node: url }) as any;
}

function ok(data: unknown): ToolResult {
  return { content: JSON.stringify(data, null, 2), isError: false };
}

function fail(msg: string): ToolResult {
  return { content: msg, isError: true };
}

function requireOS(ctx: ToolContext): ToolResult | null {
  if (!ctx.activeConnection) return fail('No active connection.');
  if (ctx.activeConnection.type !== 'opensearch') return fail('Active connection is not OpenSearch.');
  return null;
}

// --- security-manage ---

export const osSecurityTool: AgentTool = {
  definition: {
    name: 'os-security-manage',
    description: 'Manage OpenSearch Security: list/create/edit/delete roles, users, role mappings, and tenants.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-roles', 'get-role', 'create-role', 'delete-role', 'list-users', 'get-user', 'create-user', 'delete-user', 'list-tenants', 'get-role-mapping', 'create-role-mapping'] },
        name: { type: 'string', description: 'Role, user, or tenant name' },
        body: { type: 'object', description: 'Request body for create/edit operations' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const err = requireOS(ctx);
    if (err) return err;
    const c = osClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-roles': return ok((await c.transport.request({ method: 'GET', path: '/_plugins/_security/api/roles' })).body);
        case 'get-role': return ok((await c.transport.request({ method: 'GET', path: `/_plugins/_security/api/roles/${name}` })).body);
        case 'create-role': return ok((await c.transport.request({ method: 'PUT', path: `/_plugins/_security/api/roles/${name}`, body })).body);
        case 'delete-role': return ok((await c.transport.request({ method: 'DELETE', path: `/_plugins/_security/api/roles/${name}` })).body);
        case 'list-users': return ok((await c.transport.request({ method: 'GET', path: '/_plugins/_security/api/internalusers' })).body);
        case 'get-user': return ok((await c.transport.request({ method: 'GET', path: `/_plugins/_security/api/internalusers/${name}` })).body);
        case 'create-user': return ok((await c.transport.request({ method: 'PUT', path: `/_plugins/_security/api/internalusers/${name}`, body })).body);
        case 'delete-user': return ok((await c.transport.request({ method: 'DELETE', path: `/_plugins/_security/api/internalusers/${name}` })).body);
        case 'list-tenants': return ok((await c.transport.request({ method: 'GET', path: '/_plugins/_security/api/tenants' })).body);
        case 'get-role-mapping': return ok((await c.transport.request({ method: 'GET', path: `/_plugins/_security/api/rolesmapping/${name}` })).body);
        case 'create-role-mapping': return ok((await c.transport.request({ method: 'PUT', path: `/_plugins/_security/api/rolesmapping/${name}`, body })).body);
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`os-security-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- alerting-manage ---

export const osAlertingTool: AgentTool = {
  definition: {
    name: 'os-alerting-manage',
    description: 'Manage OpenSearch Alerting: list/create/edit/delete monitors and destinations.',
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
    const err = requireOS(ctx);
    if (err) return err;
    const c = osClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-monitors': return ok((await c.transport.request({ method: 'GET', path: '/_plugins/_alerting/monitors', body: { query: { match_all: {} } } })).body);
        case 'get-monitor': return ok((await c.transport.request({ method: 'GET', path: `/_plugins/_alerting/monitors/${id}` })).body);
        case 'create-monitor': return ok((await c.transport.request({ method: 'POST', path: '/_plugins/_alerting/monitors', body })).body);
        case 'update-monitor': return ok((await c.transport.request({ method: 'PUT', path: `/_plugins/_alerting/monitors/${id}`, body })).body);
        case 'delete-monitor': return ok((await c.transport.request({ method: 'DELETE', path: `/_plugins/_alerting/monitors/${id}` })).body);
        case 'list-destinations': return ok((await c.transport.request({ method: 'GET', path: '/_plugins/_alerting/destinations' })).body);
        case 'create-destination': return ok((await c.transport.request({ method: 'POST', path: '/_plugins/_alerting/destinations', body })).body);
        case 'delete-destination': return ok((await c.transport.request({ method: 'DELETE', path: `/_plugins/_alerting/destinations/${id}` })).body);
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
    const err = requireOS(ctx);
    if (err) return err;
    const c = osClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-policies': return ok((await c.transport.request({ method: 'GET', path: '/_plugins/_ism/policies' })).body);
        case 'get-policy': return ok((await c.transport.request({ method: 'GET', path: `/_plugins/_ism/policies/${id}` })).body);
        case 'create-policy': return ok((await c.transport.request({ method: 'PUT', path: `/_plugins/_ism/policies/${id}`, body })).body);
        case 'delete-policy': return ok((await c.transport.request({ method: 'DELETE', path: `/_plugins/_ism/policies/${id}` })).body);
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
    const err = requireOS(ctx);
    if (err) return err;
    const c = osClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const repo = input.repo as string;
    const snapshot = input.snapshot as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list-repos': return ok((await c.snapshot.getRepository({})).body);
        case 'list-snapshots': return ok((await c.snapshot.get({ repository: repo, snapshot: '_all' })).body);
        case 'create-snapshot': return ok((await c.snapshot.create({ repository: repo, snapshot, body })).body);
        case 'restore-snapshot': return ok((await c.snapshot.restore({ repository: repo, snapshot, body })).body);
        case 'delete-snapshot': return ok((await c.snapshot.delete({ repository: repo, snapshot })).body);
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`os-snapshot-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

// --- ingest-manage ---

export const osIngestTool: AgentTool = {
  definition: {
    name: 'os-ingest-manage',
    description: 'Manage OpenSearch ingest pipelines: list, create, delete, simulate.',
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
    const err = requireOS(ctx);
    if (err) return err;
    const c = osClient(ctx.activeConnection!.url);
    const action = input.action as string;
    const id = input.id as string;
    const body = input.body as Record<string, unknown> | undefined;
    try {
      switch (action) {
        case 'list': return ok((await c.ingest.getPipeline({})).body);
        case 'get': return ok((await c.ingest.getPipeline({ id })).body);
        case 'create': return ok((await c.ingest.putPipeline({ id, body })).body);
        case 'delete': return ok((await c.ingest.deletePipeline({ id })).body);
        case 'simulate': return ok((await c.ingest.simulate({ id, body })).body);
        default: return fail(`Unknown action: ${action}`);
      }
    } catch (e: unknown) { return fail(`os-ingest-manage: ${e instanceof Error ? e.message : e}`); }
  },
};

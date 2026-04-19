/**
 * Admin agent tool for OpenSearch — security, alerting, ISM, snapshots, ingest via chat.
 */

import type { AgentTool, ToolContext, ToolResult } from '../types';
import * as security from '../../admin/opensearch/security';
import * as alerting from '../../admin/opensearch/alerting';
import * as ism from '../../admin/opensearch/ism';
import * as snapshots from '../../admin/opensearch/snapshots';
import * as ingest from '../../admin/opensearch/ingest';

export const adminOpenSearchTool: AgentTool = {
  definition: {
    name: 'admin-opensearch',
    description: 'Manage OpenSearch cluster: security (roles/users/tenants), alerting (monitors/destinations), ISM policies, snapshots, ingest pipelines.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['security', 'alerting', 'ism', 'snapshots', 'ingest'] },
        action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete', 'restore'] },
        name: { type: 'string', description: 'Resource name/ID' },
        body: { type: 'object', description: 'Request body for create/update' },
        repo: { type: 'string', description: 'Snapshot repository name' },
      },
      required: ['domain', 'action'],
    },
    requiresApproval: true,
  },

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const conn = context.activeConnection;
    if (!conn || conn.type !== 'opensearch') {
      return { content: 'No active OpenSearch connection.', isError: true };
    }
    const url = conn.url;
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown>;
    const repo = input.repo as string;

    try {
      let res: unknown;
      switch (input.domain) {
        case 'security':
          res = await execSecurity(url, action, name, body);
          break;
        case 'alerting':
          res = await execAlerting(url, action, name, body);
          break;
        case 'ism':
          res = action === 'list' ? await ism.listPolicies(url)
            : action === 'get' ? await ism.getPolicy(url, name)
            : action === 'create' ? await ism.createPolicy(url, name, body)
            : action === 'delete' ? await ism.deletePolicy(url, name)
            : `Unknown ISM action: ${action}`;
          break;
        case 'snapshots':
          res = await execSnapshots(url, action, name, repo, body);
          break;
        case 'ingest':
          res = action === 'list' ? await ingest.listPipelines(url)
            : action === 'get' ? await ingest.getPipeline(url, name)
            : action === 'create' ? await ingest.createPipeline(url, name, body)
            : action === 'delete' ? await ingest.deletePipeline(url, name)
            : `Unknown ingest action: ${action}`;
          break;
        default:
          return { content: `Unknown domain: ${input.domain}`, isError: true };
      }
      return { content: JSON.stringify(res, null, 2), isError: false };
    } catch (err: unknown) {
      return { content: `admin-opensearch failed: ${err instanceof Error ? err.message : err}`, isError: true };
    }
  },
};

async function execSecurity(url: string, action: string, name: string, body: Record<string, unknown>) {
  switch (action) {
    case 'list': return security.listRoles(url);
    case 'get': return security.getRole(url, name);
    case 'create': return security.createRole(url, name, body);
    case 'delete': return security.deleteRole(url, name);
    default: return `Unknown security action: ${action}`;
  }
}

async function execAlerting(url: string, action: string, name: string, body: Record<string, unknown>) {
  switch (action) {
    case 'list': return alerting.listMonitors(url);
    case 'get': return alerting.getMonitor(url, name);
    case 'create': return alerting.createMonitor(url, body);
    case 'update': return alerting.updateMonitor(url, name, body);
    case 'delete': return alerting.deleteMonitor(url, name);
    default: return `Unknown alerting action: ${action}`;
  }
}

async function execSnapshots(url: string, action: string, name: string, repo: string, body?: Record<string, unknown>) {
  switch (action) {
    case 'list': return repo ? snapshots.listSnapshots(url, repo) : snapshots.listRepos(url);
    case 'create': return snapshots.createSnapshot(url, repo, name, body);
    case 'restore': return snapshots.restoreSnapshot(url, repo, name, body);
    case 'delete': return snapshots.deleteSnapshot(url, repo, name);
    default: return `Unknown snapshot action: ${action}`;
  }
}

// Individual tool aliases for granular registration
export const osSecurityTool = adminOpenSearchTool;
export const osAlertingTool = adminOpenSearchTool;
export const osIsmTool = adminOpenSearchTool;
export const osSnapshotTool = adminOpenSearchTool;
export const osIngestTool = adminOpenSearchTool;

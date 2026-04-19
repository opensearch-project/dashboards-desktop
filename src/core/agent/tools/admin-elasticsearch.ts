/**
 * Admin agent tool for Elasticsearch — ILM, Watcher, snapshots, ingest, security via chat.
 */

import type { AgentTool, ToolContext, ToolResult } from '../types';
import * as ilm from '../../admin/elasticsearch/ilm';
import * as watcher from '../../admin/elasticsearch/watcher';
import * as snapshots from '../../admin/elasticsearch/snapshots';
import * as ingest from '../../admin/elasticsearch/ingest';
import * as security from '../../admin/elasticsearch/security';

export const adminElasticsearchTool: AgentTool = {
  definition: {
    name: 'admin-elasticsearch',
    description:
      'Manage Elasticsearch cluster: ILM policies, Watcher alerts, snapshots, ingest pipelines, security (users/roles/API keys).',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['ilm', 'watcher', 'snapshots', 'ingest', 'security'] },
        action: {
          type: 'string',
          enum: ['list', 'get', 'create', 'update', 'delete', 'restore', 'activate', 'deactivate'],
        },
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
    if (!conn || conn.type !== 'elasticsearch') {
      return { content: 'No active Elasticsearch connection.', isError: true };
    }
    const url = conn.url;
    const action = input.action as string;
    const name = input.name as string;
    const body = input.body as Record<string, unknown>;
    const repo = input.repo as string;

    try {
      let res: unknown;
      switch (input.domain) {
        case 'ilm':
          res =
            action === 'list'
              ? await ilm.listPolicies(url)
              : action === 'get'
                ? await ilm.getPolicy(url, name)
                : action === 'create'
                  ? await ilm.createPolicy(url, name, body)
                  : action === 'delete'
                    ? await ilm.deletePolicy(url, name)
                    : `Unknown ILM action: ${action}`;
          break;
        case 'watcher':
          res = await execWatcher(url, action, name, body);
          break;
        case 'snapshots':
          res = await execSnapshots(url, action, name, repo, body);
          break;
        case 'ingest':
          res =
            action === 'list'
              ? await ingest.listPipelines(url)
              : action === 'get'
                ? await ingest.getPipeline(url, name)
                : action === 'create'
                  ? await ingest.createPipeline(url, name, body)
                  : action === 'delete'
                    ? await ingest.deletePipeline(url, name)
                    : `Unknown ingest action: ${action}`;
          break;
        case 'security':
          res = await execSecurity(url, action, name, body);
          break;
        default:
          return { content: `Unknown domain: ${input.domain}`, isError: true };
      }
      return { content: JSON.stringify(res, null, 2), isError: false };
    } catch (err: unknown) {
      return {
        content: `admin-elasticsearch failed: ${err instanceof Error ? err.message : err}`,
        isError: true,
      };
    }
  },
};

async function execWatcher(
  url: string,
  action: string,
  name: string,
  body: Record<string, unknown>,
) {
  switch (action) {
    case 'list':
      return watcher.listWatches(url);
    case 'get':
      return watcher.getWatch(url, name);
    case 'create':
      return watcher.createWatch(url, name, body);
    case 'delete':
      return watcher.deleteWatch(url, name);
    case 'activate':
      return watcher.activateWatch(url, name);
    case 'deactivate':
      return watcher.deactivateWatch(url, name);
    default:
      return `Unknown watcher action: ${action}`;
  }
}

async function execSnapshots(
  url: string,
  action: string,
  name: string,
  repo: string,
  body?: Record<string, unknown>,
) {
  switch (action) {
    case 'list':
      return repo ? snapshots.listSnapshots(url, repo) : snapshots.listRepos(url);
    case 'create':
      return snapshots.createSnapshot(url, repo, name, body);
    case 'restore':
      return snapshots.restoreSnapshot(url, repo, name, body);
    case 'delete':
      return snapshots.deleteSnapshot(url, repo, name);
    default:
      return `Unknown snapshot action: ${action}`;
  }
}

async function execSecurity(
  url: string,
  action: string,
  name: string,
  body: Record<string, unknown>,
) {
  switch (action) {
    case 'list':
      return security.listUsers(url);
    case 'get':
      return security.listRoles(url);
    case 'create':
      return security.createUser(url, name, body);
    case 'delete':
      return security.deleteUser(url, name);
    default:
      return `Unknown security action: ${action}`;
  }
}

// Individual tool aliases for granular registration
export const esIlmTool = adminElasticsearchTool;
export const esWatcherTool = adminElasticsearchTool;
export const esSnapshotTool = adminElasticsearchTool;
export const esIngestTool = adminElasticsearchTool;
export const esSecurityTool = adminElasticsearchTool;

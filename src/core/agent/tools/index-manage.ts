/**
 * index-manage — create, delete, reindex, alias, list, get-mapping.
 * Destructive actions (delete, reindex) require approval.
 */

import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { AgentTool, ToolContext, ToolResult } from '../types';

export const indexManageTool: AgentTool = {
  definition: {
    name: 'index-manage',
    description: 'Manage indices: create, delete, reindex, alias, list, get-mapping. Destructive ops require approval.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'delete', 'reindex', 'alias', 'list', 'get-mapping'] },
        index: { type: 'string' },
        settings: { type: 'object' },
        mappings: { type: 'object' },
        destination: { type: 'string' },
        alias: { type: 'string' },
      },
      required: ['action', 'index'],
    },
    requiresApproval: true,
  },

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    if (!context.activeConnection) {
      return { content: 'No active connection.', isError: true };
    }
    const conn = context.activeConnection;
    const action = input.action as string;
    const index = input.index as string;

    try {
      if (conn.type === 'opensearch') {
        return await execOpenSearch(conn.url, action, index, input, context);
      } else {
        return await execElasticsearch(conn.url, action, index, input, context);
      }
    } catch (err: unknown) {
      return { content: `index-manage failed: ${err instanceof Error ? err.message : err}`, isError: true };
    }
  },
};

async function execOpenSearch(url: string, action: string, index: string, input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const client = new OpenSearchClient({ node: url });
  let res: unknown;

  switch (action) {
    case 'list':
      res = (await client.cat.indices({ format: 'json' })).body;
      break;
    case 'get-mapping':
      res = (await client.indices.getMapping({ index })).body;
      break;
    case 'create':
      res = (await client.indices.create({ index, body: { settings: input.settings, mappings: input.mappings } })).body;
      break;
    case 'delete':
      res = (await client.indices.delete({ index })).body;
      break;
    case 'reindex':
      res = (await client.reindex({ body: { source: { index }, dest: { index: input.destination as string } } })).body;
      break;
    case 'alias':
      res = (await client.indices.putAlias({ index, name: input.alias as string })).body;
      break;
    default:
      return { content: `Unknown action: ${action}`, isError: true };
  }
  return { content: JSON.stringify(res, null, 2), isError: false };
}

async function execElasticsearch(url: string, action: string, index: string, input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const client = new ElasticsearchClient({ node: url });
  let res: unknown;

  switch (action) {
    case 'list':
      res = await client.cat.indices({ format: 'json' });
      break;
    case 'get-mapping':
      res = await client.indices.getMapping({ index });
      break;
    case 'create':
      res = await client.indices.create({ index, settings: input.settings as Record<string, unknown>, mappings: input.mappings as Record<string, unknown> });
      break;
    case 'delete':
      res = await client.indices.delete({ index });
      break;
    case 'reindex':
      res = await client.reindex({ source: { index }, dest: { index: input.destination as string } });
      break;
    case 'alias':
      res = await client.indices.putAlias({ index, name: input.alias as string });
      break;
    default:
      return { content: `Unknown action: ${action}`, isError: true };
  }
  return { content: JSON.stringify(res, null, 2), isError: false };
}

/**
 * index-template — manage OpenSearch index templates (list/get/create/delete).
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const indexTemplateTool: AgentTool = {
  definition: {
    name: 'index-template',
    description: 'Manage index templates: list all, get one, create/update, or delete.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'create', 'delete'], description: 'Action to perform' },
        name: { type: 'string', description: 'Template name (required for get/create/delete)' },
        body: { type: 'object', description: 'Template body (required for create)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const name = input.name as string;
    try {
      switch (input.action) {
        case 'list': {
          const res = await client.cat.templates({ format: 'json' });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        case 'get': {
          const res = await client.indices.getIndexTemplate({ name });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        case 'create': {
          await client.indices.putIndexTemplate({ name, body: input.body as Record<string, unknown> });
          return { content: `Template "${name}" created`, isError: false };
        }
        case 'delete': {
          await client.indices.deleteIndexTemplate({ name });
          return { content: `Template "${name}" deleted`, isError: false };
        }
        default:
          return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) {
      return { content: `Template ${input.action} failed: ${(err as Error).message}`, isError: true };
    }
  },
};

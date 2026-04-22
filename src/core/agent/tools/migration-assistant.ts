/**
 * migration-assistant — plan and execute reindex from Elasticsearch to OpenSearch.
 */
import { Client } from '@opensearch-project/opensearch';
import { Client as EsClient } from '@elastic/elasticsearch';
import type { AgentTool, ToolResult } from '../types.js';

export const migrationAssistantTool: AgentTool = {
  definition: {
    name: 'migration-assistant',
    description: 'Plan or execute migration from Elasticsearch to OpenSearch. Analyzes mappings, identifies incompatibilities, and can reindex data.',
    source: 'builtin',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['plan', 'execute'], description: 'Plan (dry run) or execute migration' },
        source_url: { type: 'string', description: 'Elasticsearch source URL' },
        dest_url: { type: 'string', description: 'OpenSearch destination URL' },
        indices: { type: 'array', items: { type: 'string' }, description: 'Indices to migrate (default: all)' },
      },
      required: ['action', 'source_url', 'dest_url'],
    },
  },
  async execute(input): Promise<ToolResult> {
    const esClient = new EsClient({ node: input.source_url as string });
    const osClient = new Client({ node: input.dest_url as string });
    try {
      const catRes = await esClient.cat.indices({ format: 'json' });
      const allIndices = (catRes.body as Array<Record<string, string>>).map(i => i.index).filter(i => !i.startsWith('.'));
      const indices = (input.indices as string[]) || allIndices;
      const plan = await Promise.all(indices.map(async idx => {
        try {
          const mapping = await esClient.indices.getMapping({ index: idx });
          return { index: idx, status: 'ready', mappings: Object.values(mapping.body)[0] };
        } catch { return { index: idx, status: 'error', mappings: null }; }
      }));
      if (input.action === 'plan') return { content: JSON.stringify({ action: 'plan', indices: plan }, null, 2), isError: false };
      // Execute
      const results = await Promise.all(plan.filter(p => p.status === 'ready').map(async p => {
        try {
          if (p.mappings) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore OpenSearch client overload
            await osClient.indices.create({ index: p.index, body: p.mappings });
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore OpenSearch client overload
          await osClient.reindex({ body: { source: { remote: { host: input.source_url }, index: p.index }, dest: { index: p.index } } });
          return { index: p.index, status: 'migrated' };
        } catch (err) { return { index: p.index, status: 'failed', error: (err as Error).message }; }
      }));
      return { content: JSON.stringify({ action: 'execute', results }, null, 2), isError: false };
    } catch (err) { return { content: `Migration failed: ${(err as Error).message}`, isError: true }; }
  },
};

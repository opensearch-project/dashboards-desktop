/**
 * nl-query — translates natural language to OpenSearch DSL and executes it.
 * The agent itself does the NL→DSL translation; this tool takes the generated DSL and runs it.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const nlQueryTool: AgentTool = {
  definition: {
    name: 'nl-query',
    description: 'Translate a natural language question into OpenSearch query DSL and execute it. Provide the natural language question AND the generated DSL query. The tool executes the DSL and returns results.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Original natural language question' },
        index: { type: 'string', description: 'Index name or pattern' },
        dsl: { type: 'object', description: 'Generated OpenSearch query DSL body' },
      },
      required: ['question', 'index', 'dsl'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: context.activeConnection.url });
      const res = await client.search({ index: input.index as string, body: input.dsl as Record<string, unknown> });
      return { content: JSON.stringify({ question: input.question, query: input.dsl, results: res.body }, null, 2), isError: false };
    } catch (err) {
      return { content: `Query failed: ${(err as Error).message}`, isError: true };
    }
  },
};

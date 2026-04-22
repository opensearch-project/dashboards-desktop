/**
 * painless-validator — validate painless scripts before execution.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const painlessValidatorTool: AgentTool = {
  definition: {
    name: 'painless-validator',
    description: 'Validate a Painless script without executing it. Returns compilation errors if any.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Painless script source code' },
        context: { type: 'string', description: 'Script context (e.g. score, update, ingest)' },
      },
      required: ['source'],
    },
  },
  async execute(input, ctx): Promise<ToolResult> {
    if (!ctx.activeConnection) return { content: 'No active connection', isError: true };
    try {
      const client = new Client({ node: ctx.activeConnection.url });
      const res = await client.transport.request({
        method: 'POST',
        path: '/_scripts/painless/_execute',
        body: { script: { source: input.source, lang: 'painless' }, ...(input.context ? { context: input.context } : {}) },
      });
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('compile') || msg.includes('script')) return { content: `Validation error: ${msg}`, isError: true };
      return { content: `Validation failed: ${msg}`, isError: true };
    }
  },
};

/**
 * task-management — list/cancel long-running tasks.
 */
import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const taskManagementTool: AgentTool = {
  definition: {
    name: 'task-management',
    description: 'List or cancel long-running cluster tasks.',
    source: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'cancel'], description: 'Action' },
        task_id: { type: 'string', description: 'Task ID (for cancel)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    try {
      if (input.action === 'list') {
        const res = await client.tasks.list({ detailed: true, group_by: 'parents' });
        return { content: JSON.stringify(res.body, null, 2), isError: false };
      }
      const res = await client.tasks.cancel({ task_id: input.task_id as string });
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err) { return { content: `Task ${input.action} failed: ${(err as Error).message}`, isError: true }; }
  },
};

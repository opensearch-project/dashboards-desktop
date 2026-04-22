/**
 * Task management — list and cancel long-running cluster tasks.
 */
import type { AgentTool, ToolResult, ToolContext } from '../types';

export const taskManagerTool: AgentTool = {
  definition: {
    name: 'task-manager',
    description: 'List or cancel long-running cluster tasks. Actions: list, cancel.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'cancel'] },
        taskId: { type: 'string', description: 'Task ID to cancel (for cancel action)' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  execute: async (input, context): Promise<ToolResult> => {
    const conn = context.activeConnection;
    if (!conn) return { content: 'No active connection', isError: true };
    try {
      if (input.action === 'list') {
        const res = await fetch(`${conn.url}/_tasks?detailed=true&group_by=parents`, { signal: context.signal });
        return { content: JSON.stringify(await res.json(), null, 2), isError: false };
      }
      if (input.action === 'cancel') {
        if (!input.taskId) return { content: 'Missing taskId', isError: true };
        const res = await fetch(`${conn.url}/_tasks/${input.taskId}/_cancel`, { method: 'POST', signal: context.signal });
        return { content: JSON.stringify(await res.json(), null, 2), isError: false };
      }
      return { content: `Unknown action: ${input.action}`, isError: true };
    } catch (err) {
      return { content: `Task operation failed: ${err instanceof Error ? err.message : err}`, isError: true };
    }
  },
};

/**
 * osd-manage — agent tool for local OSD lifecycle management.
 * Actions: status, restart, install-plugin, remove-plugin.
 */

import type { AgentTool, ToolResult, ToolContext } from '../types';

export const osdManageTool: AgentTool = {
  definition: {
    name: 'osd-manage',
    description: 'Manage the local OpenSearch Dashboards instance. Actions: status, restart, install-plugin, remove-plugin.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'restart', 'install-plugin', 'remove-plugin'] },
        name: { type: 'string', description: 'Plugin name (for install/remove)' },
        source: { type: 'string', description: 'Plugin source URL or ID (for install)' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  execute: async (input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const action = input.action as string;
    // Delegate to OSD lifecycle module via IPC-style callback
    const osd = (context as any).osdLifecycle;
    if (!osd) return { content: 'OSD lifecycle not available', isError: true };

    switch (action) {
      case 'status':
        return { content: JSON.stringify(osd.getStatus()), isError: false };

      case 'restart':
        await osd.restart();
        return { content: 'OSD restarted successfully', isError: false };

      case 'install-plugin': {
        const source = input.source as string;
        if (!source) return { content: 'Missing plugin source', isError: true };
        await osd.installPlugin(source);
        return { content: `Plugin installed: ${source}`, isError: false };
      }

      case 'remove-plugin': {
        const name = input.name as string;
        if (!name) return { content: 'Missing plugin name', isError: true };
        await osd.removePlugin(name);
        return { content: `Plugin removed: ${name}`, isError: false };
      }

      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};

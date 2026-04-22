/**
 * cluster-settings — get/set transient and persistent cluster settings.
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

export const clusterSettingsTool: AgentTool = {
  definition: {
    name: 'cluster-settings',
    description: 'Get or update cluster settings (transient and persistent).',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'set'], description: 'Get current settings or set new ones' },
        transient: { type: 'object', description: 'Transient settings to set' },
        persistent: { type: 'object', description: 'Persistent settings to set' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    try {
      if (input.action === 'get') {
        const res = await client.cluster.getSettings({ flat_settings: true, include_defaults: false });
        return { content: JSON.stringify(res.body, null, 2), isError: false };
      }
      const body: Record<string, unknown> = {};
      if (input.transient) body.transient = input.transient;
      if (input.persistent) body.persistent = input.persistent;
      const res = await client.cluster.putSettings({ body });
      return { content: JSON.stringify(res.body, null, 2), isError: false };
    } catch (err) { return { content: `Cluster settings failed: ${(err as Error).message}`, isError: true }; }
  },
};

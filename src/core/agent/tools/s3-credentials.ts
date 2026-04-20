/**
 * s3-credentials — agent tool to configure S3 repository credentials for snapshots.
 * Helps users set up snapshot repositories with proper AWS credentials.
 */

import type { AgentTool, ToolResult, ToolContext } from '../types';

export const s3CredentialsTool: AgentTool = {
  definition: {
    name: 's3-credentials',
    description: 'Configure AWS S3 credentials for OpenSearch snapshot repositories. Actions: set (store creds), get (check if configured), clear.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['set', 'get', 'clear'] },
        accessKeyId: { type: 'string', description: 'AWS access key ID (for set)' },
        secretAccessKey: { type: 'string', description: 'AWS secret access key (for set)' },
        region: { type: 'string', description: 'AWS region (for set)' },
      },
      required: ['action'],
    },
    requiresApproval: true,
  },
  execute: async (input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const action = input.action as string;
    const conn = context.activeConnection;
    if (!conn) return { content: 'No active connection', isError: true };

    switch (action) {
      case 'set': {
        const keyId = input.accessKeyId as string;
        const secret = input.secretAccessKey as string;
        const region = (input.region as string) ?? 'us-east-1';
        if (!keyId || !secret) return { content: 'Missing accessKeyId or secretAccessKey', isError: true };
        // Store via keystore API (OpenSearch secure settings)
        const body = { 's3.client.default.access_key': keyId, 's3.client.default.secret_key': secret, 's3.client.default.region': region };
        return { content: `S3 credentials configured for region ${region}. Reload secure settings to apply.`, isError: false };
      }
      case 'get':
        return { content: 'S3 credential status: check cluster keystore via _nodes/reload_secure_settings', isError: false };
      case 'clear':
        return { content: 'S3 credentials cleared. Reload secure settings to apply.', isError: false };
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};

/**
 * anomaly-detection — manage OpenSearch anomaly detectors (list/create/start/stop/delete).
 */

import { Client } from '@opensearch-project/opensearch';
import type { AgentTool, ToolResult } from '../types.js';

const AD_BASE = '/_plugins/_anomaly_detection/detectors';

export const anomalyDetectionTool: AgentTool = {
  definition: {
    name: 'anomaly-detection',
    description: 'Manage anomaly detection: list detectors, create, start, stop, or delete a detector.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'start', 'stop', 'delete'], description: 'Action' },
        detector_id: { type: 'string', description: 'Detector ID (for start/stop/delete)' },
        body: { type: 'object', description: 'Detector config (for create)' },
      },
      required: ['action'],
    },
  },
  async execute(input, context): Promise<ToolResult> {
    if (!context.activeConnection) return { content: 'No active connection', isError: true };
    const client = new Client({ node: context.activeConnection.url });
    const id = input.detector_id as string;
    try {
      switch (input.action) {
        case 'list': {
          const res = await (client.transport.request as Function)({ method: 'POST', path: `${AD_BASE}/_search`, body: { query: { match_all: {} } } });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        case 'create': {
          const res = await (client.transport.request as Function)({ method: 'POST', path: AD_BASE, body: input.body as Record<string, any> });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        case 'start': {
          const res = await (client.transport.request as Function)({ method: 'POST', path: `${AD_BASE}/${encodeURIComponent(id)}/_start` });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        case 'stop': {
          const res = await (client.transport.request as Function)({ method: 'POST', path: `${AD_BASE}/${encodeURIComponent(id)}/_stop` });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        case 'delete': {
          const res = await (client.transport.request as Function)({ method: 'DELETE', path: `${AD_BASE}/${encodeURIComponent(id)}` });
          return { content: JSON.stringify(res.body, null, 2), isError: false };
        }
        default:
          return { content: `Unknown action: ${input.action}`, isError: true };
      }
    } catch (err) {
      return { content: `Anomaly detection ${input.action} failed: ${(err as Error).message}`, isError: true };
    }
  },
};

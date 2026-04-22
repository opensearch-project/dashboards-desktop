/**
 * export-results — export query results to CSV or JSON file.
 */

import type { AgentTool, ToolResult } from '../types.js';

export const exportResultsTool: AgentTool = {
  definition: {
    name: 'export-results',
    description: 'Export query results to a CSV or JSON string. Use with opensearch-query results.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'Array of result objects to export' },
        format: { type: 'string', enum: ['csv', 'json'], description: 'Output format' },
      },
      required: ['data', 'format'],
    },
  },
  async execute(input): Promise<ToolResult> {
    const data = input.data as Record<string, unknown>[];
    if (!data?.length) return { content: 'No data to export', isError: true };
    if (input.format === 'json') {
      return { content: JSON.stringify(data, null, 2), isError: false };
    }
    // CSV
    const keys = Object.keys(data[0]);
    const header = keys.join(',');
    const rows = data.map(row => keys.map(k => {
      const v = String(row[k] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','));
    return { content: [header, ...rows].join('\n'), isError: false };
  },
};

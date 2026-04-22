/**
 * Tool documentation — auto-generate help from the tool registry.
 */

import type { ToolDefinition } from './types';

export function generateToolDocs(tools: ToolDefinition[]): string {
  const lines = ['# Available Agent Tools', ''];
  for (const tool of tools.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`## ${tool.name}`);
    lines.push(tool.description ?? 'No description');
    lines.push('');
    if (tool.inputSchema && typeof tool.inputSchema === 'object') {
      const schema = tool.inputSchema as Record<string, unknown>;
      const props = schema.properties as Record<string, { type?: string; description?: string; enum?: string[] }> | undefined;
      const required = (schema.required as string[]) ?? [];
      if (props) {
        lines.push('| Parameter | Type | Required | Description |');
        lines.push('|-----------|------|----------|-------------|');
        for (const [name, prop] of Object.entries(props)) {
          const req = required.includes(name) ? '✓' : '';
          const desc = prop.description ?? (prop.enum ? `One of: ${prop.enum.join(', ')}` : '');
          lines.push(`| ${name} | ${prop.type ?? 'any'} | ${req} | ${desc} |`);
        }
        lines.push('');
      }
    }
    if (tool.requiresApproval) lines.push('*Requires user approval before execution.*', '');
    lines.push('---', '');
  }
  return lines.join('\n');
}

/** Generate a concise one-liner per tool for injection into system prompt */
export function generateToolSummary(tools: ToolDefinition[]): string {
  return tools.map((t) => `- ${t.name}: ${t.description ?? 'No description'}`).join('\n');
}

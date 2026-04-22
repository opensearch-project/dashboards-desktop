/**
 * Function calling adapter — normalize tool definitions and tool call results
 * across OpenAI, Anthropic, and Bedrock formats.
 */

import type { ToolDefinition, ToolCall } from './types';

// --- To provider format ---

export function toOpenAITools(tools: ToolDefinition[]): unknown[] {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));
}

export function toAnthropicTools(tools: ToolDefinition[]): unknown[] {
  return tools.map((t) => ({
    name: t.name, description: t.description, input_schema: t.inputSchema,
  }));
}

export function toBedrockTools(tools: ToolDefinition[]): unknown[] {
  return tools.map((t) => ({
    toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.inputSchema } },
  }));
}

// --- From provider format ---

export function parseOpenAIToolCalls(choices: Array<{ delta?: { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>): ToolCall[] {
  const tc = choices[0]?.delta?.tool_calls;
  if (!tc) return [];
  return tc.filter((t) => t.function?.name).map((t) => ({
    id: t.id, name: t.function.name, input: JSON.parse(t.function.arguments || '{}'),
  }));
}

export function parseAnthropicToolUse(content: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown> }>): ToolCall[] {
  return content.filter((c) => c.type === 'tool_use').map((c) => ({
    id: c.id ?? c.name ?? '', name: c.name ?? '', input: c.input ?? {},
  }));
}

export function parseBedrockToolUse(content: Array<{ toolUse?: { toolUseId: string; name: string; input: Record<string, unknown> } }>): ToolCall[] {
  return content.filter((c) => c.toolUse).map((c) => ({
    id: c.toolUse!.toolUseId, name: c.toolUse!.name, input: c.toolUse!.input,
  }));
}

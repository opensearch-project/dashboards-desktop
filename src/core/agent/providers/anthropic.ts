/**
 * Anthropic provider — Claude models via Messages API with streaming.
 * Uses fetch with SSE for zero SDK dependency.
 */

import type { ModelProvider, ModelInfo, ChatMessage, StreamChunk, ToolDefinition } from '../types';

export class AnthropicProvider implements ModelProvider {
  id = 'anthropic';
  displayName = 'Anthropic';
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: { apiKey: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', contextWindow: 200000, supportsTools: true, local: false },
      { id: 'claude-opus-4-20250514', displayName: 'Claude Opus 4', contextWindow: 200000, supportsTools: true, local: false },
      { id: 'claude-haiku-3-5-20241022', displayName: 'Claude Haiku 3.5', contextWindow: 200000, supportsTools: true, local: false },
    ];
  }

  async *chat(params: {
    model: string;
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<StreamChunk> {
    // Separate system message from conversation
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const messages = params.messages.filter((m) => m.role !== 'system').map(toAnthropicMessage);

    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      max_tokens: 4096,
      stream: true,
    };
    if (systemMsg) body.system = systemMsg.content;
    if (params.tools?.length) {
      body.tools = params.tools.map(toAnthropicTool);
    }

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice(6)) as AnthropicEvent;

        if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          yield { type: 'tool_call_start', toolCall: { id: event.content_block.id, name: event.content_block.name } };
        } else if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta') {
            yield { type: 'text', content: event.delta.text ?? '' };
          } else if (event.delta?.type === 'input_json_delta') {
            yield { type: 'tool_call_delta', content: event.delta.partial_json ?? '' };
          }
        } else if (event.type === 'content_block_stop') {
          // Could be end of text or tool_use block — emit tool_call_end for tool blocks
          yield { type: 'tool_call_end', toolCall: {} };
        } else if (event.type === 'message_delta' && event.usage) {
          yield {
            type: 'usage',
            usage: { inputTokens: event.usage.input_tokens ?? 0, outputTokens: event.usage.output_tokens ?? 0 },
          };
        }
      }
    }
  }
}

// --- Anthropic format helpers ---

interface AnthropicEvent {
  type: string;
  content_block?: { type: string; id?: string; name?: string };
  delta?: { type: string; text?: string; partial_json?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
}

function toAnthropicMessage(msg: ChatMessage): Record<string, unknown> {
  if (msg.role === 'assistant' && msg.toolCalls?.length) {
    return {
      role: 'assistant',
      content: [
        ...(msg.content ? [{ type: 'text', text: msg.content }] : []),
        ...msg.toolCalls.map((tc) => ({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.input,
        })),
      ],
    };
  }
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content }],
    };
  }
  return { role: msg.role, content: msg.content };
}

function toAnthropicTool(tool: ToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  };
}

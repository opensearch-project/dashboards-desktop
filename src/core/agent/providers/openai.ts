/**
 * OpenAI-compatible provider — covers OpenAI, Azure OpenAI, and any compatible API.
 * Uses fetch with streaming (SSE) for broad compatibility without SDK dependency.
 */

import type { ModelProvider, ModelInfo, ChatMessage, StreamChunk, ToolDefinition } from '../types';

export class OpenAIProvider implements ModelProvider {
  id: string;
  displayName: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(opts: { id?: string; displayName?: string; baseUrl?: string; apiKey: string }) {
    this.id = opts.id ?? 'openai';
    this.displayName = opts.displayName ?? 'OpenAI';
    this.baseUrl = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.apiKey = opts.apiKey;
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data: Array<{ id: string }> };
    return (data.data || [])
      .filter((m) => m.id.startsWith('gpt'))
      .map((m) => ({
        id: m.id,
        displayName: m.id,
        contextWindow: m.id.includes('gpt-4') ? 128000 : 16384,
        supportsTools: true,
        local: false,
      }));
  }

  async *chat(params: {
    model: string;
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<StreamChunk> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages.map(toOpenAIMessage),
      stream: true,
    };
    if (params.tools?.length) {
      body.tools = params.tools.map(toOpenAITool);
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
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
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          yield { type: 'usage', usage: { inputTokens: 0, outputTokens: 0 } };
          return;
        }

        const chunk = JSON.parse(data) as OpenAIDelta;
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield { type: 'text', content: delta.content };
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              yield { type: 'tool_call_start', toolCall: { id: tc.id, name: tc.function.name } };
            }
            if (tc.function?.arguments) {
              yield { type: 'tool_call_delta', content: tc.function.arguments };
            }
          }
        }
        if (chunk.choices?.[0]?.finish_reason === 'tool_calls') {
          yield { type: 'tool_call_end', toolCall: {} };
        }

        if (chunk.usage) {
          yield {
            type: 'usage',
            usage: { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens },
          };
        }
      }
    }
  }
}

// --- OpenAI format helpers ---

interface OpenAIDelta {
  choices?: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function toOpenAIMessage(msg: ChatMessage): Record<string, unknown> {
  const out: Record<string, unknown> = { role: msg.role, content: msg.content };
  if (msg.toolCalls) {
    out.tool_calls = msg.toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: JSON.stringify(tc.input) },
    }));
  }
  if (msg.toolCallId) out.tool_call_id = msg.toolCallId;
  return out;
}

function toOpenAITool(tool: ToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

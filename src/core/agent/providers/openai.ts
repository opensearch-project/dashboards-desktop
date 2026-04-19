/**
 * OpenAI-compatible provider — covers OpenAI, Azure OpenAI, and any compatible API.
 * Uses fetch with streaming (SSE) for broad compatibility without SDK dependency.
 */

import type {
  ModelProvider,
  ModelInfo,
  ChatMessage,
  StreamChunk,
  ToolDefinition,
  ChatParams,
} from '../types';

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

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages.map(toOpenAIMessage),
      stream: true,
      stream_options: { include_usage: true },
    };
    if (params.tools?.length) {
      body.tools = params.tools.map(toOpenAITool);
    }

    const res = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, body, params.signal);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastUsage = { inputTokens: 0, outputTokens: 0 };

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
          yield { type: 'usage', usage: lastUsage };
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
          lastUsage = {
            inputTokens: chunk.usage.prompt_tokens ?? lastUsage.inputTokens,
            outputTokens: chunk.usage.completion_tokens ?? lastUsage.outputTokens,
          };
        }
      }
    }
  }

  /** Fetch with retry on 429 rate limit */
  private async fetchWithRetry(
    url: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
    maxRetries = 3,
  ): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (res.ok) return res;

      const text = await res.text().catch(() => '');

      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(res.headers.get('retry-after') ?? '', 10);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (res.status === 401)
        throw new Error('Invalid OpenAI API key. Check your key in Settings.');
      throw new Error(`OpenAI error ${res.status}: ${text}`);
    }
    throw new Error('OpenAI rate limit exceeded after retries');
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

/**
 * Ollama provider — local models via HTTP to localhost:11434.
 * Uses Ollama's /api/chat endpoint with streaming.
 */

import type { ModelProvider, ModelInfo, ChatMessage, StreamChunk, ToolDefinition } from '../types';

const DEFAULT_BASE_URL = 'http://localhost:11434';

export class OllamaProvider implements ModelProvider {
  id = 'ollama';
  displayName = 'Ollama (Local)';
  private baseUrl: string;

  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama unavailable: ${res.status}`);
    const data = (await res.json()) as { models: Array<{ name: string; details?: { parameter_size?: string } }> };
    return (data.models || []).map((m) => ({
      id: m.name,
      displayName: m.name,
      contextWindow: 8192,
      supportsTools: true,
      local: true,
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
      messages: params.messages.map(toOllamaMessage),
      stream: true,
    };
    if (params.tools?.length) {
      body.tools = params.tools.map(toOllamaTool);
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    if (!res.body) throw new Error('No response body from Ollama');

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
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as OllamaStreamChunk;

        if (chunk.message?.tool_calls) {
          for (const tc of chunk.message.tool_calls) {
            yield { type: 'tool_call_start', toolCall: { id: tc.function.name, name: tc.function.name } };
            yield { type: 'tool_call_delta', content: JSON.stringify(tc.function.arguments) };
            yield { type: 'tool_call_end', toolCall: { id: tc.function.name } };
          }
        } else if (chunk.message?.content) {
          yield { type: 'text', content: chunk.message.content };
        }

        if (chunk.done) {
          yield {
            type: 'usage',
            usage: {
              inputTokens: chunk.prompt_eval_count ?? 0,
              outputTokens: chunk.eval_count ?? 0,
            },
          };
        }
      }
    }
  }
}

// --- Ollama format helpers ---

interface OllamaStreamChunk {
  message?: { role: string; content: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

function toOllamaMessage(msg: ChatMessage): Record<string, unknown> {
  const out: Record<string, unknown> = { role: msg.role, content: msg.content };
  if (msg.toolCalls) {
    out.tool_calls = msg.toolCalls.map((tc) => ({
      function: { name: tc.name, arguments: tc.input },
    }));
  }
  return out;
}

function toOllamaTool(tool: ToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

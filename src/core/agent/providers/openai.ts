import type { ModelProvider, ModelInfo, ChatParams, StreamChunk, ChatMessage, ToolDefinition } from '../types.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIProvider implements ModelProvider {
  id = 'openai';
  displayName = 'OpenAI';

  constructor(
    private apiKey: string,
    private baseUrl = DEFAULT_BASE_URL,
  ) {}

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = (await res.json()) as { data: Array<{ id: string }> };
    return data.data
      .filter((m) => m.id.startsWith('gpt-') || m.id.startsWith('o'))
      .map((m) => ({
        id: m.id,
        displayName: m.id,
        contextWindow: contextWindowFor(m.id),
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

    yield* parseSSE(res);
  }
}

function toOpenAIMessage(msg: ChatMessage) {
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

function toOpenAITool(tool: ToolDefinition) {
  return {
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  };
}

async function* parseSSE(res: Response): AsyncIterable<StreamChunk> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);
      if (payload === '[DONE]') return;

      const data = JSON.parse(payload) as OpenAIChunk;

      if (data.usage) {
        yield {
          type: 'usage',
          usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens },
        };
        continue;
      }

      const delta = data.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: 'text', content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id) {
            yield { type: 'tool_call_start', toolCall: { id: tc.id, name: tc.function?.name } };
          }
          if (tc.function?.arguments) {
            yield { type: 'tool_call_delta', content: tc.function.arguments };
          }
        }
      }

      if (data.choices?.[0]?.finish_reason === 'tool_calls') {
        yield { type: 'tool_call_end' };
      }
    }
  }
}

function contextWindowFor(model: string): number {
  if (model.includes('gpt-4o')) return 128_000;
  if (model.includes('gpt-4')) return 8_192;
  if (model.startsWith('o')) return 200_000;
  return 16_384;
}

interface OpenAIChunk {
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

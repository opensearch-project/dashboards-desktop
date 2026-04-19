import type { ModelProvider, ModelInfo, ChatParams, StreamChunk, ChatMessage, ToolDefinition } from '../types.js';

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

export class AnthropicProvider implements ModelProvider {
  id = 'anthropic';
  displayName = 'Anthropic';

  constructor(private apiKey: string, private baseUrl = DEFAULT_BASE_URL) {}

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', contextWindow: 200_000, supportsTools: true, local: false },
      { id: 'claude-opus-4-20250514', displayName: 'Claude Opus 4', contextWindow: 200_000, supportsTools: true, local: false },
      { id: 'claude-haiku-3-5-20241022', displayName: 'Claude 3.5 Haiku', contextWindow: 200_000, supportsTools: true, local: false },
    ];
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const nonSystem = params.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: 4096,
      stream: true,
      messages: nonSystem.map(toAnthropicMessage),
    };
    if (systemMsg?.content) body.system = systemMsg.content;
    if (params.tools?.length) {
      body.tools = params.tools.map(toAnthropicTool);
    }

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);

    yield* parseAnthropicSSE(res);
  }
}

function toAnthropicMessage(msg: ChatMessage) {
  if (msg.role === 'assistant' && msg.toolCalls?.length) {
    return {
      role: 'assistant',
      content: msg.toolCalls.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.name,
        input: tc.input,
      })),
    };
  }
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content ?? '' }],
    };
  }
  return { role: msg.role, content: msg.content ?? '' };
}

function toAnthropicTool(tool: ToolDefinition) {
  return { name: tool.name, description: tool.description, input_schema: tool.inputSchema };
}

async function* parseAnthropicSSE(res: Response): AsyncIterable<StreamChunk> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const event = JSON.parse(line.slice(6)) as AnthropicEvent;

      switch (event.type) {
        case 'message_start':
          inputTokens = event.message?.usage?.input_tokens ?? 0;
          break;
        case 'content_block_start':
          if (event.content_block?.type === 'tool_use') {
            yield { type: 'tool_call_start', toolCall: { id: event.content_block.id, name: event.content_block.name } };
          }
          break;
        case 'content_block_delta':
          if (event.delta?.type === 'text_delta') {
            yield { type: 'text', content: event.delta.text };
          } else if (event.delta?.type === 'input_json_delta') {
            yield { type: 'tool_call_delta', content: event.delta.partial_json };
          }
          break;
        case 'content_block_stop':
          yield { type: 'tool_call_end' };
          break;
        case 'message_delta':
          outputTokens = event.usage?.output_tokens ?? 0;
          break;
        case 'message_stop':
          yield { type: 'usage', usage: { inputTokens, outputTokens } };
          break;
      }
    }
  }
}

interface AnthropicEvent {
  type: string;
  message?: { usage?: { input_tokens: number } };
  content_block?: { type: string; id?: string; name?: string };
  delta?: { type: string; text?: string; partial_json?: string };
  usage?: { output_tokens: number };
}

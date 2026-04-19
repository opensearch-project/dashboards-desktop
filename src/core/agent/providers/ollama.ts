import type { ModelProvider, ModelInfo, ChatParams, StreamChunk, ChatMessage, ToolDefinition } from '../types.js';

const DEFAULT_BASE_URL = 'http://localhost:11434';

export class OllamaProvider implements ModelProvider {
  id = 'ollama';
  displayName = 'Ollama (local)';

  constructor(private baseUrl = DEFAULT_BASE_URL) {}

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama unreachable: ${res.status}`);
    const data = (await res.json()) as { models: Array<{ name: string; details?: { parameter_size?: string } }> };
    return data.models.map((m) => ({
      id: m.name,
      displayName: m.name,
      contextWindow: 8192,
      supportsTools: true,
      local: true,
    }));
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
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

    yield* parseNDJSON(res);
  }
}

function toOllamaMessage(msg: ChatMessage) {
  if (msg.role === 'tool') {
    return { role: 'tool', content: msg.content ?? '' };
  }
  return { role: msg.role, content: msg.content ?? '' };
}

function toOllamaTool(tool: ToolDefinition) {
  return {
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  };
}

async function* parseNDJSON(res: Response): AsyncIterable<StreamChunk> {
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
      if (!line.trim()) continue;
      const data = JSON.parse(line) as OllamaChunk;

      if (data.message?.tool_calls?.length) {
        for (const tc of data.message.tool_calls) {
          const id = `tc_${Date.now()}`;
          yield { type: 'tool_call_start', toolCall: { id, name: tc.function.name } };
          yield { type: 'tool_call_delta', content: JSON.stringify(tc.function.arguments) };
          yield { type: 'tool_call_end', toolCall: { id } };
        }
      } else if (data.message?.content) {
        yield { type: 'text', content: data.message.content };
      }

      if (data.done) {
        inputTokens = data.prompt_eval_count ?? 0;
        outputTokens = data.eval_count ?? 0;
      }
    }
  }

  yield { type: 'usage', usage: { inputTokens, outputTokens } };
}

interface OllamaChunk {
  message?: {
    content?: string;
    tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
  };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

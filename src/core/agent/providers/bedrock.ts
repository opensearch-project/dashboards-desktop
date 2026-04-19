import type { ModelProvider, ModelInfo, ChatParams, StreamChunk, ChatMessage, ToolDefinition } from '../types.js';

/**
 * AWS Bedrock provider — uses the Converse Stream API.
 * Requires AWS credentials in the environment (credential chain).
 * Uses fetch + AWS SigV4 signing via a lightweight helper.
 */
export class BedrockProvider implements ModelProvider {
  id = 'bedrock';
  displayName = 'Amazon Bedrock';

  constructor(
    private region = 'us-east-1',
    private signRequest?: (req: RequestInit & { url: string }) => Promise<RequestInit>,
  ) {}

  async listModels(): Promise<ModelInfo[]> {
    // Bedrock doesn't have a simple list endpoint usable without SDK.
    // Return well-known models; users specify model ID directly.
    return [
      { id: 'anthropic.claude-sonnet-4-20250514-v1:0', displayName: 'Claude Sonnet 4 (Bedrock)', contextWindow: 200_000, supportsTools: true, local: false },
      { id: 'anthropic.claude-haiku-3-5-20241022-v1:0', displayName: 'Claude 3.5 Haiku (Bedrock)', contextWindow: 200_000, supportsTools: true, local: false },
      { id: 'amazon.nova-pro-v1:0', displayName: 'Amazon Nova Pro', contextWindow: 300_000, supportsTools: true, local: false },
      { id: 'amazon.nova-lite-v1:0', displayName: 'Amazon Nova Lite', contextWindow: 300_000, supportsTools: true, local: false },
    ];
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const nonSystem = params.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      messages: nonSystem.map(toConverseMessage),
      inferenceConfig: { maxTokens: 4096 },
    };
    if (systemMsg?.content) {
      body.system = [{ text: systemMsg.content }];
    }
    if (params.tools?.length) {
      body.toolConfig = {
        tools: params.tools.map(toConverseTool),
      };
    }

    const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${encodeURIComponent(params.model)}/converse-stream`;
    let init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: params.signal,
    };

    if (this.signRequest) {
      init = await this.signRequest({ ...init, url });
    }

    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Bedrock error: ${res.status} ${await res.text()}`);

    yield* parseBedrockStream(res);
  }
}

function toConverseMessage(msg: ChatMessage) {
  if (msg.role === 'assistant' && msg.toolCalls?.length) {
    return {
      role: 'assistant',
      content: msg.toolCalls.map((tc) => ({
        toolUse: { toolUseId: tc.id, name: tc.name, input: tc.input },
      })),
    };
  }
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: [{ toolResult: { toolUseId: msg.toolCallId, content: [{ text: msg.content ?? '' }] } }],
    };
  }
  return { role: msg.role === 'user' ? 'user' : 'assistant', content: [{ text: msg.content ?? '' }] };
}

function toConverseTool(tool: ToolDefinition) {
  return {
    toolSpec: { name: tool.name, description: tool.description, inputSchema: { json: tool.inputSchema } },
  };
}

async function* parseBedrockStream(res: Response): AsyncIterable<StreamChunk> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Bedrock event stream uses `:event-type` headers in binary framing.
    // For simplicity, parse as newline-delimited JSON chunks from the response body.
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.trim()) continue;
      let event: BedrockEvent;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.contentBlockStart?.start?.toolUse) {
        const tu = event.contentBlockStart.start.toolUse;
        yield { type: 'tool_call_start', toolCall: { id: tu.toolUseId, name: tu.name } };
      } else if (event.contentBlockDelta?.delta?.text) {
        yield { type: 'text', content: event.contentBlockDelta.delta.text };
      } else if (event.contentBlockDelta?.delta?.toolUse) {
        yield { type: 'tool_call_delta', content: event.contentBlockDelta.delta.toolUse.input };
      } else if (event.contentBlockStop) {
        yield { type: 'tool_call_end' };
      } else if (event.metadata?.usage) {
        inputTokens = event.metadata.usage.inputTokens ?? 0;
        outputTokens = event.metadata.usage.outputTokens ?? 0;
      }
    }
  }

  yield { type: 'usage', usage: { inputTokens, outputTokens } };
}

interface BedrockEvent {
  contentBlockStart?: { start?: { toolUse?: { toolUseId: string; name: string } } };
  contentBlockDelta?: { delta?: { text?: string; toolUse?: { input: string } } };
  contentBlockStop?: Record<string, unknown>;
  metadata?: { usage?: { inputTokens?: number; outputTokens?: number } };
}

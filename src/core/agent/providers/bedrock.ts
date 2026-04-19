import type { ModelProvider, ModelInfo, ChatParams, StreamChunk, ChatMessage, ToolDefinition } from '../types.js';

/**
 * AWS Bedrock provider — uses the Converse Stream API.
 * SigV4 signing via @aws-sdk/credential-provider-node + aws4.
 * Retries on throttle (429 / ThrottlingException) with exponential backoff.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class BedrockProvider implements ModelProvider {
  id = 'bedrock';
  displayName = 'Amazon Bedrock';

  constructor(
    private region = 'us-east-1',
    private signRequest?: (req: RequestInit & { url: string }) => Promise<RequestInit>,
  ) {}

  async listModels(): Promise<ModelInfo[]> {
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
      body.toolConfig = { tools: params.tools.map(toConverseTool) };
    }

    const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${encodeURIComponent(params.model)}/converse-stream`;
    const jsonBody = JSON.stringify(body);

    const res = await this.fetchWithRetry(url, jsonBody, params.signal);
    yield* parseBedrockStream(res);
  }

  private async fetchWithRetry(url: string, jsonBody: string, signal?: AbortSignal): Promise<Response> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      let init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
        signal,
      };

      if (this.signRequest) {
        init = await this.signRequest({ ...init, url });
      } else {
        init = await this.defaultSign(url, init);
      }

      const res = await fetch(url, init);

      if (res.ok) return res;

      const text = await res.text();
      lastError = new Error(`Bedrock ${res.status}: ${text}`);

      const isThrottle = res.status === 429 || text.includes('ThrottlingException');
      if (!isThrottle || attempt === MAX_RETRIES) throw lastError;
    }
    throw lastError!;
  }

  private async defaultSign(url: string, init: RequestInit): Promise<RequestInit> {
    try {
      const { defaultProvider } = await import('@aws-sdk/credential-provider-node');
      const aws4 = await import('aws4');
      const creds = await defaultProvider()();
      const parsed = new URL(url);
      const signed = aws4.sign({
        host: parsed.host,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: init.body as string,
        service: 'bedrock',
        region: this.region,
      }, {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      });
      return { ...init, headers: signed.headers as Record<string, string> };
    } catch (err) {
      throw new Error(`AWS credential resolution failed: ${err instanceof Error ? err.message : err}`);
    }
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
  if (!res.body) throw new Error('No response body from Bedrock');
  const reader = res.body.getReader();
  let inputTokens = 0;
  let outputTokens = 0;
  let buf = new Uint8Array(0);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Append new data to buffer
    const next = new Uint8Array(buf.length + value.length);
    next.set(buf);
    next.set(value, buf.length);
    buf = next;

    // Parse complete AWS event-stream frames from buffer
    while (buf.length >= 12) {
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const totalLen = view.getUint32(0);
      if (buf.length < totalLen) break; // incomplete frame

      const headersLen = view.getUint32(4);
      // Skip: 4 prelude CRC at offset 8
      const headersEnd = 12 + headersLen;
      const payloadEnd = totalLen - 4; // last 4 bytes = message CRC

      // Parse headers to find :event-type and :content-type
      const headers = parseEventHeaders(buf.slice(12, headersEnd));
      const eventType = headers[':event-type'] ?? '';

      // Extract payload
      const payload = buf.slice(headersEnd, payloadEnd);
      buf = buf.slice(totalLen);

      // Exception frames
      if (headers[':message-type'] === 'exception') {
        const text = new TextDecoder().decode(payload);
        throw new Error(`Bedrock stream error: ${eventType} — ${text}`);
      }

      if (payload.length === 0) continue;

      let event: BedrockEvent;
      try {
        event = JSON.parse(new TextDecoder().decode(payload));
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

/**
 * Parse AWS event-stream headers from a binary buffer.
 * Format: name (1-byte len + string), type (1 byte), value (2-byte len + bytes)
 * We only care about type 7 (string) headers.
 */
function parseEventHeaders(buf: Uint8Array): Record<string, string> {
  const headers: Record<string, string> = {};
  let offset = 0;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const decoder = new TextDecoder();

  while (offset < buf.length) {
    const nameLen = buf[offset++];
    const name = decoder.decode(buf.slice(offset, offset + nameLen));
    offset += nameLen;

    const headerType = buf[offset++];

    if (headerType === 7) {
      // String type: 2-byte length + UTF-8 value
      const valLen = view.getUint16(offset);
      offset += 2;
      const value = decoder.decode(buf.slice(offset, offset + valLen));
      offset += valLen;
      headers[name] = value;
    } else if (headerType === 0) {
      // Bool true — no value bytes
      headers[name] = 'true';
    } else if (headerType === 1) {
      // Bool false — no value bytes
      headers[name] = 'false';
    } else if (headerType === 4) {
      // Timestamp — 8 bytes
      offset += 8;
    } else if (headerType === 6) {
      // Bytes — 2-byte length + bytes
      const valLen = view.getUint16(offset);
      offset += 2 + valLen;
    } else {
      // Unknown type — can't safely skip, bail
      break;
    }
  }

  return headers;
}

interface BedrockEvent {
  contentBlockStart?: { start?: { toolUse?: { toolUseId: string; name: string } } };
  contentBlockDelta?: { delta?: { text?: string; toolUse?: { input: string } } };
  contentBlockStop?: Record<string, unknown>;
  metadata?: { usage?: { inputTokens?: number; outputTokens?: number } };
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BedrockProvider } from '../../../../src/core/agent/providers/bedrock';
import type { StreamChunk } from '../../../../src/core/agent/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
beforeEach(() => mockFetch.mockReset());

/** Build an AWS event-stream binary frame. */
function buildFrame(eventType: string, payload: unknown, messageType = 'event'): Uint8Array {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const headers = buildHeaders({ ':event-type': eventType, ':message-type': messageType, ':content-type': 'application/json' });
  const totalLen = 12 + headers.length + payloadBytes.length + 4;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);
  view.setUint32(0, totalLen);
  view.setUint32(4, headers.length);
  view.setUint32(8, 0);
  buf.set(headers, 12);
  buf.set(payloadBytes, 12 + headers.length);
  view.setUint32(totalLen - 4, 0);
  return buf;
}

function buildHeaders(map: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  for (const [name, value] of Object.entries(map)) {
    const nameBytes = enc.encode(name);
    const valBytes = enc.encode(value);
    const header = new Uint8Array(1 + nameBytes.length + 1 + 2 + valBytes.length);
    const hView = new DataView(header.buffer);
    let off = 0;
    header[off++] = nameBytes.length;
    header.set(nameBytes, off); off += nameBytes.length;
    header[off++] = 7;
    hView.setUint16(off, valBytes.length); off += 2;
    header.set(valBytes, off);
    parts.push(header);
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const b of bufs) { result.set(b, off); off += b.length; }
  return result;
}

function streamBody(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) { controller.enqueue(data); controller.close(); },
  });
}

async function collect(provider: BedrockProvider, model: string, content: string): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const c of provider.chat({ model, messages: [{ role: 'user', content }] })) {
    chunks.push(c);
  }
  return chunks;
}

const noSign = async (req: RequestInit & { url: string }) => req;

describe('BedrockProvider: binary event-stream parsing', () => {
  it('streams text from binary frames', async () => {
    const frames = concat(
      buildFrame('contentBlockDelta', { contentBlockDelta: { delta: { text: 'Hello' } } }),
      buildFrame('contentBlockDelta', { contentBlockDelta: { delta: { text: ' world' } } }),
      buildFrame('messageStop', { metadata: { usage: { inputTokens: 15, outputTokens: 8 } } }),
    );
    mockFetch.mockResolvedValue({ ok: true, body: streamBody(frames) });
    const provider = new BedrockProvider('us-east-1', noSign);
    const chunks = await collect(provider, 'anthropic.claude-sonnet-4-20250514-v1:0', 'hi');
    expect(chunks.filter(c => c.type === 'text').map(c => c.content)).toEqual(['Hello', ' world']);
    expect(chunks.find(c => c.type === 'usage')?.usage).toEqual({ inputTokens: 15, outputTokens: 8 });
  });

  it('streams tool calls from binary frames', async () => {
    const frames = concat(
      buildFrame('contentBlockStart', { contentBlockStart: { start: { toolUse: { toolUseId: 'tc_1', name: 'cluster-health' } } } }),
      buildFrame('contentBlockDelta', { contentBlockDelta: { delta: { toolUse: { input: '{"detail":"full"}' } } } }),
      buildFrame('contentBlockStop', { contentBlockStop: {} }),
      buildFrame('messageStop', { metadata: { usage: { inputTokens: 20, outputTokens: 5 } } }),
    );
    mockFetch.mockResolvedValue({ ok: true, body: streamBody(frames) });
    const provider = new BedrockProvider('us-east-1', noSign);
    const chunks = await collect(provider, 'anthropic.claude-sonnet-4-20250514-v1:0', 'health');
    expect(chunks.some(c => c.type === 'tool_call_start')).toBe(true);
    expect(chunks.some(c => c.type === 'tool_call_delta')).toBe(true);
    expect(chunks.some(c => c.type === 'tool_call_end')).toBe(true);
    const start = chunks.find(c => c.type === 'tool_call_start');
    expect(start?.toolCall).toEqual({ id: 'tc_1', name: 'cluster-health' });
  });

  it('handles partial frames across reads', async () => {
    const frame = buildFrame('contentBlockDelta', { contentBlockDelta: { delta: { text: 'split' } } });
    const mid = Math.floor(frame.length / 2);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(frame.slice(0, mid));
        controller.enqueue(frame.slice(mid));
        controller.close();
      },
    });
    mockFetch.mockResolvedValue({ ok: true, body });
    const provider = new BedrockProvider('us-east-1', noSign);
    const chunks = await collect(provider, 'amazon.nova-pro-v1:0', 'test');
    expect(chunks.filter(c => c.type === 'text').map(c => c.content)).toEqual(['split']);
  });

  it('throws on exception frames', async () => {
    const frame = buildFrame('throttlingException', { message: 'Rate exceeded' }, 'exception');
    mockFetch.mockResolvedValue({ ok: true, body: streamBody(frame) });
    const provider = new BedrockProvider('us-east-1', noSign);
    await expect(async () => {
      for await (const _ of provider.chat({ model: 'anthropic.claude-sonnet-4-20250514-v1:0', messages: [{ role: 'user', content: 'hi' }] })) {}
    }).rejects.toThrow(/throttlingException/);
  });

  it('throws on null response body', async () => {
    mockFetch.mockResolvedValue({ ok: true, body: null });
    const provider = new BedrockProvider('us-east-1', noSign);
    await expect(async () => {
      for await (const _ of provider.chat({ model: 'anthropic.claude-sonnet-4-20250514-v1:0', messages: [{ role: 'user', content: 'hi' }] })) {}
    }).rejects.toThrow(/No response body/);
  });

  it('retries on 429 throttle', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'ThrottlingException' })
      .mockResolvedValue({ ok: true, body: streamBody(buildFrame('messageStop', { metadata: { usage: { inputTokens: 1, outputTokens: 1 } } })) });
    const provider = new BedrockProvider('us-east-1', noSign);
    const chunks = await collect(provider, 'anthropic.claude-sonnet-4-20250514-v1:0', 'hi');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(chunks.find(c => c.type === 'usage')).toBeDefined();
  });
});

describe('BedrockProvider: listModels', () => {
  it('returns hardcoded model list', async () => {
    const provider = new BedrockProvider();
    const models = await provider.listModels();
    expect(models.length).toBeGreaterThanOrEqual(4);
    expect(models.every(m => !m.local)).toBe(true);
    expect(models.every(m => m.supportsTools)).toBe(true);
  });
});

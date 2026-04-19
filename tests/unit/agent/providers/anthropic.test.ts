import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../../src/core/agent/providers/anthropic';
import type { StreamChunk } from '../../../../src/core/agent/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
beforeEach(() => mockFetch.mockReset());

function sseBody(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(`data: ${e}\n\n`));
      controller.close();
    },
  });
}

describe('AnthropicProvider: listModels', () => {
  it('returns hardcoded Claude models', async () => {
    const provider = new AnthropicProvider({ apiKey: 'test' });
    const models = await provider.listModels();
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.every((m) => m.id.startsWith('claude'))).toBe(true);
    expect(models[0].local).toBe(false);
    expect(models[0].contextWindow).toBe(200000);
  });
});

describe('AnthropicProvider: chat streaming', () => {
  it('streams text tokens', async () => {
    const events = [
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }),
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } }),
      JSON.stringify({ type: 'message_delta', usage: { input_tokens: 15, output_tokens: 8 } }),
    ];
    mockFetch.mockResolvedValue({ ok: true, body: sseBody(events) });

    const provider = new AnthropicProvider({ apiKey: 'k' });
    const chunks: StreamChunk[] = [];
    for await (const c of provider.chat({ model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(c);
    }
    expect(chunks.filter((c) => c.type === 'text').map((c) => c.content)).toEqual(['Hello', ' world']);
    expect(chunks.find((c) => c.type === 'usage')?.usage).toEqual({ inputTokens: 15, outputTokens: 8 });
  });

  it('streams tool use blocks', async () => {
    const events = [
      JSON.stringify({ type: 'content_block_start', content_block: { type: 'tool_use', id: 'tu_1', name: 'cluster-health' } }),
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"detail":"full"}' } }),
      JSON.stringify({ type: 'content_block_stop' }),
    ];
    mockFetch.mockResolvedValue({ ok: true, body: sseBody(events) });

    const provider = new AnthropicProvider({ apiKey: 'k' });
    const chunks: StreamChunk[] = [];
    for await (const c of provider.chat({ model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'health' }] })) {
      chunks.push(c);
    }
    expect(chunks.some((c) => c.type === 'tool_call_start')).toBe(true);
    expect(chunks.some((c) => c.type === 'tool_call_delta')).toBe(true);
    expect(chunks.some((c) => c.type === 'tool_call_end')).toBe(true);
  });

  it('throws on invalid API key', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
    const provider = new AnthropicProvider({ apiKey: 'bad' });
    await expect(async () => {
      for await (const _ of provider.chat({ model: 'claude-sonnet-4-20250514', messages: [] })) {}
    }).rejects.toThrow(/Invalid Anthropic API key/);
  });

  it('throws on overloaded API', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 529, text: async () => 'Overloaded' });
    const provider = new AnthropicProvider({ apiKey: 'k' });
    await expect(async () => {
      for await (const _ of provider.chat({ model: 'claude-sonnet-4-20250514', messages: [] })) {}
    }).rejects.toThrow(/overloaded/);
  });
});

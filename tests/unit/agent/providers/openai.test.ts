import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../../../src/core/agent/providers/openai';
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

describe('OpenAIProvider: listModels', () => {
  it('returns gpt models', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'gpt-4o' }, { id: 'gpt-3.5-turbo' }, { id: 'dall-e-3' }] }),
    });
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    const models = await provider.listModels();
    expect(models.map((m) => m.id)).toEqual(['gpt-4o', 'gpt-3.5-turbo']);
    expect(models[0].local).toBe(false);
  });
});

describe('OpenAIProvider: chat streaming', () => {
  it('streams text tokens from SSE', async () => {
    const events = [
      JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] }),
      JSON.stringify({ choices: [{ delta: { content: ' there' } }] }),
      '[DONE]',
    ];
    mockFetch.mockResolvedValue({ ok: true, body: sseBody(events) });

    const provider = new OpenAIProvider({ apiKey: 'k' });
    const chunks: StreamChunk[] = [];
    for await (const c of provider.chat({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(c);
    }
    expect(chunks.filter((c) => c.type === 'text').map((c) => c.content)).toEqual(['Hi', ' there']);
  });

  it('streams tool calls', async () => {
    const events = [
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ id: 'tc1', function: { name: 'cluster-health' } }] } }] }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ function: { arguments: '{"detail":"summary"}' } }] } }] }),
      JSON.stringify({ choices: [{ finish_reason: 'tool_calls', delta: {} }] }),
      '[DONE]',
    ];
    mockFetch.mockResolvedValue({ ok: true, body: sseBody(events) });

    const provider = new OpenAIProvider({ apiKey: 'k' });
    const chunks: StreamChunk[] = [];
    for await (const c of provider.chat({ model: 'gpt-4o', messages: [] })) {
      chunks.push(c);
    }
    expect(chunks.some((c) => c.type === 'tool_call_start')).toBe(true);
    expect(chunks.some((c) => c.type === 'tool_call_delta')).toBe(true);
  });

  it('throws on invalid API key', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
    const provider = new OpenAIProvider({ apiKey: 'bad' });
    await expect(async () => {
      for await (const _ of provider.chat({ model: 'gpt-4o', messages: [] })) {}
    }).rejects.toThrow(/Invalid OpenAI API key/);
  });
});

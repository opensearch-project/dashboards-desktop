import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../../../../src/core/agent/providers/ollama';
import type { StreamChunk } from '../../../../src/core/agent/types';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

function streamBody(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'));
      controller.close();
    },
  });
}

describe('OllamaProvider: listModels', () => {
  it('returns models from /api/tags', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3' }, { name: 'mistral' }] }),
    });
    const provider = new OllamaProvider();
    const models = await provider.listModels();
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('llama3');
    expect(models[0].local).toBe(true);
  });

  it('throws when Ollama is unreachable', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const provider = new OllamaProvider();
    await expect(provider.listModels()).rejects.toThrow(/Cannot connect to Ollama/);
  });
});

describe('OllamaProvider: chat streaming', () => {
  it('streams text tokens', async () => {
    const lines = [
      JSON.stringify({ message: { role: 'assistant', content: 'Hello' }, done: false }),
      JSON.stringify({ message: { role: 'assistant', content: ' world' }, done: false }),
      JSON.stringify({ message: { role: 'assistant', content: '' }, done: true, prompt_eval_count: 10, eval_count: 5 }),
    ];
    mockFetch.mockResolvedValue({ ok: true, body: streamBody(lines) });

    const provider = new OllamaProvider();
    const chunks: StreamChunk[] = [];
    for await (const c of provider.chat({ model: 'llama3', messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(c);
    }
    expect(chunks.filter((c) => c.type === 'text').map((c) => c.content)).toEqual(['Hello', ' world']);
    expect(chunks.find((c) => c.type === 'usage')?.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('streams tool calls', async () => {
    const lines = [
      JSON.stringify({
        message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'cluster-health', arguments: { detail: 'summary' } } }] },
        done: false,
      }),
      JSON.stringify({ message: { role: 'assistant', content: '' }, done: true, prompt_eval_count: 20, eval_count: 0 }),
    ];
    mockFetch.mockResolvedValue({ ok: true, body: streamBody(lines) });

    const provider = new OllamaProvider();
    const chunks: StreamChunk[] = [];
    for await (const c of provider.chat({ model: 'llama3', messages: [{ role: 'user', content: 'health' }] })) {
      chunks.push(c);
    }
    expect(chunks.some((c) => c.type === 'tool_call_start')).toBe(true);
    expect(chunks.some((c) => c.type === 'tool_call_delta')).toBe(true);
    expect(chunks.some((c) => c.type === 'tool_call_end')).toBe(true);
  });

  it('throws on model not found', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => 'model "bad" not found' });
    const provider = new OllamaProvider();
    await expect(async () => {
      for await (const _ of provider.chat({ model: 'bad', messages: [] })) {}
    }).rejects.toThrow(/not found/);
  });
});

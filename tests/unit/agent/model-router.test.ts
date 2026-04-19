import { describe, it, expect, vi } from 'vitest';
import { ModelRouter } from '../../../src/core/agent/model-router';
import type { ModelProvider, StreamChunk, ChatParams, ModelInfo } from '../../../src/core/agent/types';

function mockProvider(id: string, chunks: StreamChunk[] = []): ModelProvider {
  return {
    id,
    displayName: id,
    listModels: vi.fn(async () => [
      { id: 'test-model', displayName: 'Test', contextWindow: 8192, supportsTools: true, local: true },
    ]),
    async *chat(_params: ChatParams) {
      for (const c of chunks) yield c;
    },
  };
}

describe('ModelRouter: resolve', () => {
  it('parses provider:model specifier', () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    const { provider, model } = router.resolve('ollama:llama3');
    expect(provider.id).toBe('ollama');
    expect(model).toBe('llama3');
  });

  it('throws on missing colon separator', () => {
    const router = new ModelRouter();
    expect(() => router.resolve('llama3')).toThrow(/Invalid model specifier/);
  });

  it('throws on unknown provider', () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    expect(() => router.resolve('openai:gpt-4o')).toThrow(/Unknown provider "openai"/);
  });

  it('lists available providers in error message', () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    router.register(mockProvider('anthropic'));
    try {
      router.resolve('bedrock:claude');
    } catch (e: any) {
      expect(e.message).toContain('ollama');
      expect(e.message).toContain('anthropic');
    }
  });
});

describe('ModelRouter: chat streaming', () => {
  it('streams chunks from resolved provider', async () => {
    const chunks: StreamChunk[] = [
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } },
    ];
    const router = new ModelRouter();
    router.register(mockProvider('ollama', chunks));

    const received: StreamChunk[] = [];
    for await (const c of router.chat('ollama:llama3', [], [])) {
      received.push(c);
    }
    expect(received).toHaveLength(3);
    expect(received[0]).toEqual({ type: 'text', content: 'Hello' });
    expect(received[2].type).toBe('usage');
  });
});

describe('ModelRouter: model switching', () => {
  it('switches provider mid-session by re-resolving', () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    router.register(mockProvider('openai'));

    expect(router.resolve('ollama:llama3').provider.id).toBe('ollama');
    expect(router.resolve('openai:gpt-4o').provider.id).toBe('openai');
  });
});

describe('ModelRouter: listAllModels', () => {
  it('aggregates models from all providers', async () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    router.register(mockProvider('openai'));
    const models = await router.listAllModels();
    expect(models).toHaveLength(2);
    expect(models.map((m) => m.provider).sort()).toEqual(['ollama', 'openai']);
  });

  it('skips unavailable providers gracefully', async () => {
    const failing: ModelProvider = {
      id: 'broken',
      displayName: 'Broken',
      listModels: vi.fn(async () => { throw new Error('offline'); }),
      async *chat() {},
    };
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    router.register(failing);
    const models = await router.listAllModels();
    expect(models).toHaveLength(1);
    expect(models[0].provider).toBe('ollama');
  });
});

describe('ModelRouter: register/unregister', () => {
  it('unregisters a provider', () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    router.unregister('ollama');
    expect(() => router.resolve('ollama:llama3')).toThrow(/Unknown provider/);
  });

  it('getProviderIds returns registered ids', () => {
    const router = new ModelRouter();
    router.register(mockProvider('ollama'));
    router.register(mockProvider('anthropic'));
    expect(router.getProviderIds().sort()).toEqual(['anthropic', 'ollama']);
  });
});

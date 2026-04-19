import type { ModelProvider, ModelInfo, ChatParams, StreamChunk } from '../types.js';
import { OpenAIProvider } from './openai.js';

/**
 * Generic provider for any OpenAI-compatible API (LM Studio, vLLM, Together, etc.).
 * Delegates to OpenAIProvider with a custom baseURL.
 */
export class OpenAICompatibleProvider implements ModelProvider {
  id: string;
  displayName: string;
  private inner: OpenAIProvider;

  constructor(opts: { id?: string; displayName?: string; baseUrl: string; apiKey?: string }) {
    this.id = opts.id ?? 'openai-compatible';
    this.displayName = opts.displayName ?? `OpenAI-compatible (${opts.baseUrl})`;
    this.inner = new OpenAIProvider(opts.apiKey ?? '', opts.baseUrl);
  }

  async listModels(): Promise<ModelInfo[]> {
    const models = await this.inner.listModels();
    return models.map((m) => ({ ...m, local: true }));
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    yield* this.inner.chat(params);
  }
}

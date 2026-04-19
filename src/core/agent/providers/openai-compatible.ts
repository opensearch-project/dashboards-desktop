import type { ModelProvider, ModelInfo, ChatParams, StreamChunk } from '../types.js';
import { OpenAIProvider } from './openai.js';

/**
 * Generic provider for any OpenAI-compatible API (LM Studio, vLLM, Together, etc.).
 * Delegates to OpenAIProvider with a custom baseURL.
 *
 * Hardened for non-standard APIs:
 * - listModels() catches errors and returns a fallback entry
 * - chat() wraps errors with actionable messages
 * - Retries without tools if server rejects tool_use params
 */
export class OpenAICompatibleProvider implements ModelProvider {
  id: string;
  displayName: string;
  private inner: OpenAIProvider;
  private baseUrl: string;
  private fallbackModel: string;

  constructor(opts: { id?: string; displayName?: string; baseUrl: string; apiKey?: string; fallbackModel?: string }) {
    this.id = opts.id ?? 'openai-compatible';
    this.displayName = opts.displayName ?? `OpenAI-compatible (${opts.baseUrl})`;
    this.baseUrl = opts.baseUrl;
    this.fallbackModel = opts.fallbackModel ?? 'default';
    this.inner = new OpenAIProvider({ apiKey: opts.apiKey ?? '', baseUrl: opts.baseUrl });
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const models = await this.inner.listModels();
      if (models.length > 0) return models.map((m) => ({ ...m, local: true }));
    } catch { /* server may not implement /v1/models */ }

    return [{
      id: this.fallbackModel,
      displayName: `${this.displayName} (${this.fallbackModel})`,
      contextWindow: 8192,
      supportsTools: false,
      local: true,
    }];
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    try {
      yield* this.inner.chat(params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      // If tools caused the error, retry without tools
      if (params.tools?.length && (msg.includes('tool') || msg.includes('400') || msg.includes('422'))) {
        yield* this.inner.chat({ ...params, tools: undefined });
        return;
      }

      throw new Error(`${this.displayName} error: ${msg}. Check that ${this.baseUrl} is reachable and the model supports the OpenAI chat/completions API.`);
    }
  }
}

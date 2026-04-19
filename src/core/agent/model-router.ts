/**
 * Model router — resolves "provider:model" specifiers and routes chat to the correct provider.
 */

import type { ModelProvider, ModelInfo, ChatMessage, StreamChunk, ToolDefinition } from './types';

export class ModelRouter {
  private providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  /** Parse "provider:model" string, e.g. "ollama:llama3" */
  resolve(specifier: string): { provider: ModelProvider; model: string } {
    const sep = specifier.indexOf(':');
    if (sep === -1)
      throw new Error(`Invalid model specifier "${specifier}" — use "provider:model"`);
    const providerId = specifier.slice(0, sep);
    const model = specifier.slice(sep + 1);
    const provider = this.providers.get(providerId);
    if (!provider) {
      const available = Array.from(this.providers.keys()).join(', ');
      throw new Error(`Unknown provider "${providerId}". Available: ${available || 'none'}`);
    }
    return { provider, model };
  }

  /** Stream a chat turn through the resolved provider */
  async *chat(
    specifier: string,
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    const { provider, model } = this.resolve(specifier);
    yield* provider.chat({ model, messages, tools, signal });
  }

  /** List all models from all registered providers */
  async listAllModels(): Promise<Array<ModelInfo & { provider: string }>> {
    const results: Array<ModelInfo & { provider: string }> = [];
    for (const [id, provider] of this.providers) {
      try {
        const models = await provider.listModels();
        for (const m of models) results.push({ ...m, provider: id });
      } catch {
        // Provider unavailable — skip
      }
    }
    return results;
  }

  /** List models from a specific provider */
  async listModels(providerId: string): Promise<ModelInfo[]> {
    const provider = this.providers.get(providerId);
    if (!provider) return [];
    return provider.listModels();
  }

  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
}

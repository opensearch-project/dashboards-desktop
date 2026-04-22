/**
 * Model fallback chain — if primary fails, try secondary, then tertiary.
 */

import type { ModelRouter } from './model-router';
import type { ChatMessage, StreamChunk } from './types';

export interface FallbackConfig {
  chain: string[]; // e.g. ['anthropic:claude-sonnet-4-20250514', 'openai:gpt-4o', 'ollama:llama3']
  retryableErrors: string[];
}

export const DEFAULT_FALLBACK: FallbackConfig = {
  chain: ['anthropic:claude-sonnet-4-20250514', 'openai:gpt-4o', 'ollama:llama3'],
  retryableErrors: ['rate limit', 'timeout', 'ECONNREFUSED', '429', '503', '500'],
};

export async function* chatWithFallback(
  router: ModelRouter,
  messages: ChatMessage[],
  tools: unknown[],
  signal: AbortSignal,
  config: FallbackConfig = DEFAULT_FALLBACK,
): AsyncIterable<StreamChunk & { model?: string }> {
  for (const model of config.chain) {
    try {
      for await (const chunk of router.chat(model, messages, tools, signal)) {
        yield { ...chunk, model };
      }
      return; // success
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = config.retryableErrors.some((e) => msg.toLowerCase().includes(e.toLowerCase()));
      if (!isRetryable) throw err;
      // Try next model in chain
    }
  }
  throw new Error(`All models in fallback chain failed: ${config.chain.join(' → ')}`);
}

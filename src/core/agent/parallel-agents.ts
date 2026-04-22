/**
 * Multi-agent parallel mode — run 2+ agents on the same prompt, compare side-by-side.
 */

import type { ModelRouter } from './model-router';
import type { StreamChunk } from './types';

export interface ParallelResult {
  model: string;
  response: string;
  latencyMs: number;
  error?: string;
}

export async function runParallel(
  router: ModelRouter,
  models: string[],
  prompt: string,
  timeoutMs = 30_000,
): Promise<ParallelResult[]> {
  const results = await Promise.allSettled(
    models.map(async (model) => {
      const start = Date.now();
      let text = '';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        for await (const chunk of router.chat(model, [{ role: 'user', content: prompt }], [], controller.signal)) {
          if (chunk.type === 'text') text += chunk.content ?? '';
        }
        return { model, response: text, latencyMs: Date.now() - start };
      } catch (err) {
        return { model, response: text, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
      } finally {
        clearTimeout(timer);
      }
    })
  );

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { model: models[i], response: '', latencyMs: 0, error: r.reason?.message ?? 'Failed' }
  );
}

export function formatComparison(results: ParallelResult[]): string {
  return results.map((r) => {
    const status = r.error ? `❌ ${r.error}` : `✅ ${r.latencyMs}ms`;
    return `## ${r.model} (${status})\n\n${r.response || '(no response)'}\n`;
  }).join('\n---\n\n');
}

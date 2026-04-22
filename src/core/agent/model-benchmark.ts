/**
 * Model benchmarking — compare response quality across providers for the same prompt.
 */

import type { ModelRouter } from './model-router';
import type { StreamChunk } from './types';

export interface BenchmarkResult {
  model: string;
  response: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

export async function benchmarkModels(
  router: ModelRouter,
  models: string[],
  prompt: string,
  timeoutMs = 30_000,
): Promise<BenchmarkResult[]> {
  const results = await Promise.allSettled(
    models.map((specifier) => runSingle(router, specifier, prompt, timeoutMs))
  );

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { model: models[i], response: '', latencyMs: 0, inputTokens: 0, outputTokens: 0, error: r.reason?.message ?? 'Failed' }
  );
}

async function runSingle(router: ModelRouter, specifier: string, prompt: string, timeoutMs: number): Promise<BenchmarkResult> {
  const start = Date.now();
  let text = '';
  let inputTokens = 0;
  let outputTokens = 0;

  const messages = [{ role: 'user' as const, content: prompt }];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for await (const chunk of router.chat(specifier, messages, [], controller.signal)) {
      if (chunk.type === 'text') text += chunk.content ?? '';
      if (chunk.type === 'usage') {
        inputTokens = chunk.usage?.inputTokens ?? 0;
        outputTokens = chunk.usage?.outputTokens ?? 0;
      }
    }
  } finally {
    clearTimeout(timer);
  }

  return { model: specifier, response: text, latencyMs: Date.now() - start, inputTokens, outputTokens };
}

export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const lines = ['| Model | Latency | Tokens (in/out) | Status |', '|-------|---------|-----------------|--------|'];
  for (const r of results) {
    const status = r.error ? `❌ ${r.error}` : `✅ ${r.response.slice(0, 50)}...`;
    lines.push(`| ${r.model} | ${r.latencyMs}ms | ${r.inputTokens}/${r.outputTokens} | ${status} |`);
  }
  return lines.join('\n');
}

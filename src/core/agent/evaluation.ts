/**
 * Agent evaluation framework — score responses against golden datasets.
 */

import type { ModelRouter } from './model-router';

export interface EvalCase {
  id: string;
  prompt: string;
  expectedKeywords: string[];
  expectedToolUse?: string[];
  maxTokens?: number;
}

export interface EvalResult {
  caseId: string;
  model: string;
  passed: boolean;
  score: number;
  keywordHits: string[];
  keywordMisses: string[];
  toolsUsed: string[];
  responseLength: number;
  latencyMs: number;
}

export interface EvalSummary {
  model: string;
  totalCases: number;
  passed: number;
  avgScore: number;
  avgLatencyMs: number;
}

export async function runEvaluation(
  router: ModelRouter,
  model: string,
  cases: EvalCase[],
): Promise<{ results: EvalResult[]; summary: EvalSummary }> {
  const results: EvalResult[] = [];

  for (const c of cases) {
    const start = Date.now();
    let text = '';
    try {
      for await (const chunk of router.chat(model, [{ role: 'user', content: c.prompt }], [], new AbortController().signal)) {
        if (chunk.type === 'text') text += chunk.content ?? '';
      }
    } catch {
      results.push({ caseId: c.id, model, passed: false, score: 0, keywordHits: [], keywordMisses: c.expectedKeywords, toolsUsed: [], responseLength: 0, latencyMs: Date.now() - start });
      continue;
    }

    const lower = text.toLowerCase();
    const hits = c.expectedKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
    const misses = c.expectedKeywords.filter((kw) => !lower.includes(kw.toLowerCase()));
    const score = c.expectedKeywords.length > 0 ? Math.round((hits.length / c.expectedKeywords.length) * 100) : (text.length > 10 ? 80 : 20);
    const passed = score >= 60;

    results.push({ caseId: c.id, model, passed, score, keywordHits: hits, keywordMisses: misses, toolsUsed: [], responseLength: text.length, latencyMs: Date.now() - start });
  }

  const summary: EvalSummary = {
    model,
    totalCases: results.length,
    passed: results.filter((r) => r.passed).length,
    avgScore: Math.round(results.reduce((s, r) => s + r.score, 0) / Math.max(results.length, 1)),
    avgLatencyMs: Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / Math.max(results.length, 1)),
  };

  return { results, summary };
}

/**
 * Cost estimation — estimate token cost before calling cloud APIs.
 */

import { estimateTokens } from './token-estimator';

const PRICING: Record<string, { input: number; output: number }> = {
  'openai:gpt-4o': { input: 2.50, output: 10.00 },
  'openai:gpt-4o-mini': { input: 0.15, output: 0.60 },
  'anthropic:claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'anthropic:claude-haiku-3-5-20241022': { input: 0.80, output: 4.00 },
  'bedrock:anthropic.claude-sonnet-4-20250514-v1:0': { input: 3.00, output: 15.00 },
  'bedrock:amazon.nova-pro-v1:0': { input: 0.80, output: 3.20 },
};

export interface CostEstimate {
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  isLocal: boolean;
}

export function estimateCost(model: string, inputText: string, expectedOutputTokens = 500): CostEstimate {
  const isLocal = model.startsWith('ollama:');
  const inputTokens = estimateTokens(inputText);
  const pricing = PRICING[model];

  if (isLocal || !pricing) {
    return { model, estimatedInputTokens: inputTokens, estimatedOutputTokens: expectedOutputTokens, estimatedCostUsd: 0, isLocal };
  }

  const cost = (inputTokens / 1_000_000) * pricing.input + (expectedOutputTokens / 1_000_000) * pricing.output;
  return { model, estimatedInputTokens: inputTokens, estimatedOutputTokens: expectedOutputTokens, estimatedCostUsd: Math.round(cost * 1_000_000) / 1_000_000, isLocal };
}

export function formatCost(est: CostEstimate): string {
  if (est.isLocal) return `${est.model} (local, free)`;
  return `${est.model}: ~${est.estimatedInputTokens} in / ~${est.estimatedOutputTokens} out ≈ $${est.estimatedCostUsd.toFixed(6)}`;
}

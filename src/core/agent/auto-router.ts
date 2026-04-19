/**
 * Model auto-router — selects local vs cloud model based on query complexity.
 * User can override with /model command. Configurable via settings.
 */

import type { ChatMessage, ToolDefinition } from './types';

export interface AutoRouterConfig {
  enabled: boolean;
  localModel: string;    // e.g. "ollama:llama3"
  cloudModel: string;    // e.g. "anthropic:claude-sonnet-4-20250514"
  complexityThreshold: number;  // 0-1, above = cloud
}

export const DEFAULT_CONFIG: AutoRouterConfig = {
  enabled: false,
  localModel: 'ollama:llama3',
  cloudModel: 'anthropic:claude-sonnet-4-20250514',
  complexityThreshold: 0.5,
};

export interface ComplexitySignals {
  queryLength: number;
  toolCount: number;
  conversationDepth: number;
  hasCodeBlock: boolean;
  hasMultiStep: boolean;
}

/**
 * Score query complexity from 0 (trivial) to 1 (complex).
 */
export function scoreComplexity(
  userMessage: string,
  history: ChatMessage[],
  availableTools: ToolDefinition[],
): number {
  const signals = extractSignals(userMessage, history, availableTools);
  let score = 0;

  // Query length: longer queries tend to be more complex
  if (signals.queryLength > 500) score += 0.25;
  else if (signals.queryLength > 200) score += 0.15;
  else if (signals.queryLength > 50) score += 0.05;

  // Tool count: more available tools = potentially complex routing
  if (signals.toolCount > 10) score += 0.15;
  else if (signals.toolCount > 5) score += 0.1;

  // Conversation depth: deep conversations need more context
  if (signals.conversationDepth > 20) score += 0.25;
  else if (signals.conversationDepth > 10) score += 0.15;
  else if (signals.conversationDepth > 5) score += 0.05;

  // Code blocks suggest technical complexity
  if (signals.hasCodeBlock) score += 0.15;

  // Multi-step indicators
  if (signals.hasMultiStep) score += 0.2;

  return Math.min(score, 1);
}

/**
 * Select model based on complexity score and config.
 */
export function selectModel(
  userMessage: string,
  history: ChatMessage[],
  availableTools: ToolDefinition[],
  config: AutoRouterConfig,
  manualOverride?: string,
): string {
  // Manual override always wins
  if (manualOverride) return manualOverride;
  if (!config.enabled) return config.localModel;

  const score = scoreComplexity(userMessage, history, availableTools);
  return score >= config.complexityThreshold ? config.cloudModel : config.localModel;
}

function extractSignals(
  userMessage: string,
  history: ChatMessage[],
  tools: ToolDefinition[],
): ComplexitySignals {
  const lower = userMessage.toLowerCase();
  return {
    queryLength: userMessage.length,
    toolCount: tools.length,
    conversationDepth: history.filter((m) => m.role === 'user').length,
    hasCodeBlock: userMessage.includes('```'),
    hasMultiStep: /\b(then|after that|next|also|and then|step \d|first .* then)\b/i.test(lower),
  };
}

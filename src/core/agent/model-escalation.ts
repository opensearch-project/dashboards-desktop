/**
 * Multi-model conversation — start local, escalate to cloud mid-conversation.
 * Detects when local model is struggling and suggests/auto-switches to cloud.
 */

import { estimateTokens } from './token-estimator';

export interface EscalationConfig {
  localModel: string;
  cloudModel: string;
  autoEscalate: boolean;
  /** Escalate if response is shorter than this (tokens) relative to prompt */
  minResponseRatio: number;
  /** Escalate if these phrases appear in response */
  confusionPhrases: string[];
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  localModel: 'ollama:llama3',
  cloudModel: 'anthropic:claude-sonnet-4-20250514',
  autoEscalate: false,
  minResponseRatio: 0.1,
  confusionPhrases: ['I cannot', 'I don\'t know', 'I\'m not sure', 'as an AI', 'I apologize'],
};

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason?: string;
  suggestedModel?: string;
}

export function checkEscalation(
  prompt: string,
  response: string,
  currentModel: string,
  config: EscalationConfig = DEFAULT_ESCALATION,
): EscalationDecision {
  // Only escalate from local models
  if (!currentModel.startsWith('ollama:')) return { shouldEscalate: false };

  const promptTokens = estimateTokens(prompt);
  const responseTokens = estimateTokens(response);

  // Check response ratio
  if (promptTokens > 50 && responseTokens / promptTokens < config.minResponseRatio) {
    return { shouldEscalate: true, reason: 'Response too short for prompt complexity', suggestedModel: config.cloudModel };
  }

  // Check confusion phrases
  const lower = response.toLowerCase();
  for (const phrase of config.confusionPhrases) {
    if (lower.includes(phrase.toLowerCase())) {
      return { shouldEscalate: true, reason: `Model uncertain: "${phrase}"`, suggestedModel: config.cloudModel };
    }
  }

  return { shouldEscalate: false };
}

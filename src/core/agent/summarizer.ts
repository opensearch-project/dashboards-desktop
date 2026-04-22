/**
 * Conversation summarizer — compresses long conversations to save context window.
 * Replaces old messages with a summary when conversation exceeds threshold.
 */

import type { ChatMessage } from './types';
import { estimateTokens } from './token-estimator';

const SUMMARY_PROMPT = 'Summarize the conversation so far in 2-3 concise paragraphs. Preserve key facts, decisions, and user preferences.';

export interface SummaryResult {
  summary: string;
  messagesRemoved: number;
  tokensSaved: number;
}

/**
 * Check if conversation needs summarization based on token count.
 */
export function needsSummarization(messages: ChatMessage[], maxTokens: number, threshold = 0.75): boolean {
  const total = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  return total > maxTokens * threshold;
}

/**
 * Build a summarization request — returns messages to send to the model.
 * The caller should send these to the model and use the response as the summary.
 */
export function buildSummarizationRequest(messages: ChatMessage[], keepRecent = 4): ChatMessage[] {
  const toSummarize = messages.slice(0, -keepRecent);
  if (toSummarize.length < 2) return [];

  return [
    { role: 'system', content: SUMMARY_PROMPT },
    ...toSummarize,
    { role: 'user', content: 'Please summarize the above conversation.' },
  ];
}

/**
 * Apply summary — replace old messages with a single summary message.
 */
export function applySummary(messages: ChatMessage[], summary: string, keepRecent = 4): { messages: ChatMessage[]; result: SummaryResult } {
  const oldMessages = messages.slice(0, -keepRecent);
  const recentMessages = messages.slice(-keepRecent);
  const tokensSaved = oldMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0) - estimateTokens(summary);

  const newMessages: ChatMessage[] = [
    { role: 'system', content: `Previous conversation summary:\n${summary}` },
    ...recentMessages,
  ];

  return {
    messages: newMessages,
    result: { summary, messagesRemoved: oldMessages.length, tokensSaved: Math.max(0, tokensSaved) },
  };
}

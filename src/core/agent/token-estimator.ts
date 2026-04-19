import type { ChatMessage } from './types.js';

/** Approximate tokens-per-character ratios by tokenizer family. */
const RATIOS: Record<string, number> = {
  cl100k: 0.25, // GPT-4o, GPT-4, GPT-3.5
  o200k: 0.25, // o3, o4-mini
  claude: 0.25, // Anthropic models
  default: 0.25, // conservative fallback (~4 chars/token)
};

/** Map provider:model prefixes to tokenizer families. */
function tokenizerFor(model: string): string {
  if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) return 'cl100k';
  if (model.startsWith('o')) return 'o200k';
  if (model.includes('claude')) return 'claude';
  return 'default';
}

/** Estimate token count for a string. */
export function estimateTokens(text: string | null | undefined, model = ''): number {
  if (!text) return 0;
  const ratio = RATIOS[tokenizerFor(model)] ?? RATIOS.default;
  return Math.ceil(text.length * ratio);
}

/** Estimate total tokens for a message (content + tool call JSON). */
export function estimateMessageTokens(msg: ChatMessage, model = ''): number {
  let total = estimateTokens(msg.content, model);
  // Role + structural overhead (~4 tokens per message)
  total += 4;
  if (msg.toolCalls) {
    for (const tc of msg.toolCalls) {
      total += estimateTokens(tc.name, model);
      total += estimateTokens(JSON.stringify(tc.input), model);
    }
  }
  return total;
}

/**
 * Build a context-window-safe message array by trimming oldest messages.
 * Always keeps the system prompt and the most recent messages that fit.
 */
export function trimToContextWindow(
  messages: ChatMessage[],
  contextWindow: number,
  model = '',
  reservedOutputTokens = 4096,
): ChatMessage[] {
  const budget = contextWindow - reservedOutputTokens;
  if (budget <= 0) return messages.slice(-1);

  const system = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');

  let used = system.reduce((sum, m) => sum + estimateMessageTokens(m, model), 0);

  // Walk from newest to oldest, include what fits
  const included: ChatMessage[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const cost = estimateMessageTokens(rest[i], model);
    if (used + cost > budget) break;
    included.unshift(rest[i]);
    used += cost;
  }

  return [...system, ...included];
}

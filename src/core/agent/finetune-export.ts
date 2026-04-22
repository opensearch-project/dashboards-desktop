/**
 * Fine-tuning data export — export conversations as JSONL for model fine-tuning.
 */

import type { ChatMessage } from './types';

interface FineTuneEntry { messages: Array<{ role: string; content: string }> }

export function exportAsJSONL(conversations: Array<{ messages: ChatMessage[] }>): string {
  return conversations
    .map((conv) => {
      const messages = conv.messages
        .filter((m) => m.role !== 'tool' && m.content)
        .map((m) => ({ role: m.role, content: m.content ?? '' }));
      if (messages.length < 2) return null;
      return JSON.stringify({ messages } as FineTuneEntry);
    })
    .filter(Boolean)
    .join('\n') + '\n';
}

export function exportAsOpenAIFormat(conversations: Array<{ messages: ChatMessage[] }>, systemPrompt?: string): string {
  return conversations
    .map((conv) => {
      const msgs: Array<{ role: string; content: string }> = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      for (const m of conv.messages) {
        if (m.role === 'tool' || !m.content) continue;
        msgs.push({ role: m.role, content: m.content });
      }
      return msgs.length >= 2 ? JSON.stringify({ messages: msgs }) : null;
    })
    .filter(Boolean)
    .join('\n') + '\n';
}

/**
 * Agent collaboration — two agents discuss a problem, user observes.
 */

import type { ModelRouter } from './model-router';
import type { ChatMessage } from './types';

export interface CollaborationTurn { agent: string; model: string; content: string }

export async function runCollaboration(
  router: ModelRouter,
  agentA: { name: string; model: string; systemPrompt: string },
  agentB: { name: string; model: string; systemPrompt: string },
  topic: string,
  maxTurns = 6,
): Promise<CollaborationTurn[]> {
  const turns: CollaborationTurn[] = [];
  const historyA: ChatMessage[] = [{ role: 'system', content: agentA.systemPrompt }];
  const historyB: ChatMessage[] = [{ role: 'system', content: agentB.systemPrompt }];

  let lastMessage = topic;

  for (let i = 0; i < maxTurns; i++) {
    const current = i % 2 === 0 ? agentA : agentB;
    const history = i % 2 === 0 ? historyA : historyB;

    history.push({ role: 'user', content: lastMessage });
    let response = '';
    for await (const chunk of router.chat(current.model, history, [], new AbortController().signal)) {
      if (chunk.type === 'text') response += chunk.content ?? '';
    }
    history.push({ role: 'assistant', content: response });
    turns.push({ agent: current.name, model: current.model, content: response });
    lastMessage = response;
  }

  return turns;
}

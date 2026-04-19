/**
 * Agent orchestrator — stub for M2 implementation.
 * Coordinates model router, tool registry, and conversation flow.
 */

import type { ChatMessage, StreamChunk, ToolDefinition } from './types';

export class AgentOrchestrator {
  constructor(
    _opts: {
      modelRouter: unknown;
      toolRegistry: unknown;
    },
  ) {}

  async *chat(
    _messages: ChatMessage[],
    _opts?: { model?: string; signal?: AbortSignal },
  ): AsyncIterable<StreamChunk> {
    yield { type: 'text', content: 'Agent orchestrator not yet implemented.' };
    yield { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } };
  }

  getAvailableTools(): ToolDefinition[] {
    return [];
  }
}

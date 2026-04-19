/**
 * Agent orchestrator — top-level entry point for the chat loop.
 * Wires together: ModelRouter + ToolRegistry + context management + streaming.
 * This is what sde's IPC bridge calls from the main process.
 */

import type { ChatMessage, StreamEvent, ToolCall, ToolContext } from './types.js';
import type { ModelRouter } from './model-router.js';
import type { ToolRegistry } from './tool-registry.js';
import { estimateMessageTokens, trimToContextWindow } from './token-estimator.js';

const MAX_TOOL_ROUNDS = 10;
const SYSTEM_PROMPT = `You are an OpenSearch Dashboards Desktop assistant. You help users query, manage, and understand their OpenSearch and Elasticsearch clusters. Use the available tools to answer questions. Be concise.`;

export interface OrchestratorConfig {
  modelRouter: ModelRouter;
  toolRegistry: ToolRegistry;
  modelSpecifier: string;          // e.g. "ollama:llama3"
  contextWindow?: number;          // override; otherwise resolved from provider
  onEvent: (event: StreamEvent) => void;
  requestApproval?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
}

export class AgentOrchestrator {
  private history: ChatMessage[] = [];
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  /** Reset conversation history. */
  reset(): void {
    this.history = [];
  }

  /** Load existing conversation history (e.g. from SQLite). */
  loadHistory(messages: ChatMessage[]): void {
    this.history = [...messages];
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Main entry point: send a user message, run the full agent loop.
   * Streams events via config.onEvent as they arrive.
   */
  async send(userMessage: string, toolContext: ToolContext): Promise<void> {
    this.history.push({ role: 'user', content: userMessage });

    const { modelRouter, toolRegistry, modelSpecifier, onEvent } = this.config;
    const tools = toolRegistry.listForModel();
    const contextWindow = this.config.contextWindow ?? 128_000;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      // Build context-window-safe message array
      const messages = trimToContextWindow(
        [{ role: 'system', content: SYSTEM_PROMPT }, ...this.history],
        contextWindow,
        modelSpecifier,
      );

      // Accumulate the assistant response
      let textContent = '';
      const pendingToolCalls: ToolCall[] = [];
      let currentToolId = '';
      let currentToolName = '';
      let currentToolInput = '';
      let usage = { inputTokens: 0, outputTokens: 0 };

      const abortController = new AbortController();
      try {
        for await (const chunk of modelRouter.chat(modelSpecifier, messages, tools, abortController.signal)) {
          switch (chunk.type) {
            case 'text':
              textContent += chunk.content ?? '';
              onEvent({ type: 'token', content: chunk.content ?? '' });
              break;

            case 'tool_call_start':
              currentToolId = chunk.toolCall?.id ?? `tc_${Date.now()}`;
              currentToolName = chunk.toolCall?.name ?? '';
              currentToolInput = '';
              onEvent({ type: 'tool_call_start', name: currentToolName, id: currentToolId });
              break;

            case 'tool_call_delta':
              currentToolInput += chunk.content ?? '';
              onEvent({ type: 'tool_call_input', delta: chunk.content ?? '' });
              break;

            case 'tool_call_end':
              pendingToolCalls.push({
                id: currentToolId,
                name: currentToolName,
                input: safeParse(currentToolInput),
              });
              onEvent({ type: 'tool_call_end', id: currentToolId });
              break;

            case 'usage':
              usage = chunk.usage ?? usage;
              break;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        onEvent({ type: 'error', message: msg, code: 'MODEL_ERROR' });
        return;
      }

      // If the model produced text only (no tool calls), we're done
      if (pendingToolCalls.length === 0) {
        if (textContent) {
          this.history.push({ role: 'assistant', content: textContent });
        }
        onEvent({ type: 'done', usage });
        return;
      }

      // Record assistant message with tool calls
      this.history.push({
        role: 'assistant',
        content: textContent || null!,
        toolCalls: pendingToolCalls,
      });

      // Execute each tool call
      for (const tc of pendingToolCalls) {
        // Check approval
        const trust = toolRegistry.getTrust(
          toolRegistry.get(tc.name)?.definition ?? { name: tc.name, description: '', source: 'mcp', inputSchema: {}, requiresApproval: true },
        );
        if (trust === 'ask' && this.config.requestApproval) {
          const approved = await this.config.requestApproval(tc.name, tc.input);
          if (!approved) {
            const denied: ChatMessage = { role: 'tool', content: 'Tool call denied by user.', toolCallId: tc.id };
            this.history.push(denied);
            onEvent({ type: 'tool_result', id: tc.id, output: 'Tool call denied by user.', isError: true });
            continue;
          }
        }

        const result = await toolRegistry.execute(tc.name, tc.input, toolContext);
        this.history.push({ role: 'tool', content: result.content, toolCallId: tc.id });
        onEvent({ type: 'tool_result', id: tc.id, output: result.content, isError: result.isError });
      }

      // Loop back — model will see tool results and continue
    }

    // Exceeded max tool rounds
    onEvent({ type: 'error', message: `Exceeded maximum tool rounds (${MAX_TOOL_ROUNDS})`, code: 'MAX_ROUNDS' });
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return { raw: json };
  }
}

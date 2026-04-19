/**
 * Agent runtime — orchestrates the message → model → tool → response loop.
 * Emits StreamEvents for the renderer via a callback.
 */

import type { StreamEvent, ToolCall, ToolContext } from './types';
import type { ModelRouter } from './model-router';
import type { ToolRegistry } from './tool-registry';
import type { ConversationManager } from './conversation';
import {
  selectModel,
  type AutoRouterConfig,
  DEFAULT_CONFIG as DEFAULT_AUTOROUTER,
} from './auto-router';

const MAX_TOOL_ROUNDS = 10;

export class AgentRuntime {
  private abortController: AbortController | null = null;
  private manualModelOverride: string | undefined;
  autoRouterConfig: AutoRouterConfig = { ...DEFAULT_AUTOROUTER };

  constructor(
    private router: ModelRouter,
    private tools: ToolRegistry,
    private conversations: ConversationManager,
    private activeModel: string,
    private workspaceId: string,
    private getActiveConnection: () => {
      id: string;
      url: string;
      type: string;
      auth_type: string;
    } | null,
  ) {}

  setModel(specifier: string): void {
    this.router.resolve(specifier); // validate
    this.activeModel = specifier;
    this.manualModelOverride = specifier;
  }

  clearModelOverride(): void {
    this.manualModelOverride = undefined;
  }

  getModel(): string {
    return this.activeModel;
  }

  getRouter(): ModelRouter {
    return this.router;
  }

  getTools(): ToolRegistry {
    return this.tools;
  }

  cancel(): void {
    this.abortController?.abort();
  }

  /** Send a user message and stream the response via the emit callback */
  async chat(
    conversationId: string,
    userMessage: string,
    emit: (event: StreamEvent) => void,
  ): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Store user message
    this.conversations.addMessage(conversationId, 'user', userMessage);

    try {
      await this.runLoop(conversationId, signal, emit);
    } catch (err: unknown) {
      if (signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      emit({ type: 'error', message: msg, code: 'RUNTIME_ERROR' });
    } finally {
      this.abortController = null;
    }
  }

  private async runLoop(
    conversationId: string,
    signal: AbortSignal,
    emit: (event: StreamEvent) => void,
  ): Promise<void> {
    const { provider, model } = this.router.resolve(this.activeModel);
    const modelInfo = (await provider.listModels()).find((m) => m.id === model) ?? {
      id: model,
      displayName: model,
      contextWindow: 8192,
      supportsTools: true,
      local: false,
    };

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (signal.aborted) return;

      const messages = this.conversations.buildContext(
        conversationId,
        modelInfo,
        this.tools.listForModel(),
        this.workspaceId,
      );

      // Auto-route on first round only (use same model for tool follow-ups)
      const effectiveModel =
        round === 0
          ? selectModel(
              messages.find((m) => m.role === 'user')?.content ?? '',
              messages,
              this.tools.listForModel(),
              this.autoRouterConfig,
              this.manualModelOverride,
            )
          : this.activeModel;

      // Collect the full response
      let textContent = '';
      const toolCalls: ToolCall[] = [];
      let currentToolCall: Partial<ToolCall> | null = null;
      let inputBuffer = '';
      let totalUsage = { inputTokens: 0, outputTokens: 0 };

      for await (const chunk of this.router.chat(
        effectiveModel,
        messages,
        this.tools.listForModel(),
        signal,
      )) {
        if (signal.aborted) return;

        switch (chunk.type) {
          case 'text':
            textContent += chunk.content ?? '';
            emit({ type: 'token', content: chunk.content ?? '' });
            break;

          case 'tool_call_start':
            currentToolCall = { id: chunk.toolCall?.id, name: chunk.toolCall?.name };
            inputBuffer = '';
            emit({
              type: 'tool_call_start',
              name: chunk.toolCall?.name ?? '',
              id: chunk.toolCall?.id ?? '',
            });
            break;

          case 'tool_call_delta':
            inputBuffer += chunk.content ?? '';
            emit({ type: 'tool_call_input', delta: chunk.content ?? '' });
            break;

          case 'tool_call_end':
            if (currentToolCall?.name) {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = JSON.parse(inputBuffer);
              } catch {
                /* use empty */
              }
              const tc: ToolCall = {
                id: currentToolCall.id ?? currentToolCall.name,
                name: currentToolCall.name,
                input: parsedInput,
              };
              toolCalls.push(tc);
              emit({ type: 'tool_call_end', id: tc.id });
            }
            currentToolCall = null;
            inputBuffer = '';
            break;

          case 'usage':
            totalUsage = chunk.usage ?? totalUsage;
            break;
        }
      }

      // Store assistant message
      this.conversations.addMessage(
        conversationId,
        'assistant',
        textContent,
        toolCalls.length ? JSON.stringify(toolCalls) : undefined,
      );

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        emit({ type: 'done', usage: totalUsage });
        return;
      }

      // Execute tool calls and store results
      const context: ToolContext = {
        workspaceId: this.workspaceId,
        activeConnection: this.getActiveConnection(),
        signal,
      };

      for (const tc of toolCalls) {
        if (signal.aborted) return;
        const result = await this.tools.execute(tc.name, tc.input, context);
        emit({ type: 'tool_result', id: tc.id, output: result.content, isError: result.isError });
        this.conversations.addMessage(conversationId, 'tool', result.content, undefined, tc.id);
      }
      // Loop back to let the model respond to tool results
    }

    emit({ type: 'error', message: 'Max tool rounds exceeded', code: 'MAX_ROUNDS' });
  }
}

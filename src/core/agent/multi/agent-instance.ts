/**
 * AgentInstance — a single agent with its own model, system prompt, tools, and state.
 */

import type { ChatMessage, StreamChunk, ToolDefinition, ToolResult, ToolContext } from '../types';
import type { ModelRouter } from '../model-router';
import type { ToolRegistry } from '../tool-registry';
import { trimToContextWindow } from '../token-estimator';

export interface AgentConfig {
  id: string;
  name: string;
  model: string; // "provider:model"
  systemPrompt: string;
  toolFilter?: string[]; // tool names to include (empty = all)
  contextWindow?: number;
}

export class AgentInstance {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  private history: ChatMessage[] = [];
  private config: AgentConfig;

  constructor(
    config: AgentConfig,
    private router: ModelRouter,
    private tools: ToolRegistry,
  ) {
    this.id = config.id;
    this.name = config.name;
    this.model = config.model;
    this.config = config;
  }

  /** Get tools available to this agent (filtered by config) */
  getTools(): ToolDefinition[] {
    const all = this.tools.listForModel();
    if (!this.config.toolFilter?.length) return all;
    return all.filter((t) => this.config.toolFilter!.includes(t.name));
  }

  /** Run a single chat turn — returns accumulated text + any tool calls */
  async *chat(userMessage: string, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    this.history.push({ role: 'user', content: userMessage });

    const messages = trimToContextWindow(
      [{ role: 'system', content: this.config.systemPrompt }, ...this.history],
      this.config.contextWindow ?? 128_000,
      this.model,
    );

    let text = '';
    for await (const chunk of this.router.chat(this.model, messages, this.getTools(), signal)) {
      yield chunk;
      if (chunk.type === 'text') text += chunk.content ?? '';
    }

    if (text) this.history.push({ role: 'assistant', content: text });
  }

  /** Add a tool result to history (after external tool execution) */
  addToolResult(toolCallId: string, result: ToolResult): void {
    this.history.push({ role: 'tool', content: result.content, toolCallId });
  }

  /** Execute a tool through this agent's registry */
  async executeTool(
    name: string,
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    return this.tools.execute(name, input, context);
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  /** Inject context from another agent or orchestrator */
  injectContext(message: ChatMessage): void {
    this.history.push(message);
  }
}

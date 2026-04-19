/**
 * Orchestrator — routes user messages to agents, coordinates multi-agent workflows.
 */

import type { StreamChunk, StreamEvent, ToolContext } from '../types';
import type { AgentConfig } from './agent-instance';
import { AgentRegistry } from './registry';
import { MessageBus } from './message-bus';
import type { ModelRouter } from '../model-router';
import type { ToolRegistry } from '../tool-registry';

export type RoutingStrategy = 'single' | 'fan-out' | 'pipeline';

/** Built-in agent configs matching our personas */
const BUILTIN_AGENTS: AgentConfig[] = [
  {
    id: 'ops', name: 'Ops Agent', model: 'ollama:llama3',
    systemPrompt: 'You are an operations agent. Focus on cluster health, alerting, performance, and incident response. Be concise.',
    toolFilter: ['opensearch-query', 'elasticsearch-query', 'cluster-health', 'index-manage', 'admin-opensearch', 'admin-elasticsearch'],
  },
  {
    id: 'analyst', name: 'Analyst Agent', model: 'ollama:llama3',
    systemPrompt: 'You are a data analyst agent. Help with queries, aggregations, and data exploration. Format results as tables.',
    toolFilter: ['opensearch-query', 'elasticsearch-query', 'cluster-health'],
  },
  {
    id: 'security', name: 'Security Agent', model: 'ollama:llama3',
    systemPrompt: 'You are a security agent. Focus on access control, roles, users, audit, and threat detection.',
    toolFilter: ['opensearch-query', 'elasticsearch-query', 'admin-opensearch', 'admin-elasticsearch'],
  },
];

/** Intent classification keywords */
const INTENT_MAP: Record<string, string[]> = {
  ops: ['health', 'cluster', 'shard', 'node', 'alert', 'monitor', 'snapshot', 'restart', 'slow', 'down', 'error', 'status'],
  analyst: ['query', 'search', 'count', 'aggregate', 'average', 'sum', 'top', 'trend', 'show me', 'how many', 'find'],
  security: ['role', 'user', 'permission', 'tenant', 'access', 'audit', 'api key', 'security', 'who can'],
};

export class MultiAgentOrchestrator {
  readonly registry: AgentRegistry;
  readonly bus: MessageBus;

  constructor(
    private router: ModelRouter,
    private tools: ToolRegistry,
  ) {
    this.registry = new AgentRegistry(router, tools);
    this.bus = new MessageBus();
  }

  /** Initialize built-in agents */
  init(): void {
    for (const config of BUILTIN_AGENTS) {
      if (!this.registry.has(config.id)) {
        this.registry.spawn(config);
      }
    }
  }

  /** Spawn a custom agent */
  spawnAgent(config: AgentConfig): void {
    this.registry.spawn(config);
  }

  /** Route a user message to the best agent and stream the response */
  async *route(
    userMessage: string,
    strategy: RoutingStrategy = 'single',
    toolContext: ToolContext,
    signal?: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    switch (strategy) {
      case 'single':
        yield* this.routeSingle(userMessage, toolContext, signal);
        break;
      case 'fan-out':
        yield* this.routeFanOut(userMessage, toolContext, signal);
        break;
      case 'pipeline':
        yield* this.routeSingle(userMessage, toolContext, signal);
        break;
    }
  }

  /** Route to the single best-fit agent */
  private async *routeSingle(
    userMessage: string,
    toolContext: ToolContext,
    signal?: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    const agentId = this.classifyIntent(userMessage);
    const agent = this.registry.get(agentId);
    if (!agent) {
      yield { type: 'error', message: `Agent "${agentId}" not found`, code: 'AGENT_NOT_FOUND' };
      return;
    }

    yield { type: 'token', content: '' }; // signal start

    let text = '';
    const pendingToolCalls: Array<{ id: string; name: string; input: string }> = [];
    let currentId = '';
    let currentName = '';
    let inputBuf = '';

    for await (const chunk of agent.chat(userMessage, signal)) {
      switch (chunk.type) {
        case 'text':
          text += chunk.content ?? '';
          yield { type: 'token', content: chunk.content ?? '' };
          break;
        case 'tool_call_start':
          currentId = chunk.toolCall?.id ?? '';
          currentName = chunk.toolCall?.name ?? '';
          inputBuf = '';
          yield { type: 'tool_call_start', name: currentName, id: currentId };
          break;
        case 'tool_call_delta':
          inputBuf += chunk.content ?? '';
          yield { type: 'tool_call_input', delta: chunk.content ?? '' };
          break;
        case 'tool_call_end':
          pendingToolCalls.push({ id: currentId, name: currentName, input: inputBuf });
          yield { type: 'tool_call_end', id: currentId };
          break;
        case 'usage':
          // defer until done
          break;
      }
    }

    // Execute tool calls
    for (const tc of pendingToolCalls) {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(tc.input); } catch { /* empty */ }
      const result = await agent.executeTool(tc.name, parsed, toolContext);
      agent.addToolResult(tc.id, result);
      yield { type: 'tool_result', id: tc.id, output: result.content, isError: result.isError };
    }

    // If there were tool calls, do a follow-up turn
    if (pendingToolCalls.length > 0) {
      for await (const chunk of agent.chat('Continue based on the tool results above.', signal)) {
        if (chunk.type === 'text') yield { type: 'token', content: chunk.content ?? '' };
      }
    }

    yield { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } };
  }

  /** Fan-out to multiple agents, merge responses */
  private async *routeFanOut(
    userMessage: string,
    toolContext: ToolContext,
    signal?: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    const agents = this.registry.list();

    // Run all agents in parallel
    const promises = agents.map(async (agent) => {
      let text = '';
      for await (const chunk of agent.chat(userMessage, signal)) {
        if (chunk.type === 'text') text += chunk.content ?? '';
      }
      return text ? `**${agent.name}**: ${text}` : null;
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    const merged = results.join('\n\n');
    yield { type: 'token', content: merged };
    yield { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } };
  }

  /** Classify user intent → agent ID */
  classifyIntent(message: string): string {
    const lower = message.toLowerCase();
    let bestAgent = 'ops';
    let bestScore = 0;

    for (const [agentId, keywords] of Object.entries(INTENT_MAP)) {
      const score = keywords.filter((kw) => lower.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }
}

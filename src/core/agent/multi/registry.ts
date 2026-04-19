/**
 * AgentRegistry — manages multiple agent instances.
 */

import { AgentInstance, type AgentConfig } from './agent-instance';
import type { ModelRouter } from '../model-router';
import type { ToolRegistry } from '../tool-registry';

export class AgentRegistry {
  private agents = new Map<string, AgentInstance>();

  constructor(
    private router: ModelRouter,
    private tools: ToolRegistry,
  ) {}

  /** Spawn a new agent from config */
  spawn(config: AgentConfig): AgentInstance {
    if (this.agents.has(config.id)) throw new Error(`Agent "${config.id}" already exists`);
    const agent = new AgentInstance(config, this.router, this.tools);
    this.agents.set(config.id, agent);
    return agent;
  }

  get(id: string): AgentInstance | undefined {
    return this.agents.get(id);
  }

  list(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  kill(id: string): boolean {
    return this.agents.delete(id);
  }

  killAll(): void {
    this.agents.clear();
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }
}

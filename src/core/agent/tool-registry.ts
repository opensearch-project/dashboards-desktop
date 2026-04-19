/**
 * Tool registry — single registry for built-in and MCP tools.
 * Handles registration, lookup, trust levels, and change notifications.
 */

import type { ToolDefinition, AgentTool, ToolResult, ToolContext, TrustLevel } from './types';

const MAX_OUTPUT_BYTES = 100 * 1024;

export class ToolRegistry {
  private tools = new Map<string, AgentTool>();
  private listeners: Array<(tools: ToolDefinition[]) => void> = [];
  private trustOverrides = new Map<string, TrustLevel>();

  register(tool: AgentTool): void {
    this.tools.set(tool.definition.name, tool);
    this.emit();
  }

  unregister(name: string): void {
    this.tools.delete(name);
    this.emit();
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /** Returns tool definitions formatted for LLM tool_use parameter */
  listForModel(): ToolDefinition[] {
    return this.list();
  }

  onChanged(cb: (tools: ToolDefinition[]) => void): void {
    this.listeners.push(cb);
  }

  setTrust(toolName: string, level: TrustLevel): void {
    this.trustOverrides.set(toolName, level);
  }

  getTrust(tool: ToolDefinition): TrustLevel {
    const override = this.trustOverrides.get(tool.name);
    if (override) return override;
    if (tool.requiresApproval) return 'ask';
    return tool.source === 'mcp' ? 'ask' : 'auto';
  }

  /** Execute a tool by name with timeout and output truncation */
  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolContext,
    timeoutMs = 30_000
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) return { content: `Tool not found: ${name}`, isError: true };

    try {
      const result = await withTimeout(tool.execute(input, context), timeoutMs);
      return {
        content: truncate(result.content, MAX_OUTPUT_BYTES),
        isError: result.isError,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: `Tool execution failed: ${msg}`, isError: true };
    }
  }

  private emit(): void {
    const defs = this.list();
    for (const cb of this.listeners) cb(defs);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tool timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function truncate(str: string, maxBytes: number): string {
  if (Buffer.byteLength(str) <= maxBytes) return str;
  const buf = Buffer.from(str);
  return buf.subarray(0, maxBytes).toString('utf-8') + '\n[truncated]';
}

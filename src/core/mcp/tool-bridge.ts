/**
 * Bridges MCP discovery into the agent ToolRegistry.
 *
 * Converts MCP-discovered tools into AgentTool instances that route
 * execution through the MCP server's JSON-RPC transport, and auto-
 * registers/unregisters tools when servers start or stop.
 */

import type { AgentTool, ToolResult, ToolContext } from '../agent/types';
import { ToolRegistry } from '../agent/tool-registry';
import { McpDiscovery } from './discovery';
import { McpSupervisor } from './supervisor';

export class McpToolBridge {
  private registered = new Set<string>();

  constructor(
    private registry: ToolRegistry,
    private discovery: McpDiscovery,
    private supervisor: McpSupervisor,
  ) {}

  /** Initial sync: discover all running servers and register their tools */
  async sync(): Promise<void> {
    await this.discovery.discoverAll();
    const tools = this.discovery.getAllTools().filter((t) => t.source !== 'builtin');
    for (const tool of tools) {
      this.registerMcpTool(tool);
    }
  }

  /** Listen for supervisor events and auto-register/unregister tools */
  listen(): void {
    this.supervisor.on('started', async (name: string) => {
      const tools = await this.discovery.discoverServer(name);
      for (const tool of tools) this.registerMcpTool(tool);
    });

    this.supervisor.on('exit', (_name: string) => this.pruneDeadTools());
    this.supervisor.on('max-restarts', (_name: string) => this.pruneDeadTools());
  }

  private registerMcpTool(mcpTool: { name: string; description: string; inputSchema: Record<string, unknown>; source: string }): void {
    const qualifiedName = `${mcpTool.source}/${mcpTool.name}`;
    const agentTool: AgentTool = {
      definition: {
        name: qualifiedName,
        description: mcpTool.description,
        source: 'mcp',
        mcpServer: mcpTool.source,
        inputSchema: mcpTool.inputSchema,
        requiresApproval: true,
      },
      execute: (input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> =>
        this.executeMcpTool(mcpTool.source, mcpTool.name, input, context),
    };
    this.registry.register(agentTool);
    this.registered.add(qualifiedName);
  }

  private async executeMcpTool(
    serverName: string,
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const state = this.supervisor.get(serverName);
    if (!state || state.status !== 'running' || !state.process?.stdin || !state.process?.stdout) {
      return { content: `MCP server '${serverName}' is not running`, isError: true };
    }

    return new Promise((resolve) => {
      const id = Date.now();
      const request = { jsonrpc: '2.0', id, method: 'tools/call', params: { name: toolName, arguments: input } };
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ content: `MCP tool '${toolName}' timed out`, isError: true });
      }, 30_000);

      const onAbort = () => {
        cleanup();
        resolve({ content: 'Cancelled', isError: true });
      };
      context.signal?.addEventListener('abort', onAbort, { once: true });

      const onData = (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n').filter(Boolean)) {
          try {
            const msg = JSON.parse(line);
            if (msg.id !== id) continue;
            cleanup();
            if (msg.error) {
              resolve({ content: msg.error.message ?? 'MCP tool error', isError: true });
            } else {
              const text = msg.result?.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? JSON.stringify(msg.result);
              resolve({ content: text, isError: false });
            }
            return;
          } catch { /* not our message */ }
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        context.signal?.removeEventListener('abort', onAbort);
        state.process?.stdout?.off('data', onData);
      };

      state.process!.stdout!.on('data', onData);
      state.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  private pruneDeadTools(): void {
    for (const name of this.registered) {
      const serverName = name.split('/')[0];
      const state = this.supervisor.get(serverName);
      if (!state || state.status !== 'running') {
        this.registry.unregister(name);
        this.registered.delete(name);
      }
    }
  }
}

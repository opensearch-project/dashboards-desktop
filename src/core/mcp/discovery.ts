import { McpSupervisor, ServerState } from './supervisor';

/** A tool exposed by an MCP server or built-in */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source: string; // 'builtin' or MCP server name
}

/** JSON-RPC message types for MCP protocol */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: { tools?: ToolDefinition[] };
  error?: { code: number; message: string };
}

const REQUEST_TIMEOUT_MS = 10000;

export class McpDiscovery {
  private builtinTools: ToolDefinition[] = [];
  private mcpTools = new Map<string, ToolDefinition[]>();
  private requestId = 0;

  constructor(private supervisor: McpSupervisor) {}

  /** Register built-in tools (opensearch-query, cluster-health, etc.) */
  registerBuiltinTools(tools: ToolDefinition[]): void {
    this.builtinTools = tools.map((t) => ({ ...t, source: 'builtin' }));
  }

  /** Discover tools from all running MCP servers */
  async discoverAll(): Promise<void> {
    this.mcpTools.clear();
    const servers = this.supervisor.list();

    const discoveries = [...servers.entries()]
      .filter(([_, s]) => s.status === 'running')
      .map(([name]) => this.discoverServer(name));

    await Promise.allSettled(discoveries);
  }

  /** Discover tools from a single MCP server via JSON-RPC over stdio */
  async discoverServer(name: string): Promise<ToolDefinition[]> {
    const state = this.supervisor.get(name);
    if (!state?.process?.stdin || !state.process.stdout) {
      return [];
    }

    try {
      // Initialize the MCP session
      await this.sendRequest(state, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'osd', version: '0.1.0' },
      });

      // List available tools
      const response = await this.sendRequest(state, 'tools/list', {});
      const tools: ToolDefinition[] = (response.result?.tools ?? []).map((t: ToolDefinition) => ({
        ...t,
        source: name,
      }));

      this.mcpTools.set(name, tools);
      return tools;
    } catch {
      this.mcpTools.set(name, []);
      return [];
    }
  }

  /** Get unified tool registry — built-in + all MCP tools */
  getAllTools(): ToolDefinition[] {
    const tools = [...this.builtinTools];
    for (const serverTools of this.mcpTools.values()) {
      tools.push(...serverTools);
    }
    return tools;
  }

  /** Find a tool by name across all sources */
  getTool(name: string): ToolDefinition | undefined {
    return this.getAllTools().find((t) => t.name === name);
  }

  /** Get tools from a specific MCP server */
  getServerTools(serverName: string): ToolDefinition[] {
    return this.mcpTools.get(serverName) ?? [];
  }

  /** Send a JSON-RPC request over the server's stdin/stdout */
  private sendRequest(
    state: ServerState,
    method: string,
    params: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
      let buffer = '';

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`MCP request '${method}' timed out`));
      }, REQUEST_TIMEOUT_MS);

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as JsonRpcResponse;
            if (msg.id === id) {
              cleanup();
              if (msg.error) {
                reject(new Error(msg.error.message));
              } else {
                resolve(msg);
              }
              return;
            }
          } catch {
            /* incomplete or not our message */
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        state.process?.stdout?.off('data', onData);
      };

      state.process?.stdout?.on('data', onData);
      state.process?.stdin?.write(JSON.stringify(request) + '\n');
    });
  }
}

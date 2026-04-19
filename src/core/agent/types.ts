/** Agent runtime types — shared across model router, tool registry, and conversation manager. */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'usage';
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: { inputTokens: number; outputTokens: number };
}

/** Stream events sent to renderer via IPC */
export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_call_start'; name: string; id: string }
  | { type: 'tool_call_input'; delta: string }
  | { type: 'tool_call_end'; id: string }
  | { type: 'tool_result'; id: string; output: string; isError: boolean }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string; code: string };

export type TrustLevel = 'auto' | 'notify' | 'ask';

export interface ToolDefinition {
  name: string;
  description: string;
  source: 'builtin' | 'mcp';
  mcpServer?: string;
  inputSchema: Record<string, unknown>;
  requiresApproval: boolean;
}

export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface ToolContext {
  workspaceId: string;
  activeConnection: { id: string; url: string; type: string; auth_type: string } | null;
  signal: AbortSignal;
}

export interface AgentTool {
  definition: ToolDefinition;
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

export interface ModelInfo {
  id: string;
  displayName: string;
  contextWindow: number;
  supportsTools: boolean;
  local: boolean;
}

export interface ModelProvider {
  id: string;
  displayName: string;
  listModels(): Promise<ModelInfo[]>;
  chat(params: {
    model: string;
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<StreamChunk>;
}

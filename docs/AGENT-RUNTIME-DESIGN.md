# Agent Runtime Design — M2

| Field | Value |
|-------|-------|
| Status | Draft |
| Milestone | M2: Agent Core |
| Depends on | RFC-2026-DESKTOP-001, ROADMAP-2026 |
| Unblocks | sde (implementation), fee (chat UI integration), test (fixture strategy) |
| Date | 2026-04-19 |

---

## 1. Tool Registration & Discovery

### Registry

All tools — built-in and MCP-sourced — live in a single `ToolRegistry`. Tools self-register at startup; MCP tools register dynamically when servers connect.

```typescript
interface ToolDefinition {
  name: string;                          // unique, e.g. "opensearch-query"
  description: string;                   // shown to the model in system prompt
  source: "builtin" | "mcp";
  mcpServer?: string;                    // set when source === "mcp"
  inputSchema: JSONSchema7;              // JSON Schema for parameters
  requiresApproval: boolean;             // default true for destructive ops
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void;
  unregister(name: string): void;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  listForModel(): ToolDefinition[];      // returns schema array for LLM tool_use
  onChanged(cb: (tools: ToolDefinition[]) => void): void;
}
```

### Schema format

Tool input schemas use [JSON Schema draft-07](https://json-schema.org/draft-07/json-schema-release-notes.html) — the same format used by OpenAI, Anthropic, and MCP `tools/list`. No translation layer needed.

### Discovery flow

```
App startup
  ├─ Load built-in tools from src/core/tools/*.ts → register()
  └─ For each configured MCP server:
       ├─ Spawn server process
       ├─ Call tools/list over MCP protocol
       └─ Register each tool with source="mcp", mcpServer=<name>

MCP server reconnect / new install
  ├─ Call tools/list
  ├─ Diff against current registry
  └─ Register new, unregister removed, emit onChanged
```

### Name collisions

MCP tools are namespaced: `<server>/<tool>`. If an MCP server exposes `query` and the server name is `github`, the registered name is `github/query`. Built-in tools have no prefix.

---

## 2. Tool Execution Sandboxing

### Approval model

Three trust levels, configurable per-tool and per-workspace:

| Level | Behavior | Default for |
|-------|----------|-------------|
| `auto` | Execute immediately, no prompt | Read-only built-ins (`cluster-health`, `opensearch-query` with read-only queries) |
| `notify` | Execute immediately, show toast notification | MCP tools from trusted servers |
| `ask` | Block until user approves in UI | Destructive ops (`index-manage` delete/reindex), `local-exec`, unknown MCP tools |

### Configuration

```typescript
interface ToolTrustConfig {
  defaults: Record<"builtin" | "mcp", TrustLevel>;  // builtin=auto, mcp=ask
  overrides: Record<string, TrustLevel>;             // per-tool, e.g. "index-manage": "ask"
}
```

Stored in SQLite `settings` table, scoped per workspace. Users configure via settings UI or `/trust` chat command:

```
/trust opensearch-query auto
/trust index-manage ask
/trust github/* notify
```

### Execution sandbox

Tools run in the main Node.js process but with guards:

1. **Timeout** — 30s default, configurable per-tool. Kills execution on timeout.
2. **Approval gate** — async check before execution; UI renders approval dialog.
3. **Audit log** — every tool call logged to SQLite `tool_executions` table (tool name, input, output, duration, approval status).
4. **Output size cap** — tool output truncated to 100KB before passing to model. Full output stored in audit log.

```typescript
async function executeTool(name: string, input: unknown): Promise<ToolResult> {
  const tool = registry.get(name);
  if (!tool) throw new ToolNotFoundError(name);

  const trust = getTrustLevel(tool, currentWorkspace);
  if (trust === "ask") await requestUserApproval(tool, input);

  const result = await withTimeout(tool.execute(input), tool.timeout ?? 30_000);
  await auditLog.record({ tool: name, input, output: result, timestamp: Date.now() });
  return truncateOutput(result, MAX_OUTPUT_BYTES);
}
```

---

## 3. Streaming Response Transport

### Decision: stdout pipe (main→renderer IPC)

| Option | Latency | Complexity | Verdict |
|--------|---------|------------|---------|
| SSE (HTTP server in main) | ~5ms | Medium — need local HTTP server | ❌ Unnecessary for same-machine IPC |
| WebSocket | ~2ms | Medium — connection lifecycle | ❌ Overkill, same process boundary |
| **stdout pipe via Electron IPC** | **<1ms** | **Low — native Electron channel** | ✅ Chosen |

The model router streams tokens from the provider SDK. Each token is forwarded to the renderer via Electron `ipcMain`/`ipcRenderer` on a dedicated channel.

### Protocol

```typescript
// Main process emits on channel "agent:stream"
type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_call_start"; name: string; id: string }
  | { type: "tool_call_input"; delta: string }
  | { type: "tool_call_end"; id: string }
  | { type: "tool_result"; id: string; output: string; isError: boolean }
  | { type: "done"; usage: { inputTokens: number; outputTokens: number } }
  | { type: "error"; message: string; code: string };

// Preload exposes via contextBridge
contextBridge.exposeInMainWorld("agent", {
  onStream: (cb: (event: StreamEvent) => void) => ipcRenderer.on("agent:stream", (_e, event) => cb(event)),
  sendMessage: (msg: string) => ipcRenderer.invoke("agent:send", msg),
  cancelGeneration: () => ipcRenderer.invoke("agent:cancel"),
});
```

### Renderer rendering

The React chat component accumulates tokens into a buffer and renders incrementally:

1. `token` events append to a `ref`-backed string buffer.
2. A `requestAnimationFrame` loop flushes the buffer to state every frame (~16ms).
3. Markdown is parsed incrementally using a streaming-capable parser (e.g. `marked` with custom renderer).
4. Code blocks get syntax highlighting via `shiki` once the block closes (fenced with `` ``` ``).
5. `tool_call_start` / `tool_result` render inline status chips ("Running opensearch-query..." → "✅ Done").

### Backpressure

If the renderer falls behind (e.g. complex markdown re-render), the IPC channel buffers in Electron's internal queue. No explicit backpressure needed — Electron IPC is async and non-blocking. The `requestAnimationFrame` batching prevents render thrashing.

### TUI mode (M5)

In TUI mode, the same `StreamEvent` protocol is consumed by an Ink component instead of React DOM. The core agent runtime is UI-agnostic — it emits events, the shell renders them.

---

## 4. Model Router

### Provider abstraction

A single `ModelProvider` interface abstracts all LLM backends. Each provider implements streaming chat completion with tool use.

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];       // assistant role only
  toolCallId?: string;          // tool role only
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface StreamChunk {
  type: "text" | "tool_call_start" | "tool_call_delta" | "tool_call_end" | "usage";
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: { inputTokens: number; outputTokens: number };
}

interface ModelProvider {
  id: string;                                        // "ollama", "openai", "anthropic", "bedrock"
  displayName: string;
  listModels(): Promise<ModelInfo[]>;
  chat(params: {
    model: string;
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<StreamChunk>;
}

interface ModelInfo {
  id: string;           // e.g. "llama3", "gpt-4o", "claude-sonnet-4-20250514"
  displayName: string;
  contextWindow: number;
  supportsTools: boolean;
  local: boolean;
}
```

### Supported providers

| Provider | SDK / Transport | Auth |
|----------|----------------|------|
| Ollama | `ollama` npm package, HTTP to `localhost:11434` | None |
| OpenAI | `openai` SDK | API key in safeStorage |
| Anthropic | `@anthropic-ai/sdk` | API key in safeStorage |
| Amazon Bedrock | `@aws-sdk/client-bedrock-runtime` | AWS credential chain |
| OpenAI-compatible | `openai` SDK with custom `baseURL` | API key or none |

### Router logic

```typescript
class ModelRouter {
  private providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void;

  /** Parse "provider:model" string, e.g. "ollama:llama3" */
  resolve(specifier: string): { provider: ModelProvider; model: string };

  /** Stream a chat turn through the resolved provider */
  chat(specifier: string, messages: ChatMessage[], tools: ToolDefinition[], signal?: AbortSignal): AsyncIterable<StreamChunk>;
}
```

The active model is stored per-workspace in SQLite. The `/model` command and UI dropdown both call `ModelRouter.resolve()` to validate before switching.

### Error handling

- Provider unreachable → surface in UI with retry button, suggest checking Ollama/API key.
- Model not found → list available models from provider, suggest closest match.
- Rate limit → exponential backoff with user-visible countdown.
- Context window exceeded → auto-truncate oldest messages (see §5).

---

## 5. Conversation Memory

### Per-workspace context

Each workspace has isolated conversation history. Switching workspaces switches the full agent context — no bleed between workspaces.

### SQLite schema

```sql
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,          -- uuid
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title       TEXT,                      -- auto-generated from first message, editable
  model       TEXT NOT NULL,             -- "ollama:llama3" at creation time
  created_at  INTEGER NOT NULL,          -- unix ms
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_conversations_workspace ON conversations(workspace_id, updated_at DESC);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,      -- uuid
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,         -- "system" | "user" | "assistant" | "tool"
  content         TEXT,                  -- text content (nullable for pure tool_call messages)
  tool_calls      TEXT,                  -- JSON array of ToolCall, nullable
  tool_call_id    TEXT,                  -- for role="tool", references the tool_call id
  token_count     INTEGER,              -- estimated tokens for context window math
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
```

### Context window management

Before each model call, the runtime assembles the message array:

1. **System prompt** — always included (tool descriptions, workspace context).
2. **Recent messages** — walk backwards from newest, summing `token_count`.
3. **Budget** — stop when cumulative tokens reach `contextWindow - reservedOutputTokens` (reserve = 4096 default).
4. **Truncation** — oldest messages beyond budget are dropped. Tool results are summarized to `"[truncated — see conversation history]"` before full drop.

```typescript
function buildContext(conversationId: string, model: ModelInfo): ChatMessage[] {
  const budget = model.contextWindow - RESERVED_OUTPUT_TOKENS;
  const systemPrompt = buildSystemPrompt(tools, workspace);
  let used = estimateTokens(systemPrompt);

  const messages = db.prepare(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC"
  ).all(conversationId);

  const included: ChatMessage[] = [];
  for (const msg of messages) {
    const cost = msg.token_count ?? estimateTokens(msg.content);
    if (used + cost > budget) break;
    included.unshift(msg);
    used += cost;
  }

  return [{ role: "system", content: systemPrompt }, ...included];
}
```

### Token estimation

Use `tiktoken` for OpenAI models, character-based heuristic (chars / 4) for others. The `token_count` column is populated on insert so context assembly is a simple sum, not a re-tokenization.

---

## 6. MCP Host Integration

### Server lifecycle

Each MCP server runs as a child process managed by `McpSupervisor`.

```
App start / MCP install
  └─ McpSupervisor.start(serverName)
       ├─ Spawn child process (command + args from config)
       ├─ Initialize MCP protocol handshake
       ├─ Call tools/list → register tools in ToolRegistry
       └─ Begin health check loop

Health check (every 30s)
  ├─ Send ping over MCP protocol
  ├─ If no pong within 5s → mark unhealthy
  └─ After 3 consecutive failures → restart with backoff

Restart (exponential backoff: 1s, 2s, 4s, 8s, max 60s)
  ├─ Kill existing process (SIGTERM → 5s → SIGKILL)
  ├─ Spawn new process
  ├─ Re-run tools/list → update ToolRegistry
  └─ Reset health check counter

App exit / MCP uninstall
  ├─ SIGTERM all MCP child processes
  ├─ Wait 5s for graceful shutdown
  ├─ SIGKILL any remaining
  └─ Unregister tools from ToolRegistry
```

### Supervisor interface

```typescript
interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

class McpSupervisor {
  private servers = new Map<string, McpServerState>();

  async start(name: string, config: McpServerConfig): Promise<void>;
  async stop(name: string): Promise<void>;
  async stopAll(): Promise<void>;
  status(name: string): "running" | "unhealthy" | "stopped" | "restarting";
  listTools(name: string): ToolDefinition[];
  onToolsChanged(cb: (server: string, tools: ToolDefinition[]) => void): void;
}
```

### Tool discovery protocol

MCP tool discovery uses the standard MCP `tools/list` JSON-RPC call. The response maps directly to `ToolDefinition`:

```
MCP tools/list response → for each tool:
  {
    name: `${serverName}/${tool.name}`,
    description: tool.description,
    source: "mcp",
    mcpServer: serverName,
    inputSchema: tool.inputSchema,       // already JSON Schema
    requiresApproval: true               // default for MCP, user can override
  }
```

### Tool execution

When the model calls an MCP tool, the runtime routes through the supervisor:

1. Parse tool name → extract server name and tool name.
2. Check server status — if unhealthy, return error to model.
3. Send `tools/call` JSON-RPC to the server's stdio transport.
4. Await response, apply timeout (30s default).
5. Return result to model as `ToolResult`.

### Orphan cleanup

On app crash (uncaught exception, SIGKILL), orphan MCP processes may linger. On next startup:

1. Read PID file (`~/.osd/mcp/pids.json`) written by supervisor.
2. Check if PIDs are still alive.
3. Kill any orphans.
4. Delete stale PID file.

---

## 7. Agent Tool Interfaces

Each built-in tool implements `AgentTool`. The M2 scope includes three tools; the interface supports future expansion.

### Base interface

```typescript
interface ToolResult {
  content: string;       // text returned to the model
  isError: boolean;
}

interface AgentTool {
  definition: ToolDefinition;
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

interface ToolContext {
  workspaceId: string;
  activeConnection: ConnectionConfig | null;
  signal: AbortSignal;
}
```

### opensearch-query

Run read queries against the active OpenSearch connection.

```typescript
interface OpenSearchQueryInput {
  index: string;                         // index pattern, e.g. "logs-*"
  body: Record<string, unknown>;         // OpenSearch query DSL
  method?: "GET" | "POST";              // default POST
  explain?: boolean;
}

// ToolDefinition.inputSchema (JSON Schema)
{
  "type": "object",
  "properties": {
    "index":   { "type": "string", "description": "Index name or pattern" },
    "body":    { "type": "object", "description": "OpenSearch query DSL body" },
    "method":  { "type": "string", "enum": ["GET", "POST"], "default": "POST" },
    "explain": { "type": "boolean", "default": false }
  },
  "required": ["index", "body"]
}
```

### cluster-health

Read-only cluster diagnostics.

```typescript
interface ClusterHealthInput {
  detail?: "summary" | "full";           // summary = _cluster/health, full = + _nodes/stats + _cat/shards
}

// JSON Schema
{
  "type": "object",
  "properties": {
    "detail": { "type": "string", "enum": ["summary", "full"], "default": "summary" }
  }
}
```

Returns cluster status, node count, shard counts, storage usage. In `full` mode, includes per-node stats and unassigned shard reasons.

### index-manage

Destructive index operations — always requires approval (`ask` trust level).

```typescript
interface IndexManageInput {
  action: "create" | "delete" | "reindex" | "alias" | "list" | "get-mapping";
  index: string;
  settings?: Record<string, unknown>;    // for create
  mappings?: Record<string, unknown>;    // for create
  destination?: string;                  // for reindex
  alias?: string;                        // for alias
}

// JSON Schema
{
  "type": "object",
  "properties": {
    "action":      { "type": "string", "enum": ["create", "delete", "reindex", "alias", "list", "get-mapping"] },
    "index":       { "type": "string" },
    "settings":    { "type": "object" },
    "mappings":    { "type": "object" },
    "destination": { "type": "string" },
    "alias":       { "type": "string" }
  },
  "required": ["action", "index"]
}
```

`list` and `get-mapping` are read-only and default to `auto` trust. `delete` and `reindex` are destructive and default to `ask`.

---

## 8. Fixture-Based Testing Strategy

### Principle

CI never calls a live LLM API. All model responses are recorded fixtures replayed deterministically.

### Recording fixtures

A `--record` flag on the test runner intercepts model provider HTTP calls and writes response fixtures:

```
tests/fixtures/
  agent/
    simple-query.json          # single-turn: user asks, model responds
    tool-use-flow.json         # model calls opensearch-query, gets result, responds
    multi-turn.json            # 3-turn conversation with context
    streaming-tokens.json      # token-by-token stream events
    error-handling.json        # model returns error, runtime recovers
```

### Fixture format

```json
{
  "name": "tool-use-flow",
  "model": "ollama:llama3",
  "turns": [
    {
      "request": {
        "messages": [
          { "role": "user", "content": "Show me error counts in logs-*" }
        ],
        "tools": ["opensearch-query", "cluster-health"]
      },
      "response": {
        "chunks": [
          { "type": "tool_call_start", "name": "opensearch-query", "id": "tc_1" },
          { "type": "tool_call_delta", "content": "{\"index\":\"logs-*\",\"body\":{\"size\":0,\"aggs\":{\"errors\":{\"terms\":{\"field\":\"error_code\"}}}}}" },
          { "type": "tool_call_end", "id": "tc_1" }
        ]
      },
      "toolResults": [
        { "id": "tc_1", "content": "{\"aggregations\":{\"errors\":{\"buckets\":[{\"key\":502,\"doc_count\":1247}]}}}", "isError": false }
      ]
    },
    {
      "request": "auto",
      "response": {
        "chunks": [
          { "type": "token", "content": "The most common error is **502** with 1,247 occurrences." },
          { "type": "done", "usage": { "inputTokens": 350, "outputTokens": 42 } }
        ]
      }
    }
  ]
}
```

### Replay mechanism

A `FixtureModelProvider` implements `ModelProvider` and replays recorded chunks:

```typescript
class FixtureModelProvider implements ModelProvider {
  id = "fixture";
  displayName = "Fixture (test only)";

  constructor(private fixture: Fixture) {}

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const turn = this.fixture.nextTurn();
    for (const chunk of turn.response.chunks) {
      yield chunk;
      await delay(1); // simulate async without real latency
    }
  }
}
```

### Test layers

| Layer | What | Tool | Fixtures? |
|-------|------|------|-----------|
| Unit | ToolRegistry, ModelRouter, context builder | Vitest | No — pure logic |
| Agent integration | Full agent loop: message → model → tool → response | Vitest + FixtureModelProvider | Yes |
| MCP lifecycle | Spawn → health check → restart → cleanup | Vitest + mock MCP server (in-repo) | No — uses test MCP server |
| E2E | Launch app → chat → send message → response renders | Playwright | Yes — FixtureModelProvider injected |

### CI contract

- `npm test` runs all unit + integration tests with fixtures. No network calls.
- The test MCP server (`tests/mcp-echo-server/`) is a simple stdio server that echoes inputs — no external dependencies.
- Fixture recording is a dev-only workflow: `npm run test:record` runs tests against a live model and writes fixtures. Recorded fixtures are committed to the repo.
- PR pipeline rejects any test that makes a real HTTP call to a model provider (enforced via `nock`'s `disableNetConnect()`).

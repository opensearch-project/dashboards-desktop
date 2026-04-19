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

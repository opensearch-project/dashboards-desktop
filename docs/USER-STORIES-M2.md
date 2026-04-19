# User Stories — Milestone 2: Agent Core

> Source: RFC-2026-DESKTOP-001, ROADMAP-2026.md
> Date: 2026-04-19
> Depends on: M1 Foundation (Electron shell, SQLite, connections, chat panel shell)

---

## Personas

| Persona | Description | Primary M2 Stories |
|---------|-------------|--------------------|
| **Developer** | Wants fast AI chat with local models, MCP tools, keyboard-driven workflow. | Chat, model switching, MCP install |
| **Data Analyst** | Wants to query clusters in natural language without writing DSL. | Natural language query, cluster health via chat |
| **Platform Engineer** | Wants to monitor and manage clusters conversationally. | Cluster health via chat, query via chat |

---

## US-M2-01: Chat with Agent

**As a** developer,
**I want** to send messages to an AI agent and receive streaming responses,
**so that** I can get help, run queries, and manage clusters through natural conversation.

**Persona:** All

### Acceptance Criteria

**AC-01.1: Send a message**
- Given the chat panel is open and a model is configured
- When the user types a message and presses Enter
- Then the message appears in the conversation thread
- And the agent begins responding

**AC-01.2: Streaming response**
- Given the agent is generating a response
- When tokens arrive from the model
- Then they render token-by-token in the chat panel
- And markdown and syntax highlighting render progressively

**AC-01.3: Tool execution feedback**
- Given the agent invokes a tool (e.g., `opensearch-query`)
- When the tool is running
- Then an inline status shows: "Running query on prod-opensearch..." with a spinner
- And the tool result is displayed when complete

**AC-01.4: Conversation persistence**
- Given the user has an active conversation
- When they close and reopen the app
- Then the conversation is restored from SQLite (workspace-scoped)

**AC-01.5: New conversation**
- Given the user wants a fresh context
- When they click "New Conversation" or press Cmd+N
- Then a new empty conversation starts
- And the previous conversation is saved and accessible from the sidebar

**AC-01.6: No model configured**
- Given no model is configured
- When the user tries to send a message
- Then the input shows: "Configure a model to start chatting" with a link to model settings

**AC-01.7: Model error / offline**
- Given the configured model is unreachable (Ollama not running, API key invalid)
- When the user sends a message
- Then an error appears inline: "Could not reach ollama:llama3 — is Ollama running?" with a retry action

---

## US-M2-02: Switch Models Mid-Conversation

**As a** developer,
**I want** to switch AI models during a conversation,
**so that** I can use a fast local model for simple tasks and a powerful cloud model for complex reasoning.

**Persona:** Developer (primary), All

### Acceptance Criteria

**AC-02.1: Model selector in chat header**
- Given the chat panel is open
- When the user views the chat header
- Then a model selector pill/dropdown shows the current model (e.g., "ollama:llama3")

**AC-02.2: Switch via dropdown**
- Given the user clicks the model selector
- When the dropdown opens
- Then all configured models are listed with provider and name
- And selecting a model switches immediately

**AC-02.3: Switch via /model command**
- Given the user is in a conversation
- When they type `/model anthropic:claude-sonnet`
- Then the model switches and a system message confirms: "Switched to anthropic:claude-sonnet"

**AC-02.4: Conversation continuity**
- Given the user switches models mid-conversation
- When they send the next message
- Then the full conversation history is sent to the new model
- And the response comes from the new model

**AC-02.5: Model unavailable**
- Given the user selects a model that is not reachable
- When the switch is attempted
- Then an error shows: "Cannot connect to anthropic:claude-sonnet — check your API key"
- And the previous model remains active

---

## US-M2-03: Install and Use MCP Server

**As a** developer,
**I want** to install MCP servers that extend the agent's capabilities,
**so that** the agent can access my filesystem, GitHub repos, databases, and custom tools.

**Persona:** Developer

### Acceptance Criteria

**AC-03.1: Install MCP server**
- Given the user runs `osd mcp install @modelcontextprotocol/server-filesystem`
- When the installation completes
- Then the MCP server is registered in `~/.osd/mcp/config.json`
- And the server is started as a child process

**AC-03.2: MCP tools visible to agent**
- Given an MCP server is running and exposes tools
- When the user starts a conversation
- Then the agent can discover and invoke MCP tools alongside built-in tools
- And there is no user-visible distinction between MCP tools and built-in tools

**AC-03.3: MCP server health**
- Given an MCP server is running
- When the server crashes
- Then the supervisor auto-restarts it with exponential backoff
- And if restart fails 3 times, the server is marked as unhealthy

**AC-03.4: List installed servers**
- Given the user runs `osd mcp list`
- When the output is displayed
- Then each server shows: name, status (running/stopped/unhealthy), tool count

**AC-03.5: Orphan cleanup on exit**
- Given MCP servers are running as child processes
- When the user quits OSD Desktop
- Then all MCP server processes receive SIGTERM
- And after a 5-second timeout, remaining processes receive SIGKILL

**AC-03.6: Configure MCP server**
- Given the user runs `osd mcp config server-filesystem --root ~/data`
- When the configuration is saved
- Then the server restarts with the new configuration

---

## US-M2-04: Run a Query via Natural Language

**As a** data analyst,
**I want** to ask questions about my data in plain English,
**so that** I can explore OpenSearch and Elasticsearch without writing query DSL.

**Persona:** Data Analyst (primary), Developer

### Acceptance Criteria

**AC-04.1: Natural language to query**
- Given the user has an active OpenSearch or Elasticsearch connection
- When they type "Show me the top 10 error codes in the last hour"
- Then the agent translates this to the appropriate query DSL
- And executes it against the active connection
- And displays the results in a formatted table

**AC-04.2: Query tool feedback**
- Given the agent is running a query
- When the `opensearch-query` or `elasticsearch-query` tool executes
- Then the chat shows: "Running query on prod-opensearch..." with a spinner
- And the query DSL is shown (collapsed/expandable) for transparency

**AC-04.3: No active connection**
- Given no connection is active in the current workspace
- When the user asks a data question
- Then the agent responds: "No data source connected. Add a connection in Settings to query your clusters."

**AC-04.4: Query error**
- Given the query fails (index not found, syntax error, timeout)
- When the error is returned
- Then the agent explains the error in plain language and suggests a fix
- And the raw error is available in an expandable detail section

**AC-04.5: Cross-engine support**
- Given the user has both OpenSearch and Elasticsearch connections
- When they ask a question
- Then the agent uses the correct client library for the active connection type
- And query DSL differences between engines are handled transparently

---

## US-M2-05: View Cluster Health via Chat

**As a** platform engineer,
**I want** to ask the agent about cluster health in natural language,
**so that** I can quickly assess cluster status without navigating admin UIs.

**Persona:** Platform Engineer (primary), Data Analyst

### Acceptance Criteria

**AC-05.1: Cluster health summary**
- Given the user has an active connection
- When they ask "What's the health of my cluster?"
- Then the agent invokes the `cluster-health` tool
- And displays: cluster name, status (GREEN/YELLOW/RED), node count, index count, shard count, storage used/total

**AC-05.2: Proactive warnings**
- Given the cluster has issues (unassigned shards, no replicas, high disk usage)
- When the health summary is displayed
- Then the agent highlights warnings: "⚠️ 2 indices have no replicas: audit-logs, temp-reindex"
- And offers to fix: "Want me to add replicas?"

**AC-05.3: Node-level detail**
- Given the user asks "Show me node stats"
- When the agent responds
- Then it shows per-node: name, role, heap usage, disk usage, CPU, load average

**AC-05.4: Connection switching in chat**
- Given the user has multiple connections
- When they say "Switch to staging-elastic and show me cluster health"
- Then the agent switches the active connection and runs the health check
- And confirms: "Switching to staging-elastic (Elasticsearch 8.17)..."

**AC-05.5: Offline cluster**
- Given the active connection's cluster is unreachable
- When the user asks about health
- Then the agent responds: "Cannot reach prod-opensearch — the cluster appears to be offline. Last known status: GREEN (2 hours ago)."

---

## Error Scenarios

### E-01: Model Errors

| Trigger | Behavior |
|---------|----------|
| Ollama not running | "Could not reach ollama:llama3 — is Ollama running? Start it with `ollama serve`" |
| Invalid API key (OpenAI/Anthropic) | "Authentication failed — check your API key in Settings" |
| Bedrock access denied | "Access denied for Bedrock model — verify your IAM permissions and region" |
| Model returns empty response | "The model returned an empty response. Try rephrasing or switching models." |
| Rate limited | "Rate limited by provider. Waiting 30s before retry..." (auto-retry with backoff) |

### E-02: Tool Execution Errors

| Trigger | Behavior |
|---------|----------|
| Query timeout (30s) | "Query timed out after 30s. The cluster may be under heavy load. Try a narrower time range." |
| Index not found | "Index 'logs-2026.04' not found. Available indices: logs-2026.03, logs-2026.02..." |
| Permission denied on cluster | "Permission denied — your user doesn't have access to index 'security-audit'. Contact your cluster admin." |
| MCP tool fails | "Tool 'filesystem:read' failed: Permission denied. Check MCP server configuration." |

### E-03: MCP Errors

| Trigger | Behavior |
|---------|----------|
| MCP server won't start | "MCP server 'filesystem' failed to start: port 3000 already in use" |
| MCP server crashes repeatedly | "MCP server 'github' is unhealthy — crashed 3 times. Check logs with `osd mcp logs github`" |
| MCP install fails (network) | "Failed to install @modelcontextprotocol/server-github — check your network connection" |

---

## Story Map

```
                    Setup                 Daily Chat             Power Use
                    ─────                 ──────────             ─────────
Developer           US-M2-02 (models)    US-M2-01 (chat)       US-M2-03 (MCP)
                    US-M2-03 (MCP)       US-M2-04 (NL query)

Data Analyst        —                    US-M2-01 (chat)       US-M2-04 (NL query)
                                         US-M2-05 (health)

Platform Engineer   US-M2-02 (models)    US-M2-05 (health)     US-M2-04 (NL query)
                                         US-M2-01 (chat)
```

---

## Priority

| Story | Priority | Effort | Rationale |
|-------|----------|--------|-----------|
| US-M2-01 | P0 | XL | Core value prop. Chat must work or M2 has no deliverable. |
| US-M2-02 | P0 | M | Model flexibility is a key differentiator vs ChatGPT/Claude Desktop. |
| US-M2-04 | P0 | L | Natural language query is the "wow" moment for data users. |
| US-M2-05 | P1 | M | Cluster health via chat demonstrates agent + admin integration. |
| US-M2-03 | P1 | L | MCP is a differentiator but can ship slightly after core chat. |

---

## Dependencies on M1

| M2 Story | Requires from M1 |
|----------|-------------------|
| US-M2-01 | Chat panel shell (US-M1-06), SQLite conversations table, IPC bridge |
| US-M2-02 | Chat panel header UI (US-M1-06) |
| US-M2-03 | `~/.osd/` directory structure, CLI entry point (`bin/osd.js`) |
| US-M2-04 | Connection manager (US-M1-03), both client libraries |
| US-M2-05 | Connection manager (US-M1-03), connection health checks (US-M1-02) |

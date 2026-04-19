# AI Chat Usage Guide

How to use the AI agent — conversations, model switching, tools, and streaming responses.

---

## Starting a Conversation

### From the GUI

1. Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux)
2. Type your message and press Enter
3. The agent responds with streaming text (token-by-token)

### From the CLI

```bash
osd chat                              # Interactive session
osd chat --model ollama:llama3        # Specify model
osd chat "What's my cluster health?"  # One-shot query
```

### New Conversation

Press **Cmd+N** or click "New Conversation" in the sidebar. Previous conversations are saved and accessible from the conversation list.

---

## Model Switching

### GUI — Model Selector

Click the model pill in the chat header (e.g., "ollama:llama3"). A dropdown shows all configured models. Select one to switch immediately.

### Chat — /model Command

```
/model anthropic:claude-sonnet
```
> Switched to anthropic:claude-sonnet

### CLI — --model Flag

```bash
osd chat --model bedrock:claude-sonnet
```

### Supported Providers

| Provider | Example | Local/Cloud |
|----------|---------|-------------|
| Ollama | `ollama:llama3`, `ollama:mistral` | Local |
| OpenAI | `openai:gpt-4o`, `openai:o3` | Cloud |
| Anthropic | `anthropic:claude-sonnet` | Cloud |
| Amazon Bedrock | `bedrock:claude-sonnet` | Cloud |
| OpenAI-compatible | `custom:http://localhost:8080/v1` | Either |

### Model Auto-Routing

When enabled, the app automatically picks a fast local model for simple queries and a powerful cloud model for complex reasoning.

Enable in Settings → Models → Auto-route. Configure:
- **Fast model** — e.g., `ollama:llama3`
- **Powerful model** — e.g., `anthropic:claude-sonnet`

A small label on each response shows which model was used. Override anytime with `/model` or the dropdown.

---

## Streaming Responses

Responses render token-by-token with:
- **Markdown** — headers, lists, bold, italic, links
- **Syntax highlighting** — code blocks with language detection
- **Tables** — formatted data tables for query results
- **Copy button** — on every code block

---

## Tool Calls

When the agent needs to perform an action, it invokes a tool. You'll see:

```
Running query on prod-opensearch... ⏳
```

Then the result appears inline. The query DSL is available in an expandable section for transparency.

### Built-in Tools

| Tool | What It Does |
|------|-------------|
| `opensearch-query` | Run queries against OpenSearch clusters |
| `elasticsearch-query` | Run queries against Elasticsearch clusters |
| `cluster-health` | Cluster stats, nodes, shards, storage |
| `index-manage` | Create, delete, reindex, manage aliases |
| `admin-opensearch` | Security, alerting, ISM, snapshots, ingest |
| `admin-elasticsearch` | ILM, Watcher, snapshots, ingest, security |

MCP tools from installed servers also appear here — no distinction from the user's perspective.

---

## Conversation Management

### Conversation Sidebar

The left side of the chat panel lists all conversations (workspace-scoped). Search by title to find past conversations.

### Rename a Conversation

Right-click a conversation in the sidebar → Rename.

### Pin a Message

Click the pin icon on any message. View all pinned messages via the "Pinned" filter in the conversation header.

### Branch a Conversation

Right-click any message → "Branch from here". Creates a new conversation starting from that point. The original is unchanged.

### Delete a Conversation

Right-click in the sidebar → Delete. Confirmation required.

---

## Conversation Persistence

All conversations are stored in SQLite (`~/.osd/osd.db`), workspace-scoped. Close and reopen the app — your conversations are there.

---

## Error Handling

| Error | What You See |
|-------|-------------|
| Model not configured | "Configure a model to start chatting" with link to Settings |
| Ollama not running | "Could not reach ollama:llama3 — is Ollama running? Start with `ollama serve`" |
| Invalid API key | "Authentication failed — check your API key in Settings" |
| Query timeout | "Query timed out after 30s. Try a narrower time range." |
| Rate limited | "Rate limited. Waiting 30s before retry..." (auto-retry) |
| Empty response | "The model returned an empty response. Try rephrasing or switching models." |

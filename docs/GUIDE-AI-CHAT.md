# Getting Started with AI Chat

A practical guide to using the AI agent in OSD Desktop.

---

## Your First Conversation

1. Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) to open the chat panel
2. Type a question and press Enter:
   ```
   What can you help me with?
   ```
3. The agent responds with a summary of its capabilities

## Choosing a Model

### Local (Private, No API Key)

Install [Ollama](https://ollama.ai/), pull a model, and start it:

```bash
ollama pull llama3
ollama serve
```

OSD Desktop auto-detects Ollama at localhost:11434.

### Cloud (More Powerful)

Configure an API key in Settings → Models:
- **OpenAI** — GPT-4o, o3
- **Anthropic** — Claude Sonnet, Opus
- **Amazon Bedrock** — any Bedrock model (needs AWS credentials)

### Switching Models

Switch anytime — mid-conversation is fine:

```
/model ollama:llama3          # Fast, local
/model anthropic:claude-sonnet # Powerful, cloud
```

Or click the model pill in the chat header.

### Auto-Routing

Let the app pick the best model automatically:
- Simple questions (lookups, counts) → fast local model
- Complex reasoning (analysis, multi-step plans) → cloud model

Enable in Settings → Models → Auto-route.

---

## Querying Your Data

### Natural Language Queries

Just describe what you want:

```
Show me the top 10 error codes in the last hour
```

The agent translates to query DSL, runs it, and formats the results as a table. The raw query is available in a collapsible section.

### Follow-Up Questions

The agent remembers context within a conversation:

```
> Show me error codes from logs-* in the last hour
(agent shows table)

> Which one increased the most compared to yesterday?
(agent compares, no need to repeat the index or time range)
```

### Specifying Clusters

If you have multiple connections, tell the agent which one:

```
> Switch to staging-elastic
> Show me cluster health
```

Or the agent uses your active connection by default.

---

## Tool Calls

When the agent needs to perform an action, you'll see inline feedback:

```
Running query on prod-opensearch... ⏳
```

Results appear inline. Long outputs are collapsible — click to expand/collapse.

### Available Tools

| Tool | What It Does | Example Prompt |
|------|-------------|----------------|
| `opensearch-query` | Run queries | "Show me all documents where status=500" |
| `elasticsearch-query` | Run queries (ES) | "Count documents in logs-* by day" |
| `cluster-health` | Cluster stats | "Is my cluster healthy?" |
| `index-manage` | Index operations | "Create an index called test-logs" |
| `admin-opensearch` | OS admin | "List all alerting monitors" |
| `admin-elasticsearch` | ES admin | "Show me ILM policies" |
| MCP tools | Anything from MCP servers | "List files in ~/projects" |

---

## Managing Conversations

### New Conversation

Press **Cmd+N** — starts fresh context. Previous conversation is saved.

### Find Past Conversations

The sidebar lists all conversations (workspace-scoped). Search by title.

### Pin Important Messages

Click the pin icon on any message. View pinned messages via the "Pinned" filter.

### Branch a Conversation

Right-click any message → "Branch from here". Explore a different approach without losing the original thread.

### Retry or Edit

- **Retry** — re-send the last message to get a different response
- **Edit & Resend** — modify your message and re-send

---

## Prompt Templates

Common tasks have built-in templates. Type `/` to see them:

| Template | What It Does |
|----------|-------------|
| `/health` | Check cluster health with proactive warnings |
| `/indices` | List indices with size, doc count, health |
| `/alerts` | Show active alerting monitors |
| `/snapshot` | List recent snapshots |

---

## Tips

- **Be specific** — "Show me the 5 largest indices in prod-opensearch" works better than "show indices"
- **Use follow-ups** — the agent keeps context, so build on previous answers
- **Switch models for different tasks** — local for quick lookups, cloud for analysis
- **Pin results you'll need later** — cluster health summaries, query results, generated configs
- **Branch when exploring** — try different approaches without losing your original thread

# Getting Started with OpenSearch Dashboards Desktop

## Install

```bash
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
npm install
npm run build:ts
```

## Launch

```bash
osd                # Desktop GUI
osd --tui          # Terminal UI
osd chat           # Quick chat from terminal
```

## First Run

On first launch, the app creates `~/.osd/` with a SQLite database and walks you through:

1. **Pick a model** — local (Ollama) or cloud (OpenAI, Anthropic, Bedrock)
2. **Add a connection** — point to an OpenSearch or Elasticsearch cluster (or skip)
3. **Create a workspace** — workspaces group connections, conversations, and settings

## Connect a Model

### Local (Ollama)

```bash
# Install Ollama: https://ollama.ai
ollama pull llama3
ollama serve
```

The app auto-detects Ollama at `localhost:11434`. No config needed.

### Cloud

Set API keys in Settings or via CLI:

```bash
# OpenAI
osd settings set openai_api_key sk-...

# Anthropic
osd settings set anthropic_api_key sk-ant-...

# Switch models anytime
osd chat --model openai:gpt-4o
osd chat --model anthropic:claude-sonnet-4-20250514
osd chat --model bedrock:anthropic.claude-sonnet-4-20250514-v1:0
```

## Add a Data Source

### GUI
Settings → Connections → Add Connection

### CLI
```bash
# OpenSearch
osd connect add --name prod --url https://search-prod.us-east-1.es.amazonaws.com --auth aws-sigv4 --region us-east-1

# Elasticsearch
osd connect add --name staging --url https://staging.es.eu-west-1.aws.elastic.co:9243 --auth apikey --key <key>

# Test it
osd connect test prod
```

## Chat with Your Clusters

```bash
osd chat
```

```
> Show me the top error codes in logs-* from the last hour

Querying prod-opensearch...

| Error Code | Count |
|------------|-------|
| 502        | 1,247 |
| 500        | 891   |

> Create an alerting monitor for 502 errors > 100/min

✅ Created monitor "502 Error Spike" on prod-opensearch
```

The agent has access to these tools:
- `opensearch-query` / `elasticsearch-query` — run queries
- `cluster-health` — cluster stats, nodes, shards
- `index-manage` — create, delete, reindex, aliases
- `admin-opensearch` — security, alerting, ISM, snapshots, ingest
- `admin-elasticsearch` — ILM, Watcher, snapshots, ingest, security
- Any tools from installed MCP servers

## Switch Agent Personas

```bash
osd agent list                    # See available personas
osd agent switch ops-agent        # Cluster ops focus
osd agent switch analyst-agent    # Data analysis focus
osd agent switch security-agent   # Security & audit focus
osd agent switch default          # General purpose
```

Each persona changes the system prompt and available tool set.

## MCP Servers

Extend the agent with MCP (Model Context Protocol) servers:

```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp config server-filesystem --root ~/data
osd mcp start server-filesystem
osd mcp list
```

MCP tools appear alongside built-in tools automatically.

## Skills & Plugins

```bash
# Skills (agent capabilities)
osd skill install ./my-skill
osd skill list

# Plugins (UI extensions)
osd plugin install opensearch-security-dashboards
osd plugin list
```

## Model Auto-Routing

Auto-routing picks a local model for simple queries and a cloud model for complex ones:

```bash
# Enable in settings
osd settings set autorouting_enabled true
osd settings set autorouting_local_model ollama:llama3
osd settings set autorouting_cloud_model anthropic:claude-sonnet-4-20250514
```

Override anytime with `/model <provider:model>` in chat.

## Health Check

```bash
osd doctor
```

```
🟢 Data directory: /home/user/.osd
🟢 SQLite database: 142 KB
🟢 Ollama: 3 model(s) available
🟢 OpenAI API key: Configured
🔴 Connection: prod — unreachable
   → Fix: Check URL and network connectivity
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl+K | Open/focus chat |
| Cmd/Ctrl+Shift+Enter | Full-screen chat |
| Cmd/Ctrl+M | Model switcher |

## File Layout

```
~/.osd/
├── osd.db           # SQLite — conversations, connections, settings
├── config.yaml      # App config
├── mcp/             # MCP server configs
├── skills/          # Installed skills
└── plugins/         # Installed plugins
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Cannot connect to Ollama" | Run `ollama serve` |
| "Model not found" | Run `ollama pull <model>` |
| "Invalid API key" | Check key in Settings |
| App won't start | Run `osd doctor` |
| Build fails | Check Node 18+, run `npm run build:ts` |

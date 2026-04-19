# Getting Started with OSD Desktop

Get up and running in under 10 minutes.

---

## Prerequisites

OSD Desktop wraps a local OpenSearch Dashboards instance. You need:

1. **OSD Desktop app** — the Electron shell (download below)
2. **OpenSearch Dashboards** — the OSD binary that runs locally

### Installing OpenSearch Dashboards

Download the OSD tarball for your platform from [opensearch.org/downloads](https://opensearch.org/downloads.html):

```bash
# macOS / Linux
tar -xzf opensearch-dashboards-2.x.x.tar.gz
export OSD_HOME=~/opensearch-dashboards-2.x.x

# Or set the path in OSD Desktop settings after first launch
```

OSD Desktop will manage the OSD process automatically — you don't need to start it manually. Just tell the app where the OSD binary lives.

> **Note:** You do NOT need a local OpenSearch cluster. OSD Desktop connects to remote clusters. The local OSD instance provides the admin UI only.

---

## Installation

### macOS

**Homebrew (recommended):**
```bash
brew install --cask osd-desktop
```

**Manual download:**
1. Go to [GitHub Releases](https://github.com/opensearch-project/dashboards-desktop/releases)
2. Download `OSD-Desktop-x.x.x-mac-arm64.dmg` (Apple Silicon) or `OSD-Desktop-x.x.x-mac-x64.dmg` (Intel)
3. Open the `.dmg` and drag OSD Desktop to Applications
4. On first launch, right-click → Open to bypass Gatekeeper

### Linux

**apt (Debian/Ubuntu):**
```bash
sudo apt-get update && sudo apt-get install osd-desktop
```

**Manual download:**
1. Download `OSD-Desktop-x.x.x-linux-x64.AppImage` (or `.deb`) from [GitHub Releases](https://github.com/opensearch-project/dashboards-desktop/releases)
2. Make executable: `chmod +x OSD-Desktop-*.AppImage`
3. Run: `./OSD-Desktop-*.AppImage`

### Windows

1. Download `OSD-Desktop-x.x.x-win-x64.exe` from [GitHub Releases](https://github.com/opensearch-project/dashboards-desktop/releases)
2. Run the installer
3. OSD Desktop appears in the Start menu

### Verify Installation

```bash
osd --version
# OSD Desktop v0.1.0
```

---

## First Launch & Onboarding

When you launch OSD Desktop for the first time, a setup wizard walks you through initial configuration.

### Step 0: OSD Binary Location

On first launch, the app checks for a local OpenSearch Dashboards installation:
- If found in a standard location (`/usr/share/opensearch-dashboards`, `~/opensearch-dashboards-*`), it's auto-detected
- If not found, you'll be prompted to set the path or download OSD

Once configured, the app spawns OSD automatically on launch (localhost:5601). You'll see the real OSD UI inside the Electron window, with the agent chat panel as an overlay.

### Step 1: Choose a Model

Pick how the AI agent will run:

| Option | What It Does |
|--------|-------------|
| **Ollama (local)** | Runs models on your machine. Private, no API key needed. Requires [Ollama](https://ollama.ai/) installed. |
| **OpenAI** | Uses GPT-4o / o3 / o4-mini. Requires an API key. |
| **Anthropic** | Uses Claude Sonnet / Opus. Requires an API key. |
| **Amazon Bedrock** | Uses any Bedrock model. Requires AWS credentials. |
| **Skip for now** | Set up a model later in Settings. |

> **Tip:** If you're not sure, pick Ollama. Install it with `brew install ollama`, then `ollama pull llama3`.

### Step 2: Add a Connection (Optional)

Connect to an OpenSearch or Elasticsearch cluster. You can skip this and add connections later.

### Step 3: Create a Workspace

Workspaces group your connections and conversations. A "Default" workspace is pre-filled — rename it or accept the default.

Click **Get Started** and you're on the homepage.

---

## Adding Your First Connection

### OpenSearch (AWS)

1. Click **Add Connection** on the homepage (or Settings → Connections → Add)
2. Fill in:
   - **Name:** `prod-opensearch`
   - **Type:** OpenSearch
   - **URL:** `https://search-prod.us-east-1.es.amazonaws.com`
   - **Auth:** AWS SigV4/SSO
   - **Region:** `us-east-1`
3. Click **Test Connection**
4. On success (✅ Connected — OpenSearch 2.17), click **Save**

> **AWS credentials:** The app uses your AWS credential chain (`~/.aws/credentials`, environment variables, or SSO). Run `aws sso login` if using SSO.

### OpenSearch (Self-Managed)

1. Click **Add Connection**
2. Fill in:
   - **Name:** `local-opensearch`
   - **Type:** OpenSearch
   - **URL:** `https://localhost:9200`
   - **Auth:** Basic Auth
   - **Username:** `admin`
   - **Password:** `admin`
3. Click **Test Connection** → **Save**

### Elasticsearch

1. Click **Add Connection**
2. Fill in:
   - **Name:** `staging-elastic`
   - **Type:** Elasticsearch
   - **URL:** `https://staging.es.eu-west-1.aws.elastic.co:9243`
   - **Auth:** API Key
   - **API Key:** your Elasticsearch API key
3. Click **Test Connection** → **Save**

> **Credentials are encrypted** using your OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service). They are never stored in plain text.

---

## Your First Chat

1. Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) to open the chat panel
2. Type a message:
   ```
   What's the health of my cluster?
   ```
3. The agent queries your active connection and responds with cluster status, node count, shard allocation, and any warnings
4. Try a follow-up:
   ```
   Show me the top 10 largest indices
   ```

### What You Can Ask

| Task | Example Prompt |
|------|---------------|
| Cluster health | "What's the health of my cluster?" |
| Query data | "Show me error codes from the last hour" |
| Index management | "Create an index called test-logs with 3 shards" |
| Explain errors | "Why do I have unassigned shards?" |
| Compare clusters | "Compare index count between prod and staging" |

---

## Switching Models

### From the Chat Panel

Click the model pill in the chat header (e.g., "ollama:llama3") and select a different model from the dropdown.

### Using the /model Command

```
/model anthropic:claude-sonnet
```
> Switched to anthropic:claude-sonnet

### From the CLI

```bash
osd chat --model ollama:mistral
```

### Supported Providers

| Provider | Example | Local/Cloud |
|----------|---------|-------------|
| Ollama | `ollama:llama3`, `ollama:mistral` | Local |
| OpenAI | `openai:gpt-4o`, `openai:o3` | Cloud |
| Anthropic | `anthropic:claude-sonnet` | Cloud |
| Amazon Bedrock | `bedrock:claude-sonnet` | Cloud |
| Any OpenAI-compatible | `custom:http://localhost:8080/v1` | Either |

---

## Installing an MCP Server

MCP (Model Context Protocol) servers extend the agent with new tools — filesystem access, GitHub integration, databases, and more.

### Install

```bash
osd mcp install @modelcontextprotocol/server-filesystem
```

### Configure

```bash
osd mcp config server-filesystem --root ~/projects
```

### Verify

```bash
osd mcp list
# server-filesystem  ✅ running  3 tools
```

The agent automatically discovers MCP tools. Ask it:
```
List the files in my projects directory
```

### Popular MCP Servers

| Server | What It Does |
|--------|-------------|
| `server-filesystem` | Read/write local files |
| `server-github` | GitHub repos, issues, PRs |
| `server-postgres` | Query PostgreSQL databases |
| `server-sqlite` | Query SQLite databases |

---

## Installing a Plugin

Plugins add dashboards, visualizations, and admin features.

### From the GUI

1. Open Settings → Plugins
2. Browse available plugins
3. Click **Install** on any plugin card

### From the CLI

```bash
osd plugin install opensearch-security-dashboards
osd plugin list
```

### Remove a Plugin

```bash
osd plugin remove opensearch-security-dashboards
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd+K** / **Ctrl+K** | Open or focus chat panel |
| **Cmd+Shift+Enter** | Toggle fullscreen chat |
| **Cmd+N** / **Ctrl+N** | New conversation |
| **Cmd+M** / **Ctrl+M** | Command palette model switcher |
| **Escape** | Close chat panel |
| **Cmd+,** / **Ctrl+,** | Open settings |

---

## CLI Quick Reference

```bash
osd                          # Launch desktop GUI
osd chat                     # Quick chat in terminal
osd chat --model ollama:llama3  # Chat with specific model
osd connect list             # List connections
osd connect test <name>      # Test a connection
osd mcp list                 # List MCP servers
osd plugin list              # List plugins
osd doctor                   # Check all subsystems
osd update --check           # Check for updates
osd --help                   # Full command reference
```

---

## Next Steps

- **[Admin Guide](ADMIN-GUIDE.md)** — Managing OpenSearch and Elasticsearch clusters
- **[User Stories](USER-STORIES-M1.md)** — Detailed feature specifications
- **[RFC](../RFC-2026-DESKTOP-AGENT.md)** — Full technical proposal
- **[Contributing](../CONTRIBUTING.md)** — How to contribute to the project

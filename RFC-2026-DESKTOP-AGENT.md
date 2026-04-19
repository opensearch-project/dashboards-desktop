# RFC: OpenSearch Dashboards Desktop — Agent-First Reboot

| Field | Value |
|-------|-------|
| RFC # | 2026-DESKTOP-001 |
| Date | 2026-04-19 |
| Status | Draft |
| Authors | OpenSearch Dashboards Desktop Team |
| Repo | `opensearch-project/dashboards-desktop` |

---

## 1. Summary

Reboot `dashboards-desktop` as an **agent-first desktop application** — a local, privacy-respecting alternative to cloud-based AI chat tools (ChatGPT, Claude) that doubles as a powerful OpenSearch and Elasticsearch admin tool. The app runs OpenSearch Dashboards locally without requiring a local OpenSearch cluster, supports GitHub/Google login, uses SQLite for local storage, and provides a full plugin/MCP/skill ecosystem.

## 2. Motivation

### 2.1 The Shift to CLI + Desktop

The rise of AI agents has reversed the browser-first trend. More users now prefer CLI and desktop apps because they can:

- **Use local tools** — file system, scripts, databases, CLIs
- **Run MCP servers** — extend agent capabilities with Model Context Protocol
- **Keep data local** — no cloud dependency for sensitive workloads
- **Customize deeply** — install plugins, skills, agents, and configurations

Browser-based dashboards can't do any of this. Desktop can.

### 2.2 Current State

The existing repo is a dormant Electron proof-of-concept from 2023 — a single config form for AWS credentials. No working functionality. Only dependabot bumps for two years.

### 2.3 The Opportunity

Deliver what ChatGPT and Claude Desktop can't: a **local-first, extensible, open-source agent desktop** that also happens to be the best way to manage OpenSearch and Elasticsearch clusters.

### 2.4 Target Users

| Persona | Need |
|---------|------|
| Developer | Agent chat + local tools + MCP for daily workflows |
| Data engineer | Connect to any data source, explore with natural language |
| Platform engineer | Manage OpenSearch & Elasticsearch clusters from one tool |
| Security researcher | Air-gapped log analysis with local AI |
| Power user | Customizable agent with any model, any plugin, any skill |

## 3. Proposal

### 3.1 Core Principles

1. **Agent-first** — chat is the primary interface, not an add-on
2. **Local-first** — OSD runs locally, no local OpenSearch required
3. **Open model** — user picks any model (local or cloud), switch anytime
4. **Extensible** — install CLI tools, agents, skills, MCP servers, plugins
5. **Admin-capable** — manage OpenSearch and Elasticsearch from one app

### 3.2 Dual-Mode Application

```
osd                  # Launch desktop GUI (Electron)
osd --tui            # Launch terminal/CLI mode
osd chat             # Quick agent chat (no GUI)
```

### 3.3 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     osd (CLI entry point)                    │
│            --tui → TUI mode  │  default → GUI mode           │
├─────────────────────┬───────────────────────────────────────┤
│  Electron Shell     │  TUI Shell (Ink)                      │
│  ┌───────────────┐  │  ┌─────────────────────────────────┐  │
│  │ Homepage       │  │  │ Chat + Split Pane               │  │
│  │ Workspace Mgr  │  │  │ (conversation | results)        │  │
│  │ Chat Panel     │  │  └─────────────────────────────────┘  │
│  │ Admin Console  │  │                                      │
│  └───────────────┘  │                                      │
├─────────────────────┴───────────────────────────────────────┤
│                        Core Layer                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Agent Runtime │ │ Model Router │ │ MCP Host             │ │
│  │ (chat, tools) │ │ (any model)  │ │ (local MCP servers)  │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Data Source   │ │ Plugin Mgr   │ │ Skill / CLI          │ │
│  │ Connector     │ │ (OSD plugins)│ │ Registry             │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Auth (OAuth)  │ │ SQLite Store │ │ Update Manager       │ │
│  │ GitHub/Google │ │ (all local)  │ │ (pull src or dist)   │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  OpenSearch Client (JS)  │  Elasticsearch Client (JS)       │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Homepage & Workspace

The app launches to a **Homepage** — not a blank dashboard. The homepage is the command center:

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 OpenSearch Dashboards Desktop                    [user] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💬 Start a conversation          [Cmd+K]                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Ask anything... (model: ollama:llama3)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  📂 Workspaces                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Prod     │ │ Staging  │ │ Dev      │ │ + New    │      │
│  │ 3 conns  │ │ 1 conn   │ │ 2 conns  │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  🔌 Connected Data Sources                                  │
│  • prod-opensearch (us-east-1) ................ 🟢 healthy │
│  • staging-elastic (eu-west-1) ................ 🟢 healthy │
│  • local-opensearch (localhost:9200) .......... 🔴 offline │
│                                                             │
│  📊 Recent                                                  │
│  • "Error rate dashboard" — 2 hours ago                     │
│  • "Index cleanup script" — yesterday                       │
│  • "Cluster health check" — 3 days ago                      │
│                                                             │
│  🧩 Installed: 12 plugins │ 3 skills │ 2 MCP servers       │
└─────────────────────────────────────────────────────────────┘
```

**Workspaces** group related connections, dashboards, saved queries, and conversation history:

- Each workspace has its own set of data source connections
- Workspace-scoped agent memory (conversations stay in context)
- Switch workspaces to switch context entirely
- Export/import workspaces as portable bundles

### 3.5 No Local OpenSearch Required

The app runs OSD locally but **does not require a local OpenSearch instance**. Users connect to remote clusters:

- Remote OpenSearch clusters (AWS, self-managed)
- Remote Elasticsearch clusters (Elastic Cloud, self-managed)
- Local OpenSearch (optional, for dev/testing)

The app is a **client** — it connects to data sources, it doesn't host them.

### 3.6 Authentication: GitHub & Google Login

| Provider | Flow | Use Case |
|----------|------|----------|
| GitHub OAuth | PKCE via Electron | OSS contributors, plugin devs |
| Google OAuth | PKCE via Electron | Enterprise users, Google Workspace |
| AWS credentials | Credential chain / SSO | AWS-hosted OpenSearch |
| Basic auth | Username/password | Self-managed clusters |
| API key | Token-based | Elasticsearch clusters |

GitHub/Google login is for **app-level identity** (sync settings, plugin registry, conversation backup). Cluster auth is separate.

Tokens stored in OS keychain via Electron `safeStorage`.

### 3.7 Data Source Connections

Connect to any OpenSearch or Elasticsearch endpoint:

```
osd connect add \
  --name "prod-opensearch" \
  --url "https://search-prod.us-east-1.es.amazonaws.com" \
  --auth aws-sigv4 \
  --region us-east-1

osd connect add \
  --name "staging-elastic" \
  --url "https://staging.es.eu-west-1.aws.elastic.co:9243" \
  --auth apikey \
  --key "<api-key>"

osd connect list
osd connect test prod-opensearch
```

In the GUI, a data source picker lets users switch between connections. The agent is always aware of the active connection.

### 3.8 SQLite as Local Storage

All local data lives in SQLite — no external database needed:

| Data | Table |
|------|-------|
| Connections | `connections` (encrypted credentials) |
| Conversations | `conversations`, `messages` |
| Workspaces | `workspaces`, `workspace_connections` |
| Saved objects | `saved_objects` (dashboards, visualizations, queries) |
| Plugin state | `plugins` |
| User preferences | `settings` |
| Agent memory | `agent_memory` (per-workspace context) |

```
~/.osd/
├── osd.db              # SQLite database
├── config.yaml         # App configuration
├── mcp/                # MCP server configs
├── skills/             # Installed skills
├── plugins/            # Installed OSD plugins
└── models/             # Local model configs
```

### 3.9 Agent Chat Experience

#### 3.9.1 Agent-First Interface

Chat is the **primary** way to interact. The agent can do everything the GUI can — and more:

```
> Show me the top 10 error codes in the last hour

Querying prod-opensearch... (index: logs-*)

| Error Code | Count | % of Total |
|------------|-------|------------|
| 502        | 1,247 | 34.2%      |
| 500        | 891   | 24.4%      |
| 503        | 456   | 12.5%      |
...

> Create a dashboard for this

✅ Created dashboard "Error Codes — Last Hour"
   → Open in Dashboards view? [Y/n]
```

#### 3.9.2 Model Switching

Users pick any model. Switch anytime. No lock-in.

**Supported providers:**

| Provider | Models | Local/Cloud |
|----------|--------|-------------|
| Ollama | llama3, mistral, codellama, gemma, etc. | Local |
| llama.cpp | Any GGUF model | Local |
| OpenAI | GPT-4o, o3, o4-mini | Cloud |
| Anthropic | Claude Sonnet, Opus | Cloud |
| Amazon Bedrock | Any Bedrock model | Cloud |
| Any OpenAI-compatible API | Custom endpoints | Either |

```bash
osd chat --model ollama:llama3           # Local model
osd chat --model anthropic:claude-sonnet # Cloud model

# In-session switching:
> /model ollama:mistral
Switched to ollama:mistral (local)

> /model bedrock:claude-sonnet
Switched to bedrock:claude-sonnet (cloud, us-east-1)
```

**Model router** (optional): auto-select model by task complexity — fast local model for simple queries, cloud model for complex reasoning.

#### 3.9.3 Agent Tools

| Tool | Description |
|------|-------------|
| `opensearch-query` | Run queries against connected OpenSearch clusters |
| `elasticsearch-query` | Run queries against connected Elasticsearch clusters |
| `index-manage` | Create, delete, reindex, manage aliases |
| `cluster-health` | Cluster stats, shard allocation, node info |
| `viz-generate` | Build visualizations and dashboards |
| `alert-manage` | Create and manage alerting monitors |
| `ingest-pipeline` | Build and test ingest pipelines |
| `local-exec` | Run local scripts/commands (user-approved) |
| `file-read/write` | Read/export local files |
| `plugin-manage` | Install, update, remove plugins |
| `mcp-*` | Any tool exposed by installed MCP servers |

### 3.10 MCP Support (Model Context Protocol)

First-class MCP host. Users install and configure MCP servers to extend agent capabilities:

```bash
# Install MCP servers
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp install @modelcontextprotocol/server-github
osd mcp install ./my-custom-mcp-server

# Configure
osd mcp config server-filesystem --root ~/data

# List installed
osd mcp list

# The agent automatically discovers tools from all running MCP servers
```

**Config file** (`~/.osd/mcp/config.json`):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/home/user/data"]
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

MCP servers run as child processes. The agent sees all MCP tools alongside built-in tools — no distinction from the user's perspective.

### 3.11 Plugin / Skill / CLI / Agent Installation

The app is a platform. Users install what they need:

```bash
# Plugins (OSD plugins — dashboards, visualizations, etc.)
osd plugin install opensearch-security-dashboards
osd plugin install opensearch-anomaly-detection
osd plugin install ./my-custom-plugin.zip
osd plugin list
osd plugin remove <plugin>

# Skills (agent capabilities — prompt templates, tool bundles)
osd skill install opensearch-dba          # DBA skill: index tuning, shard strategy
osd skill install security-analyst        # Security skill: threat hunting queries
osd skill install ./my-skill.yaml
osd skill list

# CLI extensions (additional osd subcommands)
osd cli install osd-benchmark             # Adds `osd benchmark` command
osd cli install osd-migrate               # Adds `osd migrate` command

# Agents (pre-configured agent personas)
osd agent install ops-agent               # Ops-focused agent with cluster tools
osd agent install analyst-agent           # Data analysis focused
osd agent list
osd agent switch ops-agent
```

**Everything is a package.** Plugins, skills, CLI extensions, and agents are all installable, updatable, and removable through a unified package system.

### 3.12 OpenSearch & Elasticsearch Admin

The app is a **unified admin tool** for both OpenSearch and Elasticsearch:

#### OpenSearch Management
- Cluster health, node stats, shard allocation
- Index management (create, delete, reindex, aliases, mappings)
- Security configuration (roles, users, tenants)
- Alerting monitors and destinations
- Anomaly detection jobs
- ISM policies
- Snapshot management
- Ingest pipelines

#### Elasticsearch Management
- Cluster health, node stats
- Index lifecycle management (ILM)
- Index management
- Snapshot/restore
- Ingest pipelines
- Watcher alerts
- Security (native realm, API keys)

#### Admin via Agent Chat
```
> What's the health of my prod cluster?

Cluster: prod-opensearch
Status: 🟢 GREEN
Nodes: 6 (3 data, 2 master, 1 coordinating)
Indices: 142
Shards: 847 (847 primary, 847 replica)
Storage: 2.3 TB used / 8 TB total (28.7%)

⚠️ 2 indices have no replicas: audit-logs-2026.03, temp-reindex
   → Want me to add replicas?

> Switch to staging-elastic and show me ILM policies

Switching to staging-elastic (Elasticsearch 8.17)...

ILM Policies:
| Policy | Indices | Hot → Warm | Warm → Cold | Delete |
|--------|---------|------------|-------------|--------|
| logs   | 47      | 7d         | 30d         | 90d    |
| metrics| 23      | 3d         | 14d         | 60d    |
```

### 3.13 Update Mechanism

Two update paths — users choose their preference:

#### Path 1: Pull Latest Distribution (Default)
```bash
osd update --channel stable       # Download latest stable release
osd update --channel mainline     # Download latest main branch build
osd update --check                # Check without installing
```
The app downloads a pre-built OSD bundle, verifies signatures, and swaps it in. Electron shell updates separately via `electron-updater`.

#### Path 2: Pull Source & Build
```bash
osd update --from-source                    # Pull latest source, build locally
osd update --from-source --branch feature-x # Build from specific branch
osd update --from-source --tag 2.20.0       # Build from release tag
```
For contributors and power users who want to run from source or test patches.

## 4. Open Issues from Original Repo (2022)

The original repo has 12 open issues filed in 2022. All are unresolved — the repo has been dormant since. The 2026 reboot subsumes every one of them. Below is each issue, its original intent, what changed in 4 years, and where it lands in the new plan.

### Issue Tracker

| # | Title | Type | 2022 Intent | 2026 Reboot Status |
|---|-------|------|-------------|-------------------|
| [#3](https://github.com/opensearch-project/dashboards-desktop/issues/3) | Dashboards Desktop MVP | Proposal | Run OSD locally, proxy to remote OS, plugin install, update feeds | **Superseded** — RFC Section 3 covers all MVP items plus agent, MCP, Elastic support |
| [#6](https://github.com/opensearch-project/dashboards-desktop/issues/6) | Run OSD 2.0 inside Electron | POC | Init Electron, bundle OSD 2.0 artifact, child process, plugin install, CI | **Superseded** — M1 rebuilds Electron shell from scratch for OSD 3.x era |
| [#7](https://github.com/opensearch-project/dashboards-desktop/issues/7) | Add initial POC code into repo | Task | Bootstrap the repo with working POC | **Superseded** — full rewrite in M1, TypeScript from day one |
| [#8](https://github.com/opensearch-project/dashboards-desktop/issues/8) | Create an OpenSearch connections manager | Feature | Add/remove/update connections, default connection, switch, multi-window | **Addressed** — RFC §3.7 (Data Source Connector) + §3.4 (Workspaces). Now supports OpenSearch + Elasticsearch, workspace-scoped connections, CLI + GUI |
| [#11](https://github.com/opensearch-project/dashboards-desktop/issues/11) | Allow local proxy to connect to a specific OSD domain | Feature | Local proxy sidecar to forward to remote endpoint | **Redesigned** — no more localhost proxy. Direct client connections via `@opensearch-project/opensearch` and `@elastic/elasticsearch` JS clients. Simpler, no port conflicts |
| [#13](https://github.com/opensearch-project/dashboards-desktop/issues/13) | Setup CI for Dashboards Desktop | Feature | GitHub Actions CI pipeline | **Addressed** — M1 deliverable. Modern CI with lint, type-check, unit tests, Electron build matrix (macOS/Linux/Windows) |
| [#14](https://github.com/opensearch-project/dashboards-desktop/issues/14) | Curl local OSD artifact to run locally | Feature | Download OSD artifact, swap URL when ready | **Addressed** — RFC §3.13 (Update Mechanism). Two paths: pull distribution (stable/mainline channels with signature verification) or pull source & build |
| [#18](https://github.com/opensearch-project/dashboards-desktop/issues/18) | Add unit test support for repository | Task | Test framework setup | **Addressed** — M1 deliverable. Jest + React Testing Library for components, Vitest for core modules |
| [#19](https://github.com/opensearch-project/dashboards-desktop/issues/19) | Convert code to TypeScript | Feature | Migrate JS → TS | **Addressed** — full rewrite is TypeScript from the start. No migration needed |
| [#20](https://github.com/opensearch-project/dashboards-desktop/issues/20) | Update maintainer doc | Doc/Bug | MAINTAINERS.md out of date | **Addressed** — M5 deliverable. New MAINTAINERS.md, CONTRIBUTING.md, and onboarding docs for the rebooted project |
| [#21](https://github.com/opensearch-project/dashboards-desktop/issues/21) | Add linter check and prettier | Enhancement | Code quality tooling | **Addressed** — M1 deliverable. ESLint + Prettier + husky pre-commit hooks, enforced in CI |
| [#25](https://github.com/opensearch-project/dashboards-desktop/issues/25) | Create config file if not present on start | Bug | App crashes for new users with no config | **Addressed** — RFC §3.8 (SQLite Storage). App auto-initializes `~/.osd/osd.db` and `config.yaml` on first launch. No crash, guided onboarding flow |

### What Changed Since 2022

The original issues assumed a 2022 architecture:
- OSD bundled as a child process on localhost:5601
- Local proxy sidecar forwarding localhost:9200 → remote OpenSearch
- Manual config file management
- No AI, no agents, no MCP

The 2026 reboot changes the paradigm:

| 2022 Assumption | 2026 Reality |
|----------------|-------------|
| OSD as child process | OSD as embedded dependency (no separate process) |
| Proxy sidecar to localhost:9200 | Direct client connections to remote clusters |
| Config files in `src/` | SQLite DB + YAML in `~/.osd/` with auto-init |
| Plugin install via CLI shelling out | Built-in plugin manager with registry integration |
| No AI | Agent-first with MCP, model switching, local + cloud models |
| OpenSearch only | OpenSearch + Elasticsearch unified admin |
| No auth | GitHub + Google OAuth for app identity |
| Manual updates | Auto-updater with stable/mainline channels + build-from-source |

### Issue Disposition Plan

All 12 issues should be closed with a comment linking to this RFC once approved:

> Closing as part of the 2026 Desktop Reboot (RFC-2026-DESKTOP-001). This issue is addressed in [section]. See RFC-2026-DESKTOP-AGENT.md for details.

## 5. Milestones

| Phase | Target | Deliverables | Resolves Issues | Status |
|-------|--------|-------------|----------------|--------|
| **M1: Shell & Auth** | Q2 2026 | Electron shell (TypeScript), homepage, workspace manager, GitHub/Google OAuth, SQLite storage, data source connector, CI pipeline, linting, test framework, auto-init config | #3, #6, #7, #8, #13, #18, #19, #21, #25 | 🟡 Planning |
| **M2: Agent Core** | Q3 2026 | Agent runtime, model router, chat panel (GUI + TUI), MCP host, basic OpenSearch tools | — | ⬜ Not started |
| **M3: Admin Tools** | Q3 2026 | OpenSearch admin, Elasticsearch admin, cluster management via chat and GUI, direct client connections (no proxy) | #11 | ⬜ Not started |
| **M4: Extensibility** | Q4 2026 | Plugin manager, skill registry, CLI extensions, agent personas, community registry, OSD artifact download + update | #14 | ⬜ Not started |
| **M5: Polish & Launch** | Q1 2027 | Auto-updater (dist + source), onboarding flow, docs refresh (MAINTAINERS, CONTRIBUTING), public beta | #20 | ⬜ Not started |

## 6. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Electron | Mature, Chromium for OSD rendering, large ecosystem |
| TUI framework | Ink (React for CLI) | Familiar React model, composable |
| Local storage | SQLite (`better-sqlite3`) | Fast, embedded, no external DB |
| Agent protocol | Tool-use (function calling) | Standard across all major LLM APIs |
| MCP support | First-class MCP host | Industry-standard tool extensibility |
| Local models | Ollama integration | Best UX — `ollama pull` then select |
| Auth storage | Electron `safeStorage` | OS-level encryption |
| OSD integration | Bundle as dependency | Avoid fork maintenance |
| Update | `electron-updater` + custom OSD updater | Separate shell and core updates |
| Search engine clients | `@opensearch-project/opensearch` + `@elastic/elasticsearch` | Native clients for both |

## 7. Security Considerations

- OAuth tokens and cluster credentials stored in OS keychain via `safeStorage`
- Local model mode = zero data exfiltration, all inference on-device
- Tool sandboxing — `local-exec` requires explicit user approval
- MCP servers run as sandboxed child processes
- Auto-update bundles are checksum/signature verified
- Electron CSP headers enforced
- No telemetry without explicit opt-in

## 8. Open Questions

1. **Plugin sandboxing** — How to isolate third-party plugins from agent runtime and local filesystem?
2. **Workspace sync** — Should workspaces sync across devices via GitHub/Google identity, or stay local-only?
3. **Multi-version OSD** — Support running OSD 2.x and 3.x side-by-side?
4. **Agent tool approval** — Per-tool approval vs. trust levels vs. always-ask?
5. **Skill format** — YAML-based skill definitions? Or full JS/TS packages?
6. **Registry hosting** — Self-hosted plugin/skill registry, or piggyback on npm/GitHub releases?

## 9. Competitive Landscape

| Product | Local Models | MCP | OpenSearch Admin | Elasticsearch Admin | Plugins | Open Source |
|---------|-------------|-----|-----------------|--------------------|---------|----|
| ChatGPT Desktop | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Claude Desktop | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **OSD Desktop** | **✅** | **✅** | **✅** | **✅** | **✅** | **✅** |

## 10. References

- [OpenSearch Dashboards](https://github.com/opensearch-project/OpenSearch-Dashboards)
- [dashboards-desktop (this repo)](https://github.com/opensearch-project/dashboards-desktop)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Electron](https://www.electronjs.org/docs)
- [Ollama](https://ollama.ai/)
- [Ink](https://github.com/vadimdemedes/ink)

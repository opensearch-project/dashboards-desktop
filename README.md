<img src="https://opensearch.org/assets/brand/SVG/Logo/opensearch_dashboards_logo_darkmode.svg" height="64px"/>

# OpenSearch Dashboards Desktop

An agent-first, local-first desktop application for AI chat and OpenSearch/Elasticsearch cluster management. Open source, extensible, runs any model.

<!-- TODO: Add screenshot of homepage with chat panel open -->
> 📸 *Screenshot placeholder — homepage with workspace cards, connection health, and chat panel*

---

## Why OSD Desktop?

| | ChatGPT Desktop | Claude Desktop | **OSD Desktop** |
|---|---|---|---|
| Local models (Ollama) | ❌ | ❌ | ✅ |
| MCP support | ❌ | ✅ | ✅ |
| OpenSearch admin | ❌ | ❌ | ✅ |
| Elasticsearch admin | ❌ | ❌ | ✅ |
| Plugins & skills | ❌ | ❌ | ✅ |
| Open source | ❌ | ❌ | ✅ |

---

## Features

**🤖 Agent-First Chat**
- Chat with any AI model — Ollama (local), OpenAI, Anthropic, Amazon Bedrock, or any OpenAI-compatible API
- Switch models mid-conversation
- MCP server support for extensible tool use
- Streaming responses with markdown and syntax highlighting

**🔌 Unified Cluster Admin**
- Connect to OpenSearch and Elasticsearch clusters from one app
- Cluster health, index management, security configuration
- Natural language cluster operations via chat
- Multi-cluster context switching

**🏠 Workspaces**
- Group connections, conversations, and settings by environment
- Workspace-scoped agent memory
- Switch context instantly between prod, staging, and dev

**🧩 Extensible Platform**
- Install plugins, skills, agent personas, and CLI extensions
- TypeScript skill packages — testable, type-safe, composable
- Plugin sandboxing for security

**🔒 Local-First & Private**
- All data stored locally in SQLite
- Credentials encrypted via OS keychain
- Run fully offline with local models — zero data exfiltration

---

## Quick Start

### Install

```bash
# Download from GitHub Releases (macOS, Linux, Windows)
# https://github.com/opensearch-project/dashboards-desktop/releases

# Or build from source (requires Node 20)
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
npm ci
npm run build:ts
npx electron-builder --mac    # or --linux or --win
```

> Homebrew cask and apt packages are planned for stable release.

### Launch

```bash
osd              # Desktop GUI
osd chat         # Terminal chat
osd --help       # All commands
```

### Add a Connection

```bash
osd connect add \
  --name "my-cluster" \
  --url "https://localhost:9200" \
  --auth basic \
  --username admin \
  --password admin

osd connect test my-cluster
```

### Chat

```bash
osd chat --model ollama:llama3
> What's the health of my cluster?
```

<!-- TODO: Add terminal recording / gif of chat session -->
> 📸 *Screenshot placeholder — chat session with cluster health response*

---

## Documentation

| Doc | Description |
|-----|-------------|
| **[Getting Started](docs/GETTING-STARTED.md)** | Installation, onboarding, first chat |
| **[Admin Guide](docs/ADMIN-GUIDE.md)** | OpenSearch & Elasticsearch cluster management |
| **[RFC](RFC-2026-DESKTOP-AGENT.md)** | Full technical proposal and architecture |
| **[Roadmap](ROADMAP-2026.md)** | Milestones and delivery plan |
| **[User Stories](docs/)** | Detailed feature specs (M1–M5) |

---

## Architecture

Electron wraps a local OpenSearch Dashboards instance — the real OSD UI, not a reimplementation. The desktop app adds agent chat, auth proxy, and native menus on top.

```
┌──────────────────────────────────────────────────┐
│                 osd (CLI entry)                   │
│          --tui → TUI  │  default → GUI            │
├──────────────────┬───────────────────────────────┤
│  Electron Shell  │  TUI Shell (Ink)              │
│  BrowserWindow   │  Chat + Split Pane            │
│  localhost:5601  │                               │
│  (real OSD UI)   │                               │
│  + Chat Overlay  │                               │
├──────────────────┴───────────────────────────────┤
│               Main Process Layer                  │
│  OSD Lifecycle │ Auth Proxy   │ Multi-Datasource  │
│  Agent Runtime │ Model Router │ MCP Host          │
│  Data Source   │ SQLite Store │ Update Manager    │
├──────────────────────────────────────────────────┤
│  OpenSearch Client  │  Elasticsearch Client       │
└──────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K / Ctrl+K | Open chat |
| Cmd+Shift+Enter | Fullscreen chat |
| Cmd+N / Ctrl+N | New conversation |
| Cmd+M / Ctrl+M | Switch model |
| Escape | Close panel |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR process.

---

## Security

See [CONTRIBUTING.md](CONTRIBUTING.md#security-issue-notifications) for reporting security issues.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](CODE_OF_CONDUCT.md). For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq), or contact [opensource-codeofconduct@amazon.com](mailto:opensource-codeofconduct@amazon.com) with any additional questions or comments.

## License

This project is licensed under the [Apache-2.0 License](LICENSE).

## Copyright

Copyright OpenSearch Contributors. See [NOTICE](NOTICE) for details.

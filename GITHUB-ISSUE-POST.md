Title: [PROPOSAL] 2026 Reboot — Agent-First Desktop App Roadmap

---

## 🚀 2026 Reboot: Agent-First OpenSearch Dashboards Desktop

This proposal reboots the dormant `dashboards-desktop` project as an **agent-first, local-first desktop application** — a privacy-respecting alternative to cloud AI chat tools (ChatGPT, Claude Desktop) that doubles as a unified OpenSearch and Elasticsearch admin tool.

**Full RFC:** [RFC-2026-DESKTOP-AGENT.md](https://github.com/opensearch-project/dashboards-desktop/blob/main/RFC-2026-DESKTOP-AGENT.md)

### Why Now?

The AI agent landscape has shifted the balance back to desktop and CLI. Users want:
- **Local tools** — file system, scripts, databases, CLIs
- **MCP servers** — extend agent capabilities with Model Context Protocol
- **Local models** — Ollama, llama.cpp — zero data leaving the machine
- **Any model** — switch between local and cloud models mid-conversation
- **Plugin ecosystem** — install any OSD plugin, skill, or agent

Browser-based dashboards can't do any of this. Desktop can.

### What's Changing

| 2022 (Original) | 2026 (Reboot) |
|-----------------|---------------|
| OSD as child process on localhost | Native Electron UI + direct client connections |
| Proxy sidecar to localhost:9200 | Direct `@opensearch-project/opensearch` + `@elastic/elasticsearch` clients |
| Config files in `src/` | SQLite DB + YAML in `~/.osd/` with auto-init |
| No AI | Agent-first with MCP, model switching, local + cloud models |
| OpenSearch only | OpenSearch + Elasticsearch unified admin |
| No auth | GitHub + Google OAuth for app identity |
| Manual updates | Auto-updater with stable/beta/nightly channels |
| JavaScript | TypeScript from day one |

### Open Issues Addressed

This reboot subsumes all 12 open issues:

| Issue | Status in 2026 Plan |
|-------|-------------------|
| #3 MVP Proposal | Superseded by full RFC |
| #6 Run OSD in Electron | M1 — rebuilt from scratch |
| #7 Initial POC code | M1 — full TypeScript rewrite |
| #8 Connection manager | M1 — Data Source Connector + Workspaces (now supports Elastic too) |
| #11 Local proxy | M3 — eliminated proxy, direct client connections |
| #13 Setup CI | M1 — modern CI with build matrix, code signing |
| #14 Curl OSD artifact | M4 — auto-updater with channels + signature verification |
| #18 Unit tests | M1 — Vitest + React Testing Library + Playwright |
| #19 Convert to TypeScript | M1 — TypeScript from day one |
| #20 Update maintainer doc | M5 — full docs refresh |
| #21 Linter + prettier | M1 — ESLint + Prettier + husky |
| #25 Config file crash | M1 — SQLite auto-init + guided onboarding |

---

## Milestones

### 🏗️ M1: Foundation

The minimum to ship a usable desktop app.

- TypeScript rewrite from scratch (delete all 2022 JS code)
- Electron shell with `contextIsolation` + IPC bridge
- SQLite storage with auto-init (`~/.osd/osd.db`) in worker thread
- Homepage with workspace switcher, connection health, recent items
- First-run onboarding wizard
- Connection manager — add/edit/delete/test (OpenSearch + Elasticsearch)
- Auth: basic auth, API key, AWS SigV4/SSO
- Credential storage via Electron `safeStorage`
- Chat panel layout (resizable side panel, Cmd+K, full-screen mode)
- CI/CD: ESLint, Prettier, Vitest, Playwright, GitHub Actions build matrix
- Code signing: Apple notarization + Windows EV cert
- WCAG 2.1 AA accessibility from day one

### 🤖 M2: Agent Core

The AI brain — chat becomes functional.

- Agent runtime with tool registration and discovery
- Streaming responses with markdown rendering
- Model switching: Ollama (local), OpenAI, Anthropic, Bedrock, any OpenAI-compatible API
- First-class MCP host with process supervisor
- Basic OpenSearch tools: query, cluster health, index management
- `osd chat --model` CLI for quick chat
- Fixture-based agent testing (recorded model responses)

### 🔧 M3: Admin Tools

Unified OpenSearch + Elasticsearch management.

- OpenSearch admin: cluster health, index management, security, alerting, ISM, snapshots
- Elasticsearch admin: cluster health, ILM, Watcher, security
- Natural language cluster operations via chat
- GitHub + Google OAuth (PKCE) for app-level identity

### 🧩 M4: Extensibility

The platform — users install what they need.

- Plugin manager with sandboxing (`worker_threads`)
- TypeScript skill packages + pre-configured agent personas
- CLI extensions (`osd benchmark`, `osd migrate`, etc.)
- Auto-updater: stable/beta/nightly channels, rollback support
- `osd doctor` self-diagnostics
- Homebrew cask + apt distribution

### 🚀 M5: Polish & Launch

Ship it.

- TUI mode (`osd chat` readline CLI + full Ink TUI)
- Advanced chat: conversation branching, message pinning, model auto-routing
- Updated docs (MAINTAINERS, CONTRIBUTING, getting-started)
- Opt-in crash reporting and telemetry
- Public beta

---

## Key Architecture Decisions

| Decision | Resolution |
|----------|-----------|
| OSD integration | Native Electron UI for M1-M3, defer OSD embedding to M4+ |
| SQLite threading | Worker thread, not main process |
| Skill format | TypeScript packages, not YAML |
| Plugin sandboxing | `worker_threads` or `child_process` |
| Test framework | Vitest + React Testing Library + Playwright |
| Agent testing | Fixture-based with recorded model responses |
| Release channels | Three: stable, beta, nightly |
| Code signing | Required for M1 |
| Accessibility | WCAG 2.1 AA from M1 |

---

## Competitive Landscape

| Product | Local Models | MCP | OpenSearch Admin | Elasticsearch Admin | Plugins | Open Source |
|---------|-------------|-----|-----------------|--------------------|---------|----|
| ChatGPT Desktop | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Claude Desktop | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **OSD Desktop** | **✅** | **✅** | **✅** | **✅** | **✅** | **✅** |

---

## Open Questions

1. OSD bundle format — Tarball vs npm package vs git submodule?
2. Workspace sync — Sync across devices via identity, or local-only?
3. Multi-version OSD — Support 2.x and 3.x side-by-side?
4. Registry hosting — Self-hosted plugin/skill registry, or npm/GitHub releases?
5. MCP resource limits — How strict?

---

**We'd love community feedback.** What features matter most to you? What's missing? Comment below or open new issues for specific feature requests.

cc @seraphjiang @johnnyon-amzn

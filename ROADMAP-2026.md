# OpenSearch Dashboards Desktop — 2026 Roadmap & Proposal

> Consolidated from RFC-2026-DESKTOP-001 + team review feedback (sde, fee, devops, test)
> Date: 2026-04-19

---

## Vision

Reboot `dashboards-desktop` as an **agent-first, local-first desktop application** — a privacy-respecting alternative to cloud AI chat tools that doubles as a unified OpenSearch and Elasticsearch admin tool. Open source, extensible, runs any model.

---

## Must-Have Features (Consolidated from Team Review)

### 🏗️ Milestone 1: Foundation

The minimum to ship a usable desktop app.

**Project Directory Structure (agreed layout — all code lives here from M1)**
```
src/
  main/        — Electron main process (TypeScript)
  preload/     — Preload scripts (context bridge)
  renderer/    — React UI (TypeScript + React)
  core/        — Shared business logic (connection, storage)
  tui/         — Ink TUI (M5, empty placeholder for now)
```

**Core Shell**
- [ ] TypeScript rewrite from scratch (delete all 2022 JS code)
- [ ] Electron shell with `contextIsolation` + IPC bridge
- [ ] SQLite storage with auto-init (`~/.osd/osd.db`) — connections, workspaces, settings tables
- [ ] SQLite in worker thread (not main process — prevents UI freezes)
- [ ] WAL mode enabled for concurrent read/write
- [ ] Schema migration system (v1 → v2 → vN upgrade path)

**Homepage & Workspaces**
- [ ] Homepage as launch screen — workspace switcher, connection health, recent items
- [ ] Workspace CRUD — create, switch, delete, each with own connections
- [ ] First-run onboarding wizard: pick model → add connection (or skip) → create workspace → guided prompt suggestions
- [ ] Error & empty states for all views (0 connections, 0 conversations, offline cluster)

**Data Source Connections**
- [ ] Connection manager — add/edit/delete/test connections
- [ ] Auth: basic auth, API key, AWS SigV4/SSO
- [ ] Credential storage via Electron `safeStorage` (OS keychain)
- [ ] All cluster communication via main process IPC (Node-only JS clients)
- [ ] Test-before-save on connections
- [ ] Connection error states with troubleshoot actions
- [ ] Both `@opensearch-project/opensearch` and `@elastic/elasticsearch` clients

**Chat Panel Shell (UI only, no agent runtime)**
> ⚠️ M1 chat panel is a **non-functional UI shell** — layout, chrome, and keyboard shortcuts only. Agent runtime, model integration, and message handling ship in M2.
- [ ] Resizable right side panel (~40% width default)
- [ ] Cmd+K / Ctrl+K to open/focus chat from anywhere
- [ ] Cmd+Shift+Enter / Ctrl+Shift+Enter for full-screen chat mode
- [ ] Conversation history sidebar (searchable, workspace-scoped)
- [ ] Static placeholder state ("Connect a model to start chatting" empty state)

**CI/CD**
- [ ] ESLint + Prettier + tsconfig.json + husky pre-commit hooks
- [ ] Test framework: Vitest (unit/core), React Testing Library (components), Playwright (E2E)
- [ ] PR pipeline: lint → typecheck → test → build (Linux x64 only)
- [ ] Release pipeline: full matrix build → sign → notarize → publish
- [ ] GitHub Actions build matrix: macOS (x64+arm64), Linux (x64+arm64), Windows (x64+arm64)
- [ ] Code signing: Apple Developer ID + notarization, Windows EV cert, Linux GPG
- [ ] Native module rebuild handling (`electron-rebuild` for better-sqlite3)
- [ ] Tests required for every PR, coverage threshold enforced

**Accessibility**
- [ ] WCAG 2.1 AA compliance target
- [ ] Keyboard navigation, focus management, screen reader support
- [ ] Minimum window size handling, panel collapse behavior

**Theming**
- [ ] System-preference theme detection (light/dark follows OS setting)
- [ ] CSS custom properties for all color tokens from day one (no hardcoded colors)
- [ ] Manual override: system / light / dark in settings

---

### 🤖 Milestone 2: Agent Core

The AI brain — chat becomes functional.

**Agent Runtime**
- [ ] Tool registration and discovery mechanism
- [ ] Tool execution sandboxing model
- [ ] Streaming response transport (token-by-token rendering with markdown + syntax highlighting)
- [ ] Inline tool execution feedback ("Running query on prod-opensearch..." with spinner)
- [ ] Per-workspace conversation context and memory management
- [ ] Conversation storage in SQLite

**Model Switching**
- [ ] Model selector in chat header (dropdown pill)
- [ ] Support: Ollama (local), OpenAI, Anthropic, Amazon Bedrock, any OpenAI-compatible API
- [ ] `/model` command for in-session switching
- [ ] `osd chat --model` CLI for quick chat mode

**MCP Host**
- [ ] First-class MCP host — install, configure, run MCP servers
- [ ] MCP server process supervisor: health checks, auto-restart with backoff, resource limits
- [ ] Orphan process cleanup on app exit (SIGTERM → SIGKILL after timeout)
- [ ] Agent discovers MCP tools alongside built-in tools
- [ ] Ship test MCP server (echo/math) in repo for CI
- [ ] `osd mcp install/config/list` CLI commands

**Basic OpenSearch Tools**
- [ ] `opensearch-query` — run queries against connected clusters
- [ ] `cluster-health` — cluster stats, shard allocation, node info
- [ ] `index-manage` — create, delete, reindex, manage aliases

**Testing**
- [ ] Agent fixture-based testing (recorded model responses, never live API in CI)
- [ ] Tool dispatch unit tests
- [ ] MCP lifecycle integration tests
- [ ] Playwright E2E: launch → homepage → chat → send message → response renders
- [ ] Mock HTTP servers (nock/msw) for data source tests

---

### 🔧 Milestone 3: Admin Tools

Unified OpenSearch + Elasticsearch management.

**OpenSearch Admin**
- [ ] Cluster health, node stats, shard allocation
- [ ] Index management (create, delete, reindex, aliases, mappings)
- [ ] Security configuration (roles, users, tenants)
- [ ] Alerting monitors and destinations
- [ ] ISM policies, snapshot management, ingest pipelines

**Elasticsearch Admin**
- [ ] Cluster health, node stats
- [ ] Index lifecycle management (ILM)
- [ ] Index management, snapshot/restore
- [ ] Ingest pipelines, Watcher alerts
- [ ] Security (native realm, API keys)

**Admin via Chat**
- [ ] Agent tools: `elasticsearch-query`, `alert-manage`, `ingest-pipeline`
- [ ] Natural language cluster operations
- [ ] Cross-cluster context switching

**Auth Expansion**
- [ ] GitHub OAuth (PKCE) for app-level identity
- [ ] Google OAuth (PKCE) for enterprise users
- [ ] OAuth token storage in OS keychain

---

### 🧩 Milestone 4: Extensibility

The platform — users install what they need.

**Plugin Manager**
- [ ] Install/update/remove OSD plugins
- [ ] Plugin sandboxing via `worker_threads` or `child_process` (never in main process)
- [ ] Visual plugin browser (app-store style with cards, ratings, one-click install)

**Skill & Agent System**
- [ ] Skill packages (TypeScript, not YAML — testable, type-safe, composable)
- [ ] Pre-configured agent personas (ops-agent, analyst-agent, etc.)
- [ ] `osd skill/agent install/list/switch` CLI commands

**CLI Extensions**
- [ ] Installable subcommands (`osd benchmark`, `osd migrate`, etc.)
- [ ] Unified package system for plugins, skills, CLI extensions, agents

**Update Manager**
- [ ] Pull latest distribution (stable/mainline/beta channels)
- [ ] electron-updater for shell updates with built-in signing
- [ ] GPG detached signatures for OSD bundle updates
- [ ] Semver contract: shell declares compatible OSD version range
- [ ] Rollback: keep previous version, detect crash-on-launch, offer revert
- [ ] Pull source & build (contributor mode only — not presented as equal alternative)

**Distribution Expansion**
- [ ] Homebrew cask
- [ ] apt repository (.deb)

**Self-Diagnostics**
- [ ] `osd doctor` CLI — checks all subsystems (SQLite, MCP, connections, models, OAuth)
- [ ] Startup self-check with user-visible status
- [ ] Background health monitor for MCP servers and cluster connections

---

### 🚀 Milestone 5: Polish & Launch

Ship it.

**Onboarding & Docs**
- [ ] Updated MAINTAINERS.md, CONTRIBUTING.md
- [ ] User documentation and getting-started guide
- [ ] Public beta announcement

**Advanced Chat**
- [ ] Conversation branching (fork from any message)
- [ ] Message pinning/bookmarking
- [ ] Command palette model switcher (Cmd+M)
- [ ] Model auto-routing (local for simple, cloud for complex)

**TUI Mode**
- [ ] `osd chat` readline-based CLI
- [ ] Full Ink-based TUI (if demand warrants)

**Operational**
- [ ] Opt-in crash reporting (Electron `crashReporter`)
- [ ] Opt-in telemetry pipeline
- [ ] Differential updates (NSIS delta on Windows)
- [ ] Evaluate snap/flatpak (note: sandboxing conflicts with MCP filesystem access)

---

## Key Architecture Decisions (from Team Review)

| Decision | Resolution | Source |
|----------|-----------|--------|
| OSD integration | **Native Electron UI for M1-M3**, defer OSD embedding to M4+ | sde |
| SQLite threading | **Worker thread**, not main process | sde, devops |
| TUI priority | **Defer full TUI to M5**, ship readline CLI in M2 | sde, fee |
| OAuth timing | **Defer to M3**, M1 ships with cluster auth only | sde |
| Skill format | **TypeScript packages**, not YAML | sde |
| Plugin sandboxing | **worker_threads or child_process** | sde |
| Source build path | **Contributor mode only**, not equal alternative | devops |
| Build tool | **Evaluate electron-forge** over electron-builder | devops |
| Code signing | **Required for M1** — Apple notarization + Windows EV cert | devops |
| Test framework | **Vitest + RTL + Playwright** | test |
| Agent testing | **Fixture-based** with recorded model responses | test |
| Release channels | **Three: stable, beta, nightly** | devops |
| OSD bundle format | **Tarball of pre-built assets**, updatable sidecar outside asar | devops |
| Accessibility | **WCAG 2.1 AA** from M1 | fee |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OSD-as-dependency is not viable (it's a full Kibana fork, not an npm lib) | High | High | Build native UI first, add OSD integration later |
| better-sqlite3 native module breaks on Electron upgrades | Medium | Medium | electron-rebuild in CI, test on all platforms |
| M1 scope creep (9 issues mapped to M1) | High | Medium | Cut ruthlessly: TS shell + SQLite + connections + homepage + CI |
| Agent runtime design gaps (tool registry, streaming, sandboxing) | Medium | High | Design doc before M2 implementation |
| Cross-platform native module issues (ARM64 especially) | Medium | Medium | CI matrix from day one, pre-built binaries |
| MCP server orphan processes on crash | Medium | Low | Process supervisor with cleanup on exit |
| Dual update path support burden | Medium | Medium | Source build = contributor-only, not user-facing |

---

## Open Questions (Remaining)

1. **OSD bundle format** — Tarball vs npm package vs git submodule? (devops recommends tarball)
2. **Workspace sync** — Sync across devices via identity, or local-only?
3. **Multi-version OSD** — Support 2.x and 3.x side-by-side?
4. **Registry hosting** — Self-hosted plugin/skill registry, or npm/GitHub releases?
5. **MCP resource limits** — cgroups on Linux, Job Objects on Windows — how strict?
6. **OAuth testing in CI** — Mock OAuth provider or token fixture injection?

---

## RFC Sections to Add (from Team Feedback)

- [ ] §3.4.1 — First Run Experience (onboarding wizard) — fee
- [ ] §3.9.0 — Chat Panel Layout specification — fee
- [ ] §7.1 — Accessibility (WCAG 2.1 AA target) — fee
- [ ] §7.2 — CI/CD Pipeline specification (build matrix, signing, release) — devops
- [ ] §7.3 — Testing Strategy (framework, pyramid, fixtures, coverage targets) — test
- [ ] §3.1 — Add "Error & Empty States" as core design principle — fee

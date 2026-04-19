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
- [x] TypeScript rewrite from scratch (delete all 2022 JS code)
- [x] Electron shell with `contextIsolation` + IPC bridge
- [x] SQLite storage with auto-init (`~/.osd/osd.db`) — connections, workspaces, settings tables
- [x] SQLite in worker thread (not main process — prevents UI freezes)
- [x] WAL mode enabled for concurrent read/write
- [x] Schema migration system (v1 → v2 → vN upgrade path)

**Homepage & Workspaces**
- [x] Homepage as launch screen — workspace switcher, connection health, recent items
- [x] Workspace CRUD — create, switch, delete, each with own connections
- [x] First-run onboarding wizard: pick model → add connection (or skip) → create workspace → guided prompt suggestions
- [x] Error & empty states for all views (0 connections, 0 conversations, offline cluster)

**Data Source Connections**
- [x] Connection manager — add/edit/delete/test connections
- [x] Auth: basic auth, API key, AWS SigV4/SSO
- [x] Credential storage via Electron `safeStorage` (OS keychain)
- [x] All cluster communication via main process IPC (Node-only JS clients)
- [x] Test-before-save on connections
- [x] Connection error states with troubleshoot actions
- [x] Both `@opensearch-project/opensearch` and `@elastic/elasticsearch` clients

**Chat Panel Shell (UI only, no agent runtime)**
> ⚠️ M1 chat panel is a **non-functional UI shell** — layout, chrome, and keyboard shortcuts only. Agent runtime, model integration, and message handling ship in M2.
- [x] Resizable right side panel (~40% width default)
- [x] Cmd+K / Ctrl+K to open/focus chat from anywhere
- [x] Cmd+Shift+Enter / Ctrl+Shift+Enter for full-screen chat mode
- [x] Conversation history sidebar (searchable, workspace-scoped)
- [x] Static placeholder state ("Connect a model to start chatting" empty state)

**CI/CD**
- [x] ESLint + Prettier + tsconfig.json + husky pre-commit hooks
- [x] Test framework: Vitest (unit/core), React Testing Library (components), Playwright (E2E)
- [x] PR pipeline: lint → typecheck → test → build (Linux x64 only)
- [x] Release pipeline: full matrix build → sign → notarize → publish
- [x] GitHub Actions build matrix: macOS (x64+arm64), Linux (x64+arm64), Windows (x64+arm64)
- [x] Code signing: Apple Developer ID + notarization, Windows EV cert, Linux GPG
- [x] Native module rebuild handling (`electron-rebuild` for better-sqlite3)
- [x] Tests required for every PR, coverage threshold enforced

**Accessibility**
- [x] WCAG 2.1 AA compliance target
- [x] Keyboard navigation, focus management, screen reader support
- [x] Minimum window size handling, panel collapse behavior

**Theming**
- [x] System-preference theme detection (light/dark follows OS setting)
- [x] CSS custom properties for all color tokens from day one (no hardcoded colors)
- [x] Manual override: system / light / dark in settings

---

### 🤖 Milestone 2: Agent Core

The AI brain — chat becomes functional.

**Agent Runtime**
- [x] Tool registration and discovery mechanism
- [x] Tool execution sandboxing model
- [x] Streaming response transport (token-by-token rendering with markdown + syntax highlighting)
- [x] Inline tool execution feedback ("Running query on prod-opensearch..." with spinner)
- [x] Per-workspace conversation context and memory management
- [x] Conversation storage in SQLite

**Model Switching**
- [x] Model selector in chat header (dropdown pill)
- [x] Support: Ollama (local), OpenAI, Anthropic, Amazon Bedrock, any OpenAI-compatible API
- [x] `/model` command for in-session switching
- [x] `osd chat --model` CLI for quick chat mode

**MCP Host**
- [x] First-class MCP host — install, configure, run MCP servers
- [x] MCP server process supervisor: health checks, auto-restart with backoff, resource limits
- [x] Orphan process cleanup on app exit (SIGTERM → SIGKILL after timeout)
- [x] Agent discovers MCP tools alongside built-in tools
- [x] Ship test MCP server (echo/math) in repo for CI
- [x] `osd mcp install/config/list` CLI commands

**Basic OpenSearch Tools**
- [x] `opensearch-query` — run queries against connected clusters
- [x] `cluster-health` — cluster stats, shard allocation, node info
- [x] `index-manage` — create, delete, reindex, manage aliases

**Testing**
- [x] Agent fixture-based testing (recorded model responses, never live API in CI)
- [x] Tool dispatch unit tests
- [x] MCP lifecycle integration tests
- [x] Playwright E2E: launch → homepage → chat → send message → response renders
- [x] Mock HTTP servers (nock/msw) for data source tests

---

### 🔧 Milestone 3: Admin Tools

Unified OpenSearch + Elasticsearch management.

**OpenSearch Admin**
- [x] Cluster health, node stats, shard allocation
- [x] Index management (create, delete, reindex, aliases, mappings)
- [x] Security configuration (roles, users, tenants)
- [x] Alerting monitors and destinations
- [x] ISM policies, snapshot management, ingest pipelines

**Elasticsearch Admin**
- [x] Cluster health, node stats
- [x] Index lifecycle management (ILM)
- [x] Index management, snapshot/restore
- [x] Ingest pipelines, Watcher alerts
- [x] Security (native realm, API keys)

**Admin via Chat**
- [x] Agent tools: `elasticsearch-query`, `alert-manage`, `ingest-pipeline`
- [x] Natural language cluster operations
- [x] Cross-cluster context switching

**Auth Expansion**
- [x] GitHub OAuth (PKCE) for app-level identity
- [x] Google OAuth (PKCE) for enterprise users
- [x] OAuth token storage in OS keychain

---

### 🧩 Milestone 4: Extensibility

The platform — users install what they need.

**Plugin Manager**
- [x] Install/update/remove OSD plugins
- [x] Plugin sandboxing via `worker_threads` or `child_process` (never in main process)
- [x] Visual plugin browser (app-store style with cards, ratings, one-click install)

**Skill & Agent System**
- [x] Skill packages (TypeScript, not YAML — testable, type-safe, composable)
- [x] Pre-configured agent personas (ops-agent, analyst-agent, etc.)
- [x] `osd skill/agent install/list/switch` CLI commands

**CLI Extensions**
- [x] Installable subcommands (`osd benchmark`, `osd migrate`, etc.)
- [x] Unified package system for plugins, skills, CLI extensions, agents

**Update Manager**
- [x] Pull latest distribution (stable/mainline/beta channels)
- [x] electron-updater for shell updates with built-in signing
- [x] GPG detached signatures for OSD bundle updates
- [x] Semver contract: shell declares compatible OSD version range
- [x] Rollback: keep previous version, detect crash-on-launch, offer revert
- [x] Pull source & build (contributor mode only — not presented as equal alternative)

**Distribution Expansion**
- [x] Homebrew cask
- [x] apt repository (.deb)

**Self-Diagnostics**
- [x] `osd doctor` CLI — checks all subsystems (SQLite, MCP, connections, models, OAuth)
- [x] Startup self-check with user-visible status
- [x] Background health monitor for MCP servers and cluster connections

---

### 🚀 Milestone 5: Polish & Launch

Ship it.

**Onboarding & Docs**
- [x] Updated MAINTAINERS.md, CONTRIBUTING.md
- [x] User documentation and getting-started guide
- [x] Public beta announcement

**Advanced Chat**
- [x] Conversation branching (fork from any message)
- [x] Message pinning/bookmarking
- [x] Command palette model switcher (Cmd+M)
- [x] Model auto-routing (local for simple, cloud for complex)

**TUI Mode**
- [x] `osd chat` readline-based CLI
- [x] Full Ink-based TUI (if demand warrants)

**Operational**
- [x] Opt-in crash reporting (Electron `crashReporter`)
- [x] Opt-in telemetry pipeline
- [x] Differential updates (NSIS delta on Windows)
- [x] Evaluate snap/flatpak (note: sandboxing conflicts with MCP filesystem access)

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

- [x] §3.4.1 — First Run Experience (onboarding wizard) — fee
- [x] §3.9.0 — Chat Panel Layout specification — fee
- [x] §7.1 — Accessibility (WCAG 2.1 AA target) — fee
- [x] §7.2 — CI/CD Pipeline specification (build matrix, signing, release) — devops
- [x] §7.3 — Testing Strategy (framework, pyramid, fixtures, coverage targets) — test
- [x] §3.1 — Add "Error & Empty States" as core design principle — fee

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.1.0-beta] — 2026-04-19

Complete rewrite of dashboards-desktop as an agent-first, local-first desktop application.

### Added

**M1: Foundation**
- TypeScript rewrite from scratch — replaces all 2022 JavaScript code
- Electron shell with `contextIsolation`, IPC bridge, and preload scripts
- SQLite storage in worker thread with WAL mode, auto-init (`~/.osd/osd.db`)
- Schema migration system (v1–v3: connections, workspaces, settings, conversations, messages)
- Connection manager — add, edit, delete, test with both OpenSearch and Elasticsearch clients
- Auth: Basic Auth, API Key, AWS SigV4/SSO
- Credential encryption via Electron `safeStorage` (OS keychain)
- Homepage with workspace switcher, connection health indicators, recent items
- Workspace CRUD — create, switch, delete, each with own connections
- Chat panel shell with resizable side panel, Cmd+K, fullscreen toggle
- First-run onboarding wizard (model → connection → workspace)
- ESLint + Prettier + TypeScript strict mode + husky pre-commit hooks
- Vitest (unit), React Testing Library (components), Playwright (E2E)
- GitHub Actions CI: lint → typecheck → test → build (7 parallel jobs)
- Release pipeline: 6-target build matrix with code signing

**M2: Agent Core**
- Agent runtime with streaming responses (token-by-token rendering)
- 5 model providers: Ollama, OpenAI, Anthropic, Amazon Bedrock, OpenAI-compatible
- Model switching mid-conversation (GUI dropdown + `/model` command)
- Tool registry with 6 built-in tools: opensearch-query, elasticsearch-query, cluster-health, index-manage, admin-opensearch, admin-elasticsearch
- MCP host — install, configure, run MCP servers as supervised child processes
- MCP tool discovery — agent sees MCP tools alongside built-in tools
- `osd chat --model` readline CLI for terminal chat
- Fixture-based agent testing (recorded model responses, never live API in CI)

**M3: Admin Tools**
- OpenSearch admin: cluster health, index management, security config, alerting, ISM, snapshots, ingest pipelines
- Elasticsearch admin: ILM, Watcher, snapshots, ingest pipelines, native realm security
- Cross-cluster context switching (GUI + chat)
- GitHub OAuth (PKCE) and Google OAuth (PKCE) for app-level identity
- Admin pages: ClusterPage, IndicesPage, SecurityPage

**M4: Extensibility**
- Plugin manager with sandboxing (`worker_threads`)
- Plugin registry and visual browser
- Skill loader and agent personas (TypeScript packages)
- 7 CLI commands: chat, doctor, mcp, plugins, skills, agents, update
- Update manager with stable/beta/nightly channels
- Rollback system — detect crash-on-launch, restore previous version
- `osd doctor` — checks SQLite, MCP, connections, models, OAuth
- Packaging: Homebrew cask, Debian control, macOS entitlements

**M5: Polish (partial)**
- Conversation branching (fork from any message)
- Message pinning/bookmarking
- Model auto-routing (local for simple, cloud for complex)
- Command palette (Cmd+M)
- WCAG 2.1 AA accessibility (206 aria attributes, keyboard nav, screen reader support)
- System-preference theming (light/dark/auto)
- Error boundary component

**Documentation**
- RFC-2026-DESKTOP-AGENT.md — full technical proposal
- ROADMAP-2026.md — milestones and delivery plan
- 29 user stories across M1–M5 with Given/When/Then acceptance criteria
- Getting Started guide, Admin Guide, Cloud Testing guide
- CLI Reference, Usage guide

**CI/CD**
- PR pipeline: lint → typecheck → test-unit → test-renderer → test-integration → native-module-smoke → build
- Release pipeline: 6-target matrix (macOS/Linux/Windows × x64/arm64) with code signing
- 23 test suites, 177 tests

### Removed
- All 2022 JavaScript code (`main.js`, `preload.js`, `renderer.js`, `index.html`, `css/`)
- Bootstrap CSS dependency

### Changed
- `package.json` rewritten for TypeScript + modern toolchain
- README, CONTRIBUTING, MAINTAINERS rewritten for 2026 reboot

---

## [0.0.1] — 2022-11-15

### Added
- Initial Electron proof-of-concept
- Basic AWS credential configuration form
- Bootstrap CSS layout

[Unreleased]: https://github.com/opensearch-project/dashboards-desktop/compare/v0.1.0-beta...HEAD
[0.1.0-beta]: https://github.com/opensearch-project/dashboards-desktop/compare/v0.0.1...v0.1.0-beta
[0.0.1]: https://github.com/opensearch-project/dashboards-desktop/releases/tag/v0.0.1

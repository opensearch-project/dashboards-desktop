# Release Notes — OSD Desktop v0.1.0-beta

> **Date:** 2026-04-19
> **Channel:** beta
> **Milestone:** M1–M4

---

## Highlights

Complete rewrite of dashboards-desktop as an **agent-first, local-first desktop application**. This beta delivers a working Electron app with AI chat (5 model providers), unified OpenSearch + Elasticsearch admin, MCP support, plugin/skill extensibility, and a full CLI — all built from scratch in TypeScript with 177 passing tests.

---

## What's New

### M1: Foundation
- **Electron shell** — TypeScript, `contextIsolation`, IPC bridge, preload scripts
- **SQLite storage** — worker thread, WAL mode, auto-init `~/.osd/osd.db`, schema migrations
- **Connection manager** — add/edit/delete/test, OpenSearch + Elasticsearch, Basic Auth / API Key / AWS SigV4
- **Credential encryption** — OS keychain via Electron `safeStorage`
- **Homepage** — workspace switcher, connection health indicators, recent items
- **Onboarding wizard** — model → connection → workspace, first-run flow
- **Chat panel shell** — resizable side panel, Cmd+K, fullscreen toggle
- **CI/CD** — ESLint, Prettier, husky, Vitest, Playwright, GitHub Actions (7-job PR pipeline, 6-target release matrix)

### M2: Agent Core
- **Agent runtime** — streaming responses with markdown + syntax highlighting
- **5 model providers** — Ollama (local), OpenAI, Anthropic, Amazon Bedrock, any OpenAI-compatible API
- **Model switching** — GUI dropdown, `/model` command, `osd chat --model` CLI
- **Tool registry** — 6 built-in tools (opensearch-query, elasticsearch-query, cluster-health, index-manage, admin-opensearch, admin-elasticsearch)
- **MCP host** — install, configure, run MCP servers with process supervisor and auto-restart
- **CLI chat** — `osd chat` readline-based terminal chat

### M3: Admin Tools
- **OpenSearch admin** — cluster health, indices, security (roles/users/tenants), alerting, ISM, snapshots, ingest
- **Elasticsearch admin** — ILM, Watcher, snapshots, ingest, native realm security
- **Cross-cluster switching** — GUI connection selector + chat command
- **OAuth** — GitHub and Google PKCE flows for app-level identity

### M4: Extensibility
- **Plugin manager** — install/remove with `worker_threads` sandboxing, visual browser
- **Skills & agent personas** — TypeScript packages, `osd skill/agent install/list/switch`
- **7 CLI commands** — chat, doctor, mcp, plugins, skills, agents, update
- **Update manager** — stable/beta/nightly channels, signature verification, rollback on crash
- **`osd doctor`** — checks SQLite, MCP, connections, models, OAuth with actionable fixes
- **Packaging** — Homebrew cask formula, Debian control, macOS entitlements

### Polish
- **Accessibility** — WCAG 2.1 AA, 206 aria attributes, keyboard navigation, screen reader support
- **Theming** — system-preference light/dark/auto
- **Conversation branching** — fork from any message
- **Message pinning** — pin/unpin, filtered view
- **Model auto-routing** — local for simple queries, cloud for complex reasoning
- **Command palette** — Cmd+M model switcher

---

## Known Issues

- 18 cosmetic lint warnings (unused variables) — no functional impact
- Homebrew cask and apt repository not yet published — install from GitHub Releases or build from source
- E2E tests scaffolded but not yet wired into PR pipeline
- Code signing requires Apple Developer ID and Windows EV cert (unsigned builds work with manual trust)

---

## Upgrade Notes

This is the first beta release of the 2026 reboot. There is no upgrade path from the 2022 proof-of-concept — this is a complete rewrite.

---

## Downloads

| Platform | Architecture | File |
|----------|-------------|------|
| macOS | Apple Silicon (arm64) | `OpenSearch-Dashboards-Desktop-0.1.0-beta-mac-arm64.dmg` |
| macOS | Intel (x64) | `OpenSearch-Dashboards-Desktop-0.1.0-beta-mac-x64.dmg` |
| Linux | x64 | `OpenSearch-Dashboards-Desktop-0.1.0-beta-linux-x64.AppImage` |
| Linux | arm64 | `OpenSearch-Dashboards-Desktop-0.1.0-beta-linux-arm64.AppImage` |
| Windows | x64 | `OpenSearch-Dashboards-Desktop-0.1.0-beta-win-x64.exe` |
| Windows | arm64 | `OpenSearch-Dashboards-Desktop-0.1.0-beta-win-arm64.exe` |

### Build from Source

```bash
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
git checkout v0.1.0-beta
npm ci
npm run build:ts
npx electron-builder --mac    # or --linux or --win
```

See [Cloud Testing Guide](docs/CLOUD-TESTING.md) for testing on AWS EC2 instances.

---

## Stats

- 96 source files, 9,788 lines TypeScript
- 23 test suites, 177 tests, 0 failures
- 14 documentation files, 3,800+ lines
- 5 code reviews, 65+ findings, all resolved
- 6-target build matrix (macOS/Linux/Windows × x64/arm64)

---

## Full Changelog

[v0.0.1...v0.1.0-beta](https://github.com/opensearch-project/dashboards-desktop/compare/v0.0.1...v0.1.0-beta)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Complete TypeScript rewrite from scratch — replaces all 2022 JavaScript code
- Electron shell with `contextIsolation`, IPC bridge, and preload scripts
- SQLite storage in worker thread with WAL mode, auto-init (`~/.osd/osd.db`)
- Schema migration system (v1: connections, workspaces, settings, conversations, messages)
- Connection manager — add, edit, delete, test connections
- Auth support: Basic Auth, API Key, AWS SigV4/SSO
- Credential encryption via Electron `safeStorage` (OS keychain)
- Both `@opensearch-project/opensearch` and `@elastic/elasticsearch` clients
- Homepage with workspace switcher, connection health indicators, recent items
- Workspace CRUD — create, switch, delete, each with own connections
- Chat panel shell (UI layout, keyboard shortcuts — agent runtime in M2)
- First-run onboarding wizard (model → connection → workspace)
- ESLint + Prettier + TypeScript strict mode + husky pre-commit hooks
- Vitest (unit), React Testing Library (components), Playwright (E2E)
- GitHub Actions CI: lint → typecheck → test → build
- Project documentation: RFC, roadmap, user stories (M1–M5), getting started guide, admin guide
- CLI entry point (`osd`) with subcommands

### Removed
- All 2022 JavaScript code (`main.js`, `preload.js`, `renderer.js`, `index.html`, `css/`)
- Bootstrap CSS dependency

### Changed
- `package.json` rewritten for TypeScript + modern toolchain
- README rewritten for 2026 agent-first reboot
- CONTRIBUTING.md updated with dev setup, project structure, testing, and extension guides
- MAINTAINERS.md updated for current team

---

## [0.0.1] — 2022-11-15

### Added
- Initial Electron proof-of-concept
- Basic AWS credential configuration form
- Bootstrap CSS layout

[Unreleased]: https://github.com/opensearch-project/dashboards-desktop/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/opensearch-project/dashboards-desktop/releases/tag/v0.0.1

# Release Notes — OSD Desktop v0.6.0

> **Date:** 2026-04-22
> **Channel:** stable
> **Theme:** Production Ready — enterprise auth, reliability, performance

---

## Highlights

v0.6.0 makes OSD Desktop enterprise-ready with SSO authentication, encryption at rest, PII detection, and production-grade error handling. Plus a full documentation site, canary releases, and comprehensive testing.

---

## What's New

### Enterprise Features
- **SSO authentication** — enterprise identity provider integration
- **Encryption at rest** — SQLite database encryption
- **PII detection** — flag sensitive data in chat responses
- **Rate limiting** — configurable limits per model provider
- **Model fallback chains** — automatic failover when a provider is down
- **Compliance logging** — audit trail for all cluster operations

### Agent Intelligence
- **Query profiler** — analyze slow queries with execution plans
- **Task manager** — view and cancel running cluster tasks
- **Conversation search** — full-text search across all conversations
- **Prompt versioning** — track and revert prompt template changes
- **Collaboration** — share conversations (export/import)

### Chat UX
- **Chat tabs** — multiple conversations side by side
- **Notification system** — alerts for long-running operations
- **Context menus** — right-click actions on messages and conversations

### Reliability
- **Canary release pipeline** — gradual rollout with automatic rollback
- **Crash reporting** — opt-in crash reports for faster bug fixes
- **Load testing** — verified under 100 conversations, 1000 messages
- **Chaos testing** — verified recovery from OSD crashes, network failures

### Accessibility
- Skip navigation links
- Focus traps in modal dialogs
- Improved ARIA attributes throughout

### Documentation
- **[docs site](https://opensearch-project.github.io/dashboards-desktop/)** — 24-page VitePress site on GitHub Pages
- API reference (75+ IPC channels), tool reference (28 tools)
- Enterprise deployment guide, security guide, benchmarks
- Contributor onboarding, community engagement plan

---

## Known Issues
- Homebrew cask and apt repository not yet published
- Code signing requires Apple/Windows certificates (unsigned builds work)

---

## Downloads

| Platform | Architecture | File |
|----------|-------------|------|
| macOS | arm64 | `OSD-Desktop-0.6.0-mac-arm64.dmg` |
| macOS | x64 | `OSD-Desktop-0.6.0-mac-x64.dmg` |
| Linux | x64 | `OSD-Desktop-0.6.0-linux-x64.AppImage` |
| Linux | arm64 | `OSD-Desktop-0.6.0-linux-arm64.AppImage` |
| Windows | x64 | `OSD-Desktop-0.6.0-win-x64.exe` |
| Windows | arm64 | `OSD-Desktop-0.6.0-win-arm64.exe` |

## Full Changelog

[v0.5.0...v0.6.0](https://github.com/opensearch-project/dashboards-desktop/compare/v0.5.0...v0.6.0)

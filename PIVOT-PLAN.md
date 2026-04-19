# Architecture Pivot — Updated Milestones

> Date: 2026-04-19 | Pivot: Electron wraps real OSD (localhost:5601)
> Previous custom React renderer is deprecated.

## Milestone Status

### M1 Foundation ✅ DONE (no changes)
### M2 Agent Core ✅ DONE (no changes)

---

### M3 OSD Integration (NEW)

**OSD Lifecycle Management — sde**
- [ ] Spawn OSD process (configurable binary path)
- [ ] Health check (poll localhost:5601 until ready)
- [ ] Graceful shutdown on app exit
- [ ] First-run: "where is your OSD binary?" dialog

**Request Signing Proxy — sde + aieng**
- [ ] Local proxy intercepts OSD→cluster requests
- [ ] Inject auth headers (basic, API key, SigV4) from connection manager
- [ ] Route through existing src/core/connections.ts credential store

**BrowserWindow Integration — sde**
- [ ] Load localhost:5601 in main BrowserWindow after OSD ready
- [ ] Handle OSD crash/restart gracefully
- [ ] Connection switcher (native menu or toolbar)

**CI/CD Updates — devops**
- [ ] Update build config for OSD binary bundling
- [ ] Update release pipeline (package OSD with Electron)
- [ ] Remove deprecated renderer build steps

---

### M4 Chat Overlay (NEW)

**Chat Panel Injection — fee**
- [ ] Sidebar overlay injected into OSD webview
- [ ] CSS + JS injection via webContents.executeJavaScript or BrowserView
- [ ] Resizable panel (same UX as before: Cmd+K/Ctrl+K, fullscreen toggle)
- [ ] Conversation history + message rendering

**Agent Wiring — aieng**
- [ ] Wire overlay to existing agent runtime (IPC → orchestrator)
- [ ] Streaming responses render in overlay
- [ ] Tool execution feedback in overlay

**Testing — test**
- [ ] E2E: launch → OSD loads → chat overlay opens → send message → response
- [ ] OSD lifecycle tests (spawn, health check, crash recovery)
- [ ] Proxy integration tests

---

### M5 Polish & Packaging (NEW)

**Onboarding — fee**
- [ ] First-run wizard (native Electron dialog): locate OSD binary, add connection
- [ ] Connection switcher UI

**Packaging — devops**
- [ ] Bundle OSD binary with Electron distribution
- [ ] Auto-update for both Electron shell and OSD
- [ ] Platform-specific packaging (macOS/Linux/Windows)

**Documentation — product**
- [ ] Update README, CONTRIBUTING for new architecture
- [ ] User guide for OSD integration

---

## Agent Assignments

| Agent | M3 | M4 | M5 |
|-------|----|----|-----|
| sde | OSD lifecycle, signing proxy, BrowserWindow | — | — |
| fee | — | Chat overlay injection | Onboarding, connection switcher |
| aieng | Signing proxy (assist) | Agent↔overlay wiring | — |
| devops | CI/CD updates, build config | — | Packaging, auto-update |
| test | — | E2E + lifecycle + proxy tests | — |
| product | — | — | Docs update |

## Deprecated (remove from active work)

- src/renderer/pages/* (all custom pages)
- src/renderer/components/* (except ChatPanel concepts reused in overlay)
- Component tests for renderer
- Theming (CSS custom properties) — OSD owns theming
- WCAG a11y work — OSD owns accessibility

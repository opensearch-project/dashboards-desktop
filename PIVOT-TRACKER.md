# Architecture Pivot Tracker — OSD Wrapper Approach

> Date: 2026-04-19 | Triggered by: Product owner directive

## Summary

Pivot from custom React UI to wrapping real OSD (localhost:5601) in Electron shell.

## What We Keep (no changes)
- ✅ Agent runtime (providers, tool registry, MCP, streaming)
- ✅ CLI (chat, connect, settings, mcp, skill, doctor)
- ✅ SQLite storage (connections, conversations, settings)
- ✅ Connection manager + auth (SigV4, basic, apikey)
- ✅ Preload IPC bridge
- ✅ Electron shell + native menus
- ✅ CI/CD pipeline + packaging
- ✅ Tests for all above

## What Changes
- ❌ Custom React pages (Home, Cluster, Indices, Security, Plugins, Skills, MCP, Settings)
- ❌ Custom admin tools (reimplemented in TS)
- 🔄 BrowserWindow → loads localhost:5601
- 🆕 OSD instance lifecycle (spawn, health, restart, stop)
- 🆕 Request signing proxy (SigV4/auth header injection)
- 🆕 Chat overlay injection on OSD web UI
- 🆕 OSD binary bundling strategy
- 🆕 Multi-datasource switching (change OSD's cluster target)

## Assignments

| Agent | Task | Status |
|-------|------|--------|
| sde | Main process: BrowserWindow→localhost:5601, OSD spawn logic | 🔄 Working |
| fee | Chat overlay injection on OSD web UI (sidebar/content script) | 🔄 Assigned |
| devops | OSD binary bundling strategy + lifecycle management | 🔄 Assigned |
| aieng | Verify agent runtime works with new architecture | 🔄 Assigned |
| product | Update RFC implementation section | 🔄 Assigned |
| test | Update tests for new architecture (remove React page tests) | ⏳ After impl |

## Key Design Decisions Needed
1. OSD bundling: bundle in app (~400MB) vs download on first launch?
2. Chat overlay: BrowserView sidebar vs preload injection vs iframe?
3. Request signing: Electron session.webRequest vs local proxy?
4. Multi-cluster: restart OSD with new config vs OSD multi-datasource plugin?

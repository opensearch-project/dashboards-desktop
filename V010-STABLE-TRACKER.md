# v0.1.0 Stable — Sprint Tracker

> Created: 2026-04-19 | PM: pm | Baseline: v0.1.0-beta (5cbdcf7)

## Task Status

### devops (4 items) ✅ DONE (7156f4b)
- [x] P1: MCP orphan process cleanup (PID file on spawn, kill on startup)
- [x] P1: MCP discovery chunked response buffering
- [x] Confirm release pipeline builds (macOS/Linux/Windows)
- [x] Fix 18 cosmetic lint warnings (unused vars)

### test (4 items)
- [ ] E2E acceptance test: full user flow
- [ ] Verify 177 tests green after new commits
- [ ] Tests for conversation CRUD IPC handlers (364456d)
- [x] Tests for connection pool and client factory ← sde (ff6dba3)

### fee (4 items) ✅ DONE (03ff592)
- [x] Wire message pinning UI to IPC stubs
- [x] Wire conversation rename UI to IPC
- [x] Review all empty states render correctly
- [x] Final a11y audit — keyboard nav all pages

### aieng (4 items)
- [ ] Bedrock provider E2E test with fixture
- [ ] Wire real OAuth flows (replace stubs)
- [ ] Review skill loader edge cases (malformed packages)
- [ ] MCP tool bridge — test with real MCP server

### product (4 items) ✅ DONE (a32d3ce)
- [x] Update CHANGELOG.md for v0.1.0-beta
- [x] Review README.md install instructions
- [x] Update CONTRIBUTING.md with src/ layout
- [x] Draft release notes for GitHub release

### sde (4 items) ✅ DONE (82032ce + audit)
- [x] Second pass code review on post-beta commits
- [x] Implement conversation rename in storage.ts
- [x] Implement message pinning in storage.ts (migration v4)
- [x] Performance audit of main process startup

## Stable Release Criteria
- All items above complete
- 0 tsc errors, 0 lint errors
- All tests green (177+)
- E2E acceptance test passing
- Release pipeline confirmed for all 3 platforms

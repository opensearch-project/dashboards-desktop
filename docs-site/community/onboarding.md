---
title: "Your First PR in 30 Minutes"
head:
  - - meta
    - property: og:title
      content: "Your First PR in 30 Minutes — OSD Desktop"
---

# Your First PR in 30 Minutes

A fast-track guide for new contributors.

---

## Setup (5 min)

```bash
# Prerequisites: Node 20+, git
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
npm ci
```

## Verify It Works (2 min)

```bash
npm run typecheck    # 0 errors
npm test             # All tests pass
```

## Pick a Task (3 min)

1. Go to [GitHub Issues](https://github.com/opensearch-project/dashboards-desktop/issues)
2. Filter by `good first issue` or `help wanted`
3. Comment "I'll take this" to claim it

Good first issues:
- Fix a typo in docs
- Add a missing test
- Improve an error message
- Add a keyboard shortcut

## Make Your Change (15 min)

```bash
git checkout -b fix/my-change
# Edit files...
```

### Where Things Live

| What | Where |
|------|-------|
| Main process | `src/main/` |
| IPC handlers | `src/main/ipc/` |
| Agent tools | `src/core/agent/tools/` |
| Model providers | `src/core/agent/providers/` |
| Chat overlay | `src/renderer/components/` |
| Sidebar | `src/renderer/sidebar/` |
| CLI commands | `src/cli/` |
| Tests | `tests/` (mirrors src/) |
| Docs | `docs/` |

### Run Tests for Your Change

```bash
npm run typecheck              # Must be 0 errors
npm test                       # Must all pass
npm run lint                   # Must be 0 errors
```

## Commit & Push (3 min)

```bash
git add .
git commit -m "fix(core): improve error message for connection timeout"
git push origin fix/my-change
```

### Commit Message Format

```
type(scope): description

Types: feat, fix, docs, test, chore, refactor
Scopes: core, main, renderer, cli, agent, mcp, docs
```

## Open a PR (2 min)

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill in: what you changed, why, how to test
4. CI runs automatically (lint → typecheck → test → build)

## What Happens Next

- CI must pass (all 7 jobs)
- A maintainer reviews within 1-2 business days
- Address feedback, push updates
- Maintainer merges — you're a contributor! 🎉

---

## Tips

- **Start small** — a docs fix or test addition is a great first PR
- **Run the full check** before pushing: `npm run typecheck && npm test && npm run lint`
- **Pre-push hook** catches errors automatically — if push is rejected, fix the reported issues
- **Ask questions** — open a Discussion or comment on the issue if you're stuck

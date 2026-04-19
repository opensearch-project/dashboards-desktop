# Testing Guide

## Test Pyramid

```
        ┌─────────┐
        │  E2E    │  ~10% — Playwright + Electron
        ├─────────┤
        │Component│  ~30% — React Testing Library
        ├─────────┤
        │  Unit   │  ~60% — Vitest
        └─────────┘
```

## Running Tests

```bash
npm test              # All unit + component tests (vitest)
npm run test:unit     # Unit tests only (excludes e2e)
npm run test:e2e      # Playwright E2E tests
npm run test:coverage # Unit + component with coverage report
npm run test:watch    # Watch mode for development

# Docker (guaranteed Node 20 environment):
docker run --rm -v $(pwd):/app -w /app node:20 bash -c 'npm install && npx vitest run'
```

## Test Inventory

### M1: Foundation (31 tests)

| File | Tests | Scope |
|------|-------|-------|
| `tests/unit/storage.test.ts` | 15 | SQLite init, WAL, migrations, connections/workspaces/settings CRUD |
| `tests/unit/connections.test.ts` | 10 | OS/ES client connectivity, auth flows, failure modes, encryption |
| `tests/components/App.test.tsx` | 3 | App shell rendering, onboarding, homepage |
| `tests/e2e/app-launch.test.ts` | 3 | Electron launch, homepage render, first-run onboarding |

### M2: Agent Core (69 tests)

| File | Tests | Scope |
|------|-------|-------|
| `tests/unit/agent/model-router.test.ts` | 10 | Resolve specifier, streaming, switching, fallback, register/unregister |
| `tests/unit/agent/tool-registry.test.ts` | 14 | Register, dispatch, timeout, truncation, MCP merge, trust levels, notifications |
| `tests/unit/agent/providers/ollama.test.ts` | 6 | listModels, text streaming, tool calls, model not found |
| `tests/unit/agent/providers/openai.test.ts` | 5 | listModels, SSE streaming, tool calls, invalid key |
| `tests/unit/agent/providers/anthropic.test.ts` | 5 | Models, text streaming, tool_use blocks, invalid key, overloaded |
| `tests/unit/mcp/supervisor.test.ts` | 8 | Spawn, stop, shutdownAll, crash recovery, max restarts, manual restart |
| `tests/unit/mcp/discovery.test.ts` | 7 | Built-in tools, JSON-RPC discovery, MCP+builtin merge, crash handling |
| `tests/unit/agent/conversation.test.ts` | 11 | CRUD, messages, tool_calls parsing, workspace isolation, context window |
| `tests/e2e/chat.test.ts` | 3 | Open chat panel, send message, streaming response |

### M3: Admin Tools (27 tests)

| File | Tests | Scope |
|------|-------|-------|
| `tests/unit/admin/opensearch.test.ts` | 10 | Security CRUD (roles, users, tenants), alerting (monitors, destinations) |
| `tests/unit/admin/elasticsearch.test.ts` | 4 | ILM lifecycle CRUD |
| `tests/unit/auth/oauth.test.ts` | 3 | GitHub PKCE URL params, challenge, window close |
| `tests/unit/agent/admin-tools.test.ts` | 7 | opensearch-query dispatch, trust level enforcement |
| `tests/e2e/admin.test.ts` | 3 | Cluster, indices, security page navigation |

### M4: Extensibility (28 tests)

| File | Tests | Scope |
|------|-------|-------|
| `tests/unit/skills/loader.test.ts` | 7 | Load/validate skill, activate/deactivate, list |
| `tests/unit/skills/personas.test.ts` | 8 | List personas, switch, tool filter, system prompt, errors |
| `tests/unit/mcp/config.test.ts` | 9 | Config CRUD, add/remove server, setServerOption, validateCommand |
| `tests/e2e/plugins.test.ts` | 2 | Plugins page render, MCP section |
| `tests/e2e/settings.test.ts` | 2 | Settings page render, model config |

### M5: Polish & Launch (31 tests)

| File | Tests | Scope |
|------|-------|-------|
| `tests/unit/agent/branching.test.ts` | 5 | Fork conversation, copy messages, error cases |
| `tests/unit/agent/auto-router.test.ts` | 12 | Complexity scoring, local/cloud selection, manual override |
| `tests/unit/cli/doctor.test.ts` | 6 | Data dir, SQLite, MCP config checks |
| `tests/unit/updates/update-manager.test.ts` | 8 | Launch logging, crash detection, rollback, hasBackup |
| `tests/e2e/full-flow.test.ts` | 8 | Launch → onboarding → connection → chat → response → admin → back to chat |

### Totals

| Category | Files | Tests |
|----------|-------|-------|
| Unit | 18 | 159 |
| Component | 1 | 3 |
| E2E | 6 | 24 |
| **Total** | **25** | **186** |

## Test Fixtures

```
tests/fixtures/
├── agent/
│   ├── simple-query.json        # Single-turn Q&A
│   ├── tool-use-flow.json       # Tool call → result → response
│   ├── streaming-tokens.json    # Token-by-token stream
│   ├── error-handling.json      # Tool error recovery
│   └── README.md                # Fixture format and recording guide
├── opensearch-responses.ts      # Mock OS cluster root, health, indices, search
├── elasticsearch-responses.ts   # Mock ES cluster root, health, indices, search
└── db-factory.ts                # SQLite test database factory
```

## Coverage Targets

| Scope | Target | Enforced |
|-------|--------|----------|
| `src/core/**` | 80% statements, branches, functions, lines | Yes — CI fails below |
| `src/renderer/**` | 70% (M2+) | Planned |
| E2E | Scenario coverage (no metric) | N/A |

## Conventions

- Unit tests: `*.test.ts` in `tests/unit/` mirroring `src/` structure
- Component tests: `*.test.tsx` in `tests/components/` with jsdom environment
- E2E tests: `*.test.ts` in `tests/e2e/` using Playwright Electron
- Fixtures: `tests/fixtures/` — shared mock data, recorded model responses
- Never call live APIs in CI — mock fetch, mock clients, use fixture replayer
- Each test creates/destroys its own state (temp DB, mock server)
- `OSD_TEST_MODE=1` env var enables fixture model provider in E2E tests

## Agent Testing (Fixture-Based)

Agent tests use recorded model responses via `FixtureReplayer`:

1. Record: `npm run test:record` — runs against live model, writes fixtures
2. Replay: `npm test` — replays fixtures deterministically in CI
3. Update: re-record when tool schemas or prompts change

See `tests/fixtures/agent/README.md` for fixture format.

## Principles

1. **Test behavior, not implementation** — tests survive refactoring
2. **One assertion per test** — clear failure messages
3. **No flaky tests** — deterministic, no timing dependencies
4. **Fast feedback** — unit tests < 5s, component tests < 15s
5. **Isolated** — each test creates/destroys its own state
6. **CI is the source of truth** — if CI passes, it ships

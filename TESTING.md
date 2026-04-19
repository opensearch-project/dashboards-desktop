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

- **Unit tests** (`tests/unit/`): Core business logic — storage, connections, model router, tool dispatch. Fast, no DOM, no Electron.
- **Component tests** (`tests/components/`): React UI components rendered in jsdom. Use `@testing-library/react`. Test behavior, not implementation.
- **E2E tests** (`tests/e2e/`): Full Electron app via Playwright. Launch → interact → assert. Slow, run in CI only.

## Directory Structure

```
tests/
├── unit/              # Vitest unit tests (mirrors src/core/)
│   ├── storage.test.ts
│   └── connections.test.ts
├── components/        # React Testing Library component tests
│   └── Homepage.test.tsx
├── e2e/               # Playwright Electron E2E tests
│   └── app-launch.test.ts
├── fixtures/          # Shared test data and mock responses
│   ├── opensearch-responses.ts
│   ├── elasticsearch-responses.ts
│   ├── db-factory.ts
│   └── agent/         # M2: recorded model responses
│       └── README.md
└── setup.ts           # Global test setup (mocks for Electron APIs)
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `*.test.ts` | `storage.test.ts` |
| Component test | `*.test.tsx` | `Homepage.test.tsx` |
| E2E test | `*.test.ts` | `app-launch.test.ts` |
| Fixture file | descriptive name | `opensearch-responses.ts` |

## Running Tests

```bash
npm test              # All unit + component tests
npm run test:unit     # Unit tests only (excludes e2e)
npm run test:e2e      # Playwright E2E tests
npm run test:coverage # Unit + component with coverage report
npm run test:watch    # Watch mode for development
```

## Coverage Targets

| Scope | Target | Enforced |
|-------|--------|----------|
| `src/core/**` | 80% statements, branches, functions, lines | Yes — CI fails below threshold |
| `src/renderer/**` | 70% (M2+) | Not yet |
| E2E | No coverage metric — scenario coverage | N/A |

## Fixture Patterns

### Mock HTTP Responses

Use `tests/fixtures/opensearch-responses.ts` and `elasticsearch-responses.ts` for consistent mock data across tests. Import and use with mock HTTP servers:

```ts
import { OPENSEARCH_CLUSTER_HEALTH } from '../fixtures/opensearch-responses';

const mock = await createMockServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(OPENSEARCH_CLUSTER_HEALTH));
});
```

### SQLite Test DB Factory

Use `tests/fixtures/db-factory.ts` to create isolated test databases:

```ts
import { createTestDb } from '../fixtures/db-factory';

const { db, cleanup } = createTestDb();
// ... run tests ...
cleanup(); // removes temp DB
```

### Agent Testing Fixtures (M2)

Agent tests use **recorded model responses** — never live API calls in CI.

```
tests/fixtures/agent/
├── README.md              # How to record and update fixtures
├── chat-simple.json       # Simple Q&A exchange
├── tool-call-query.json   # Agent calls opensearch-query tool
└── model-switch.json      # Mid-conversation model switch
```

Fixture format:

```json
{
  "model": "ollama:llama3",
  "messages": [
    { "role": "user", "content": "Show cluster health" }
  ],
  "response": {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      { "name": "cluster-health", "arguments": { "connection": "prod" } }
    ]
  }
}
```

Record fixtures from real model calls during development, commit them, replay in CI. This ensures:
- **Deterministic** — same input always produces same test result
- **Fast** — no network calls, no model inference
- **Offline** — CI doesn't need API keys or model access

## Writing Tests

### Unit Tests

```ts
import { describe, it, expect } from 'vitest';

describe('ModuleName: behavior', () => {
  it('does the expected thing', () => {
    // Arrange → Act → Assert
  });
});
```

### Component Tests

```tsx
import { render, screen } from '@testing-library/react';
import { Homepage } from '../../src/renderer/Homepage';

it('renders workspace cards', () => {
  render(<Homepage workspaces={[{ id: '1', name: 'Prod' }]} />);
  expect(screen.getByText('Prod')).toBeInTheDocument();
});
```

### E2E Tests

```ts
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches', async () => {
  const app = await electron.launch({ args: ['dist/main/index.js'] });
  const page = await app.firstWindow();
  await expect(page).toHaveTitle(/OpenSearch/);
  await app.close();
});
```

## Principles

1. **Test behavior, not implementation** — tests survive refactoring
2. **One assertion per test** — clear failure messages
3. **No flaky tests** — deterministic, no timing dependencies
4. **Fast feedback** — unit tests < 5s, component tests < 15s
5. **Isolated** — each test creates/destroys its own state (temp DB, mock server)
6. **CI is the source of truth** — if CI passes, it ships

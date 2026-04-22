# Contributing to OSD Desktop

Thank you for your interest in contributing. This guide covers development setup, project structure, testing, and the PR process.

---

## Dev Setup

### Prerequisites

- **Node.js 20+** (LTS)
- **npm 10+**
- **Git**
- **Ollama** (optional, for local model testing)

### Clone and Install

```bash
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
npm ci
```

`npm ci` runs `postinstall` automatically, which calls `electron-builder install-app-deps` to rebuild native modules (e.g., `better-sqlite3`) for your Electron version.

### If Native Module Rebuild Fails

```bash
npx electron-rebuild -f -w better-sqlite3
```

---

## Project Structure

```
src/
  main/              # Electron main process
    index.ts         # App entry — BrowserWindow loads localhost:5601 (OSD), manages lifecycle
    menu.ts          # Application menu with keyboard shortcuts
    ipc/             # IPC handler modules (connections, MCP, plugins, skills, updates, settings)
  preload/           # Preload scripts (context bridge)
    index.ts         # Exposes safe IPC API to renderer and OSD overlay
  renderer/          # Chat overlay + sidebar (injected into OSD web UI)
    components/      # Chat UI (ChatPanel, ChatMessage, ModelSwitcher, Onboarding, etc.)
    sidebar/         # Management sidebar (Slack-style left panel, React in BrowserView)
    styles/          # CSS and theme files
  core/              # Shared business logic (used by main + renderer + CLI)
    types.ts         # Shared TypeScript interfaces
    storage.ts       # SQLite worker thread, WAL mode, migrations, CRUD
    connections.ts   # Connection manager
    connections/     # Client factory and connection pool
    osd/             # OSD lifecycle and integration
      lifecycle.ts   # Spawn/stop/restart local OSD instance
      signing-proxy.ts # Auth proxy — intercepts requests, adds SigV4/auth headers
      config-generator.ts # Generate opensearch_dashboards.yml from SQLite settings
      chat-overlay.ts # Chat panel injection into OSD web UI
      plugin-installer.ts # Install/remove OSD plugins
      upgrader.ts    # OSD version upgrade with settings re-apply
      settings-persistence.ts # Settings survive OSD upgrades (SQLite → yml)
    agent/           # Agent runtime, model router, tool registry, conversation, branching
      providers/     # Model providers (Ollama, OpenAI, Anthropic, Bedrock, OpenAI-compatible)
      tools/         # Built-in agent tools (query, health, index, admin)
      multi/         # Multi-agent framework (registry, message bus, orchestrator)
      testing/       # Fixture recorder and replayer for agent tests
    admin/           # Cluster admin modules
      opensearch/    # Alerting, ingest, ISM, security, snapshots
      elasticsearch/ # ILM, ingest, security, snapshots, Watcher
    auth/            # OAuth (GitHub PKCE, Google PKCE, auth manager)
    mcp/             # MCP host (supervisor, config, discovery, tool bridge)
    plugins/         # Plugin manager, registry, sandbox
    skills/          # Skill loader, agent personas
    updates/         # Update checker, downloader, installer, rollback
  cli/               # CLI commands (chat, connect, settings, doctor, mcp, plugins, skills, agents, update)
  tui/               # Ink TUI (placeholder)
bin/
  osd.js             # CLI entry point
docs/                # User-facing documentation
tests/               # Test files (mirrors src/ structure)
  unit/              # Vitest unit tests
  components/        # React Testing Library component tests
  e2e/               # Playwright E2E tests
  fixtures/          # Mock data, recorded agent responses
```

### Key Conventions

- **Main process** spawns and manages a local OSD instance (localhost:5601), handles IPC, SQLite, cluster connections, MCP servers, signing proxy
- **BrowserWindow** loads the real OSD web UI at localhost:5601 — we do NOT reimplement admin UI
- **Chat overlay** is injected into the OSD web UI as a sidebar/panel
- **Management sidebar** (Slack-style left panel) is a separate BrowserView owned by Electron
- **Preload** bridges main ↔ OSD web UI and sidebar via `contextBridge.exposeInMainWorld`
- **Core** contains shared logic imported by main, renderer, and CLI
- **Settings persist in SQLite** — when OSD is upgraded, Electron re-generates config and re-installs plugins automatically

---

## Running Locally

```bash
npm start              # Launch Electron app
npm run dev            # Launch with DevTools open
npm run tui            # Launch TUI mode (terminal)
```

### Hot Reload (Development)

The `--dev` flag opens DevTools automatically. For renderer changes, refresh the window (Cmd+R). For main process changes, restart the app.

---

## Testing

```bash
npm test               # Run all unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
npm run test:renderer  # Renderer component tests (jsdom)
npm run test:e2e       # End-to-end tests (Playwright)
```

### Test Structure

```
tests/
  unit/              # Unit tests for core/ and main/
  components/        # React component tests (RTL + jsdom)
  e2e/               # Playwright end-to-end tests
  fixtures/          # Shared test data, mock responses
```

### Test Conventions

- Unit tests: `*.test.ts` — test pure logic in `core/` and `main/`
- Component tests: `*.spec.tsx` — test React components with React Testing Library
- E2E tests: `*.e2e.ts` — test full app flows with Playwright
- **Agent tests use fixtures** — recorded model responses, never live API calls in CI
- **Mock HTTP servers** (nock/msw) for data source tests
- Coverage threshold is enforced in CI — PRs that drop coverage are flagged

---

## Adding a New Agent Tool

Agent tools let the AI perform actions — query clusters, manage indices, read files, etc.

### Step 1: Define the Tool

Create a new file in `src/core/tools/`:

```typescript
// src/core/tools/my-tool.ts
import { ToolDefinition, ToolResult } from '../types';

export const myTool: ToolDefinition = {
  name: 'my-tool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The query to run' },
    },
    required: ['query'],
  },
  execute: async (params, context): Promise<ToolResult> => {
    // Implementation here
    return { content: 'Result' };
  },
};
```

### Step 2: Register the Tool

Add it to the tool registry in `src/core/tools/index.ts`:

```typescript
import { myTool } from './my-tool';

export const builtinTools: ToolDefinition[] = [
  // ... existing tools
  myTool,
];
```

### Step 3: Write Tests

```typescript
// tests/unit/tools/my-tool.test.ts
import { myTool } from '../../../src/core/tools/my-tool';

describe('my-tool', () => {
  it('returns expected result', async () => {
    const result = await myTool.execute({ query: 'test' }, mockContext);
    expect(result.content).toBeDefined();
  });
});
```

### Step 4: Test with the Agent

Launch the app, open chat, and ask the agent to use your tool. The agent discovers all registered tools automatically.

---

## Adding an MCP Server

MCP servers are external processes that expose tools to the agent.

### For Users (Install Existing)

```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp config server-filesystem --root ~/data
```

### For Contributors (Ship a Test Server)

Test MCP servers live in `tests/fixtures/mcp/`. The CI test suite uses these to validate MCP lifecycle without external dependencies.

```typescript
// tests/fixtures/mcp/echo-server.ts
// A minimal MCP server that echoes input — used in CI
```

### MCP Integration Points

- `src/main/mcp.ts` — MCP server process supervisor (start, stop, health check, restart)
- `src/core/tools/index.ts` — MCP tools are merged with built-in tools at discovery time
- `~/.osd/mcp/config.json` — User MCP server configuration

---

## Adding a Model Provider

Model providers connect the agent to LLM APIs.

### Step 1: Implement the Provider

Create a new file in `src/core/models/`:

```typescript
// src/core/models/my-provider.ts
import { ModelProvider, StreamingResponse } from '../types';

export const myProvider: ModelProvider = {
  name: 'my-provider',
  async chat(messages, options): AsyncIterable<StreamingResponse> {
    // Implement streaming chat completion
  },
  async test(): Promise<boolean> {
    // Return true if the provider is reachable
  },
};
```

### Step 2: Register the Provider

Add it to `src/core/models/index.ts`:

```typescript
import { myProvider } from './my-provider';

export const providers: Record<string, ModelProvider> = {
  // ... existing providers
  'my-provider': myProvider,
};
```

### Step 3: Write Fixture-Based Tests

```typescript
// tests/unit/models/my-provider.test.ts
// Use recorded responses — never call live APIs in tests
```

---

## PR Process

### Before Submitting

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes — focus on one concern per PR
4. Run the full check suite:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```
5. Commit with clear messages: `feat(core): add index alias management tool`

### CI Pipeline

Every PR runs:

1. **Lint** — ESLint + Prettier check
2. **Typecheck** — `tsc --noEmit`
3. **Unit tests** — Vitest with coverage
4. **Component tests** — React Testing Library
5. **Build** — Electron build (Linux x64)

PRs that fail any step are blocked from merging.

### Commit Message Format

```
type(scope): description

feat(core): add SigV4 auth for OpenSearch connections
fix(renderer): chat panel resize below minimum width
docs: update getting started guide
test(e2e): add connection manager flow
chore: bump electron to 39.x
```

### Review Process

- All PRs require at least one maintainer approval
- CI must pass
- Coverage must not decrease
- Keep PRs focused — large PRs are harder to review

---

## Reporting Bugs

Use [GitHub Issues](https://github.com/opensearch-project/dashboards-desktop/issues). Include:

- Steps to reproduce
- Expected vs actual behavior
- OS and app version (`osd --version`)
- Output of `osd doctor` if relevant

---

## Security Issue Notifications

If you discover a potential security issue, notify AWS/Amazon Security via the [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Do **not** create a public GitHub issue.

---

## License

This project is licensed under the [Apache-2.0 License](LICENSE). By contributing, you agree that your contributions will be licensed under the same terms.

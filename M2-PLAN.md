# M2 Agent Core — Implementation Plan

> Generated: 2026-04-19 | PM: pm | Status: ACTIVE

## Already Completed (banked during M1)

### sde (committed)
- ✅ Agent types (`src/core/agent/types.ts`)
- ✅ Tool registry (`src/core/agent/tool-registry.ts`)
- ✅ Model router (`src/core/agent/model-router.ts`)
- ✅ 5 model providers: Ollama, OpenAI, Anthropic, Bedrock, OpenAI-compatible
- ✅ Token estimator (`src/core/agent/token-estimator.ts`)
- ✅ Conversation manager (`src/core/agent/conversation.ts`)
- ✅ Agent orchestrator (`src/core/agent/orchestrator.ts`)
- ✅ 4 built-in tools: opensearch-query, elasticsearch-query, cluster-health, index-manage
- ✅ Fixture recorder + replayer for agent testing
- ✅ M2 design doc

### devops (committed)
- ✅ MCP process supervisor (`src/core/mcp/supervisor.ts`)
- ✅ MCP config manager (`src/core/mcp/config.ts`)
- ✅ MCP CLI commands (`src/cli/mcp.ts`)
- ✅ MCP tool discovery (`src/core/mcp/discovery.ts`)
- ✅ Test MCP server (echo/math fixture)

## Remaining Work

### Agent Runtime — sde
- [ ] Tool execution sandboxing model
- [ ] Streaming response transport (token-by-token with markdown + syntax highlighting)
- [ ] Inline tool execution feedback (spinner UI)
- [ ] Wire orchestrator → IPC → renderer (end-to-end message flow)

### Model Switching UI — fee
- [ ] Model selector dropdown in chat header
- [ ] `/model` command for in-session switching
- [ ] Wire chat panel to agent runtime (send message → stream response → render)
- [ ] Tool execution feedback UI (spinner, status messages)
- [ ] Conversation storage display (load/switch conversations)

### CLI — sde or devops
- [ ] `osd chat --model` CLI for quick chat mode

### Testing — test
- [ ] Agent fixture-based tests using sde's recorder/replayer
- [ ] Tool dispatch unit tests (all 4 built-in tools)
- [ ] MCP lifecycle integration tests (using devops's echo server)
- [ ] Playwright E2E: launch → homepage → chat → send message → response renders
- [ ] Mock HTTP servers (nock/msw) for data source tests

### Integration — aieng
- [ ] Wire MCP discovery into tool registry (devops's discovery + sde's registry)
- [ ] Bedrock provider testing/hardening
- [ ] OpenAI-compatible provider testing (covers local LLM servers)

## Task Assignments

| Agent | Tasks | Dependencies |
|-------|-------|-------------|
| sde | Streaming transport, tool sandboxing, IPC wiring, `osd chat` CLI | None — can start now |
| fee | Model selector UI, chat wiring, tool feedback UI, conversation display | Needs sde's streaming transport |
| devops | CI updates for M2 tests, MCP integration test wiring | None — can start now |
| test | Agent fixture tests, tool tests, MCP tests, E2E chat flow | Needs sde's streaming + fee's chat wiring for E2E |
| aieng | MCP↔registry integration, provider hardening | Needs sde's registry + devops's discovery |

## Critical Path

```
sde: streaming transport → fee: chat wiring → test: E2E chat flow
```

## Risks

| Risk | Mitigation |
|------|-----------|
| Streaming transport complexity | sde has design doc, start with simplest SSE-style approach |
| MCP↔agent integration gaps | aieng dedicated to this seam |
| E2E tests blocked until chat works end-to-end | test writes fixture/unit tests first, E2E last |

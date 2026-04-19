# Agent Test Fixtures (M2)

This directory holds recorded model responses for agent runtime testing.

## How it works

1. During development, run the agent against a real model
2. Record the request/response pairs as JSON fixtures
3. In CI, replay these fixtures instead of calling live APIs

## Fixture format

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

## Rules

- Never call live model APIs in CI
- Update fixtures when tool schemas change
- One fixture per test scenario

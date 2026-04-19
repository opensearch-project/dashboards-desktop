# Multi-Agent Framework Design

## Overview

Multiple agents running concurrently, each with its own model, system prompt, and tools. An orchestrator routes user requests to the best agent or coordinates multiple agents on complex tasks.

## Architecture

```
User message
    │
    ▼
┌──────────────┐
│ Orchestrator │ ← decides: single agent or multi-agent
└──────┬───────┘
       │
  ┌────┴────┬──────────┐
  ▼         ▼          ▼
┌─────┐  ┌─────┐  ┌─────┐
│Agent│  │Agent│  │Agent│   ← each has own model, prompt, tools
│ ops │  │ sql │  │ sec │
└──┬──┘  └──┬──┘  └──┬──┘
   │        │        │
   └────┬───┘────────┘
        ▼
   Message Bus          ← agents communicate via typed messages
```

## Components

### AgentInstance
One running agent with its own model, system prompt, tools, and conversation state.

### AgentRegistry
Manages agent lifecycle: spawn, get, list, kill. Each agent has a unique ID.

### MessageBus
Typed pub/sub for inter-agent communication. Agents can:
- Send direct messages to another agent
- Broadcast to all agents
- Delegate tasks with expected response

### Orchestrator
Routes user messages to agents. Strategies:
- **Single**: route to best-fit agent based on intent
- **Fan-out**: send to multiple agents, merge responses
- **Pipeline**: agent A → agent B → agent C (sequential)
- **Delegate**: orchestrator asks specialist, gets answer, continues

## Multi-Model

Each agent can use a different model:
- ops-agent → ollama:llama3 (fast, local)
- analyst-agent → anthropic:claude-sonnet-4-20250514 (complex reasoning)
- security-agent → openai:gpt-4o (broad knowledge)
- orchestrator → cheapest model that can classify intent

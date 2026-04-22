# Introducing OSD Desktop v0.5 — An Agent-First Desktop for OpenSearch

We're excited to announce OSD Desktop, an open-source desktop application that brings AI-powered chat to OpenSearch and Elasticsearch cluster management.

---

## What Is OSD Desktop?

OSD Desktop wraps OpenSearch Dashboards in an Electron shell and adds what the browser can't: an AI agent, local model support, MCP extensibility, and a unified CLI. It's a local-first, privacy-respecting alternative to cloud AI chat tools — and it doubles as the best way to manage your search clusters.

## Key Features

### 🤖 Chat with Your Clusters

Ask questions in plain English. The agent translates to query DSL, runs it, and formats the results:

```
> Show me the top 10 error codes in the last hour
> Why is my cluster yellow?
> Create an alerting monitor for 502 errors > 100/min
```

### 🔌 Any Model, Anytime

Run Ollama locally for privacy, or connect to OpenAI, Anthropic, or Amazon Bedrock. Switch models mid-conversation — fast local model for lookups, powerful cloud model for analysis.

### 🧩 28 Built-In Tools

From cluster health to anomaly detection, index management to snapshot operations. The agent has tools for everything you'd normally do with curl and the REST API.

### 🗂️ Multi-Cluster Management

Connect to OpenSearch and Elasticsearch clusters from one app. Switch between prod, staging, and dev with one click or one chat command.

### 🔒 Local-First Privacy

All data stored in local SQLite. Credentials encrypted via OS keychain. With local models, zero data leaves your machine.

### 🛠️ Extensible

Install MCP servers for filesystem, GitHub, database access. Install skills and agent personas. Build your own with TypeScript.

## By the Numbers

- **394 tests**, 0 failures
- **28 agent tools**
- **5 model providers**
- **6-platform builds** (macOS/Linux/Windows × x64/arm64)
- **75+ IPC channels**
- **30+ documentation pages**

## Get Started

Download from [GitHub Releases](https://github.com/opensearch-project/dashboards-desktop/releases) or build from source:

```bash
git clone https://github.com/opensearch-project/dashboards-desktop.git
cd dashboards-desktop
npm ci && npm run build
```

See the [Getting Started Guide](docs/GETTING-STARTED.md) for a full walkthrough.

## What's Next

- v0.6.0: Enterprise auth (OAuth, SSO), production error handling, performance optimization
- v0.7.0: Agent memory, conversation branching, skill marketplace
- v1.0.0: GA release with full documentation and community validation

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started. Join the conversation on [GitHub Discussions](https://github.com/opensearch-project/dashboards-desktop/discussions).

---

*OSD Desktop is an open-source project under the Apache 2.0 license, part of the [OpenSearch project](https://opensearch.org/).*

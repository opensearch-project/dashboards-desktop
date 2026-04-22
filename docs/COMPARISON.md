# Comparison: OSD Desktop vs Alternatives

How OSD Desktop compares to other desktop and admin tools.

---

## Feature Comparison

| Feature | OSD Desktop | Kibana (Elastic) | Grafana Desktop | ChatGPT Desktop | Claude Desktop |
|---------|-------------|-------------------|-----------------|-----------------|----------------|
| **OpenSearch admin** | ✅ Full (native OSD UI) | ❌ | ❌ | ❌ | ❌ |
| **Elasticsearch admin** | ✅ Via connections | ✅ Native | ❌ | ❌ | ❌ |
| **AI chat** | ✅ 5 providers | ✅ Elastic AI Assistant | ❌ | ✅ GPT only | ✅ Claude only |
| **Local models** | ✅ Ollama, any GGUF | ❌ Cloud only | ❌ | ❌ | ❌ |
| **Model switching** | ✅ Any model, anytime | ❌ Elastic models only | ❌ | ❌ Single provider | ❌ Single provider |
| **MCP support** | ✅ First-class host | ❌ | ❌ | ❌ | ✅ |
| **Multi-cluster** | ✅ Switch in one app | ❌ One cluster per instance | ✅ Multiple datasources | ❌ | ❌ |
| **Desktop app** | ✅ Electron | ❌ Browser only | ✅ Electron | ✅ Electron | ✅ Electron |
| **CLI** | ✅ `osd chat`, `osd doctor` | ❌ | ❌ | ❌ | ❌ |
| **Plugins** | ✅ OSD plugins + skills | ✅ Kibana plugins | ✅ Grafana plugins | ❌ | ❌ |
| **Local storage** | ✅ SQLite | ❌ Server-side | ❌ Server-side | ❌ Cloud | ❌ Cloud |
| **Offline mode** | ✅ With local models | ❌ | ❌ | ❌ | ❌ |
| **Open source** | ✅ Apache 2.0 | ❌ SSPL/Elastic License | ✅ AGPL | ❌ | ❌ |
| **Self-diagnostics** | ✅ `osd doctor` | ❌ | ❌ | ❌ | ❌ |
| **Auto-update** | ✅ 3 channels | N/A | ✅ | ✅ | ✅ |

---

## When to Use What

### Use OSD Desktop When

- You manage **OpenSearch clusters** and want AI-assisted admin
- You need **local models** for privacy or air-gapped environments
- You want **one app** for multiple OpenSearch + Elasticsearch clusters
- You want **MCP extensibility** with open-source tooling
- You prefer **CLI + desktop** over browser-only workflows

### Use Kibana When

- You're fully committed to the **Elastic ecosystem**
- You need **Elastic-specific features** (Elastic Security, Observability, Enterprise Search)
- Your team already has **Kibana dashboards and saved objects**

### Use Grafana Desktop When

- Your primary use case is **metrics visualization** (Prometheus, InfluxDB, etc.)
- You need **multi-datasource dashboards** beyond search engines
- You don't need AI chat or search-engine admin

### Use ChatGPT / Claude Desktop When

- You only need **general AI chat** without cluster management
- You don't need **local models** or MCP extensibility
- You're not managing OpenSearch or Elasticsearch

---

## Architecture Comparison

| Aspect | OSD Desktop | Kibana | Grafana Desktop |
|--------|-------------|--------|-----------------|
| UI approach | Wraps real OSD (localhost:5601) | Server-rendered web app | Electron + custom React |
| Data storage | Local SQLite | Elasticsearch index | SQLite / server |
| Auth | Electron signing proxy | Server-side | Server-side |
| Plugin model | OSD plugins + MCP + skills | Kibana plugins | Grafana plugins |
| AI integration | Agent runtime in main process | Elastic AI Assistant (cloud) | N/A |
| Update model | electron-updater + OSD binary swap | Server deploy | electron-updater |

---

## Cost Comparison

| Tool | License | AI Cost | Infrastructure |
|------|---------|---------|---------------|
| **OSD Desktop** | Free (Apache 2.0) | Free with local models, pay-per-use with cloud | Your machine only |
| **Kibana** | SSPL / Elastic License | Elastic AI Assistant pricing | Elastic Cloud or self-managed |
| **Grafana Desktop** | AGPL | N/A | Grafana Cloud or self-managed |
| **ChatGPT Desktop** | Proprietary | $20/mo (Plus) or API pricing | OpenAI cloud |
| **Claude Desktop** | Proprietary | $20/mo (Pro) or API pricing | Anthropic cloud |

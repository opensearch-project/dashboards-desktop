# Migration Guide: OSD Web → OSD Desktop

Moving from browser-based OpenSearch Dashboards to OSD Desktop.

---

## What Changes

| Aspect | OSD Web (Browser) | OSD Desktop |
|--------|-------------------|-------------|
| Access | Browser → `https://your-cluster:5601` | Desktop app → wraps local OSD |
| Auth | Cluster handles auth | Electron manages auth (SigV4, basic, API key) via signing proxy |
| Admin UI | Same OSD UI | Same OSD UI (wrapped in Electron) |
| AI Chat | Not available | Built-in agent with 5 model providers |
| MCP | Not available | First-class MCP host |
| Multi-cluster | One cluster per browser tab | Multiple clusters in one app, switch via sidebar or chat |
| Data storage | Server-side | Local SQLite (`~/.osd/osd.db`) |
| Plugins | Installed on server | Managed by Electron, persist across OSD upgrades |
| Offline | Requires network to server | Works offline with local models |

## What Stays the Same

- The OSD admin UI is identical — same dashboards, same index management, same security config
- OSD plugins work the same way
- Query DSL, saved objects, and visualizations are unchanged
- Keyboard shortcuts within OSD are preserved

---

## Step-by-Step Migration

### 1. Install OSD Desktop

Download from [GitHub Releases](https://github.com/opensearch-project/dashboards-desktop/releases) or build from source.

### 2. Add Your Existing Connections

For each cluster you currently access via browser:

**AWS OpenSearch Service:**
```
Name: prod-opensearch
URL: https://search-prod.us-east-1.es.amazonaws.com
Auth: AWS SigV4/SSO
Region: us-east-1
```

**Self-managed OpenSearch:**
```
Name: local-opensearch
URL: https://localhost:9200
Auth: Basic Auth
Username: admin
Password: (your password)
```

**Elasticsearch:**
```
Name: staging-elastic
URL: https://staging.es.eu-west-1.aws.elastic.co:9243
Auth: API Key
Key: (your API key)
```

### 3. Organize into Workspaces

Create workspaces to match your environments:
- "Production" → prod connections
- "Staging" → staging connections
- "Development" → local connections

### 4. Configure a Model (Optional)

For AI chat capabilities, configure at least one model:
- **Local (private):** Install Ollama → `ollama pull llama3`
- **Cloud:** Add API key in Settings → Models

### 5. Export Saved Objects (Optional)

If you have saved dashboards, visualizations, or queries in your browser-based OSD:

1. In browser OSD: Stack Management → Saved Objects → Export All
2. Save the `.ndjson` file
3. In OSD Desktop: Stack Management → Saved Objects → Import

---

## What You Gain

### AI Agent
Ask questions in natural language instead of writing query DSL:
```
Show me error trends for the last 24 hours
```

### Multi-Cluster in One App
No more juggling browser tabs. Switch clusters with one click or one chat command.

### Local-First Privacy
Conversations, settings, and credentials stay on your machine. Use local models for zero data exfiltration.

### Persistent Settings
Your connections, plugins, and preferences survive OSD upgrades. Electron is the source of truth — SQLite stores everything.

### CLI Access
```bash
osd chat "What's my cluster health?"
osd connect test prod-opensearch
osd doctor
```

---

## Known Differences

| Feature | OSD Web | OSD Desktop |
|---------|---------|-------------|
| URL bar | Browser URL bar | No URL bar (Electron window) |
| Bookmarks | Browser bookmarks | Conversation pinning + workspace switching |
| Multiple tabs | Browser tabs | Workspaces (one active at a time) |
| Extensions | Browser extensions work | Browser extensions don't apply |
| Dev Tools | Browser DevTools (F12) | Electron DevTools (Cmd+Shift+I) |
| Print | Browser print | Not yet supported |

---

## Rollback

If you need to go back to browser-based OSD, your clusters are unchanged — OSD Desktop is a client, not a server. Just open your cluster URL in a browser as before.

# Admin Guide — OSD Desktop

Manage OpenSearch and Elasticsearch clusters from one application.

---

## OpenSearch Clusters

### Cluster Health

**GUI:** Navigate to Admin → Cluster Health for the active OpenSearch connection.

The overview shows:
- Cluster status (GREEN / YELLOW / RED)
- Node count by role (data, master, coordinating)
- Index and shard counts
- Storage used / total
- Unassigned shards with allocation reasons

**Chat:**
```
What's the health of my cluster?
```

The agent returns the same data with proactive warnings:
```
⚠️ 2 indices have no replicas: audit-logs-2026.03, temp-reindex
→ Want me to add replicas?
```

Health auto-refreshes every 30 seconds in the GUI. Click the refresh icon for an immediate check.

### Index Management

**GUI:** Admin → Indices shows all indices with health, doc count, store size, shards, and replicas. Sortable and filterable.

**Operations:**

| Operation | GUI | Chat |
|-----------|-----|------|
| Create index | Admin → Indices → Create | "Create an index called logs-2026.04 with 3 shards and 1 replica" |
| Delete index | Select → Delete (with confirmation) | "Delete the temp-reindex index" |
| Reindex | Select → Reindex → enter destination | "Reindex logs-2026.03 into logs-archive" |
| Manage aliases | Index details → Aliases tab | "Add alias 'current-logs' pointing to logs-2026.04" |
| View mappings | Index details → Mappings tab | "Show me the mapping for logs-2026.04" |

> **Reindex progress:** The GUI shows docs processed / total. For large reindexes, the agent reports progress periodically.

### Security Configuration

**Requires:** OpenSearch Security plugin installed on the cluster.

**GUI:** Admin → Security

| Section | What You Can Do |
|---------|----------------|
| **Roles** | View, create, edit roles. Configure cluster permissions, index permissions (patterns + actions), tenant permissions. Built-in roles are visually distinguished. |
| **Users** | View, create, edit, delete internal users. Assign backend roles. |
| **Tenants** | View, create, delete tenants. |

**Chat:**
```
List all custom roles on this cluster
Create a read-only role for the analytics team with access to logs-* indices
```

> If the Security plugin is not installed, the Security section shows: "Security plugin not detected on this cluster."

### Alerting

**GUI:** Admin → Alerting

- View monitors with status (active/disabled) and last triggered time
- Create monitors with trigger conditions and notification destinations
- Enable/disable/delete monitors

**Chat:**
```
Show me all active alerting monitors
Create a monitor that alerts when error rate exceeds 5% in the last 15 minutes
```

### ISM Policies

**GUI:** Admin → Index State Management

- View policies with managed index count
- Create/edit policies with state transitions (hot → warm → cold → delete)
- Attach policies to index patterns

### Snapshot Management

**GUI:** Admin → Snapshots

- Register snapshot repositories (S3, shared filesystem)
- Take manual snapshots
- Restore from snapshots
- View snapshot status and contents

### Ingest Pipelines

**GUI:** Admin → Ingest Pipelines

- View pipelines with processor count
- Create/edit pipelines with a JSON editor
- Test pipelines with the simulate API
- Delete pipelines

---

## Elasticsearch Clusters

### Cluster Health

Same as OpenSearch — the GUI and chat adapt to the Elasticsearch API automatically.

### Index Lifecycle Management (ILM)

**GUI:** Admin → ILM (Elasticsearch connections only)

| Operation | How |
|-----------|-----|
| View policies | Lists all ILM policies with phases and managed index count |
| Create policy | Define phases: hot → warm → cold → delete with timing |
| Edit policy | Modify phase transitions and actions |
| Delete policy | Remove policy (does not delete managed indices) |

**Chat:**
```
Show me all ILM policies
What's the retention policy for the logs index?
```

### Watcher Alerts

**GUI:** Admin → Alerting (Elasticsearch connections)

- View watches with status (active/inactive) and last triggered
- Create, activate, deactivate, delete watches

**Chat:**
```
Show me all active Watcher alerts
Create a watch that triggers when disk usage exceeds 85%
```

### Snapshots & Restore

Same interface as OpenSearch snapshots. The app uses the correct Elasticsearch snapshot API.

### Ingest Pipelines

Same interface as OpenSearch. Create, edit, test (simulate), and delete pipelines.

### Security (Native Realm)

**GUI:** Admin → Security (Elasticsearch connections with security enabled)

- Manage native realm users
- Create and revoke API keys
- View and edit role mappings

---

## Multi-Cluster Setup

### Adding Multiple Connections

Add connections for each environment in your workspace:

1. **prod-opensearch** — `https://search-prod.us-east-1.es.amazonaws.com` (SigV4)
2. **staging-elastic** — `https://staging.es.eu-west-1.aws.elastic.co:9243` (API Key)
3. **dev-opensearch** — `https://localhost:9200` (Basic Auth)

### Switching Clusters

**GUI:** Click the connection selector in the admin panel header. All connections show their health status.

**Chat:**
```
Switch to staging-elastic
```
> Switched to staging-elastic (Elasticsearch 8.17)

All subsequent commands target the new connection until you switch again.

### Cross-Cluster Comparison

```
Compare index count between prod-opensearch and staging-elastic
Compare cluster health across all connections
```

The agent queries multiple clusters and presents a comparison table.

### Workspace Organization

Use workspaces to group related clusters:

| Workspace | Connections |
|-----------|------------|
| Production | prod-opensearch, prod-elastic |
| Staging | staging-opensearch, staging-elastic |
| Development | local-opensearch |

Switch workspaces to switch your entire context — connections, conversations, and recent items.

---

## Backup & Workspace Export

### What's Stored Locally

All data lives in `~/.osd/`:

```
~/.osd/
├── osd.db          # SQLite database (connections, workspaces, conversations, settings)
├── config.yaml     # App configuration
├── mcp/            # MCP server configs
├── skills/         # Installed skills
└── plugins/        # Installed plugins
```

### Backup

Back up the entire `~/.osd/` directory:

```bash
cp -r ~/.osd ~/.osd-backup-$(date +%Y%m%d)
```

Or back up just the database:

```bash
sqlite3 ~/.osd/osd.db ".backup ~/.osd/osd-backup.db"
```

> **SQLite backup is safe** even while the app is running (WAL mode supports concurrent reads).

### Restore

```bash
# Stop OSD Desktop first
cp ~/.osd-backup-20260419/osd.db ~/.osd/osd.db
# Relaunch OSD Desktop
```

### Workspace Export (Future)

Workspace export/import as portable bundles is planned for a future release. Currently, workspaces are local to the machine.

---

## Troubleshooting

### Connection Issues

| Problem | Solution |
|---------|----------|
| 🔴 Connection refused | Verify the cluster URL and that the cluster is running |
| 🔴 Authentication failed (401) | Check credentials. For AWS: run `aws sso login` if using SSO |
| 🔴 SSL certificate error | Cluster may use self-signed certs. Check your CA configuration |
| 🔴 Connection timed out | Cluster may be under heavy load or behind a firewall |

### Self-Diagnostics

Run the built-in health check:

```bash
osd doctor
```

Output:
```
✅ SQLite — osd.db (v1, 2.3 MB, WAL mode)
✅ MCP — server-filesystem (running, 3 tools)
✅ Connection — prod-opensearch (OpenSearch 2.17, GREEN)
❌ Connection — staging-elastic (unreachable)
✅ Model — ollama:llama3 (reachable)

1 issue found. Run `osd doctor --fix` for auto-repair suggestions.
```

### Logs

Application logs are in:
- **macOS:** `~/Library/Logs/OSD Desktop/`
- **Linux:** `~/.config/OSD Desktop/logs/`
- **Windows:** `%APPDATA%\OSD Desktop\logs\`

---

## Next Steps

- **[Getting Started](GETTING-STARTED.md)** — Installation and first-use walkthrough
- **[User Stories](USER-STORIES-M3.md)** — Detailed admin feature specifications
- **[RFC](../RFC-2026-DESKTOP-AGENT.md)** — Full technical proposal

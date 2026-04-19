# Use Cases

Real-world workflows for different personas using OSD Desktop.

---

## Developer — Daily AI Workflow

**Setup:** Ollama running locally, MCP filesystem server installed, workspace "Dev" with local OpenSearch.

### Morning Standup Prep

```
> Show me all errors in logs-* from the last 24 hours, grouped by service
```

The agent queries your local OpenSearch, returns a table. Follow up:

```
> Which service has the highest error rate increase compared to yesterday?
```

### Code Exploration with MCP

```
> List the TypeScript files in src/core/ that import storage.ts
```

The agent uses the MCP filesystem server to scan your project, then explains the dependency chain.

### Quick Cluster Check

```
> Is my local OpenSearch healthy? Any unassigned shards?
```

One-line answer with proactive warnings if something is off.

### Model Switching for Complex Tasks

```
/model ollama:llama3
> What's the index count?

/model anthropic:claude-sonnet
> Design a retention policy for logs-* indices: 7 days hot, 30 days warm, 90 days delete
```

Use the fast local model for lookups, switch to cloud for reasoning.

---

## Data Engineer — Data Exploration

**Setup:** Cloud model (OpenAI or Anthropic), workspace "Analytics" with production OpenSearch.

### Natural Language Queries

```
> Show me the top 10 customers by order volume this month from the orders index
```

The agent translates to OpenSearch DSL, runs the query, formats results as a table.

### Index Management

```
> Create an index called orders-2026-04 with the same mapping as orders-2026-03
> Reindex orders-2026-03 into orders-archive with a date filter for records older than 30 days
> Add alias "current-orders" pointing to orders-2026-04
```

Each operation runs via the `index-manage` tool with confirmation before destructive actions.

### Pipeline Building

```
> Create an ingest pipeline that extracts the timestamp from the log message field,
  converts it to ISO format, and removes the original message field
```

The agent builds the pipeline JSON, offers to test it with the simulate API, then creates it.

---

## Platform Engineer — Multi-Cluster Management

**Setup:** AWS SigV4 auth, workspace "Production" with 3 clusters (prod-opensearch, staging-opensearch, staging-elastic).

### Cross-Cluster Health Check

```
> Show me the health of all my clusters
```

The agent queries each connection and presents a comparison table:

```
| Cluster          | Status | Nodes | Indices | Storage    |
|------------------|--------|-------|---------|------------|
| prod-opensearch  | 🟢     | 6     | 142     | 2.3/8 TB   |
| staging-opensearch| 🟢    | 3     | 87      | 450/2 TB   |
| staging-elastic  | 🟡     | 3     | 56      | 1.1/2 TB   |
```

### Investigate a Yellow Cluster

```
> Switch to staging-elastic
> Why is the cluster yellow? Show me unassigned shards with reasons
> Fix the unassigned shards — add replicas where missing
```

### Security Audit

```
> Switch to prod-opensearch
> List all custom roles that have write access to security-* indices
> Show me which users have the admin role
```

### Snapshot Management

```
> Take a snapshot of prod-opensearch to the s3-backup repository
> Show me all snapshots from the last 7 days
> Restore the logs-2026-03 index from snapshot snap-20260318
```

---

## Security Researcher — Air-Gapped Analysis

**Setup:** Ollama with codellama running locally, no internet, workspace "Investigation" with local OpenSearch containing log data.

### Threat Hunting

```
> Search for failed SSH login attempts in the last 48 hours
> Group by source IP and show the top 20
> For the top IP, show all activity — not just SSH
```

All queries run locally. No data leaves the machine.

### Log Analysis

```
> Find all log entries containing "unauthorized" or "forbidden" in the auth-logs index
> Correlate these with successful logins from the same IPs within 1 hour
```

### Export Findings

```
> Summarize the findings as a markdown report with:
  - Timeline of events
  - Affected IPs and users
  - Recommended actions
```

The agent generates a structured report you can copy or save.

### Why Air-Gapped Works

- Ollama runs models entirely on your machine
- SQLite stores everything locally in `~/.osd/osd.db`
- No telemetry, no cloud calls, no data exfiltration
- The app works fully offline once installed

---

## Common Patterns Across All Personas

### Save Time with Agent Personas

```bash
osd agent switch ops-agent        # Before a cluster maintenance window
osd agent switch analyst-agent    # Before a data exploration session
osd agent switch default          # For general tasks
```

### Use Conversation Branching for Exploration

Ask a question → get an answer → branch to try a different approach without losing the original thread.

### Pin Important Results

Pin cluster health summaries, query results, or generated reports. Access them later via the Pinned filter.

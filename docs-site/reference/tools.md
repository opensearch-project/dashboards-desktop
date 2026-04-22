---
title: "Agent Tool Reference"
head:
  - - meta
    - property: og:title
      content: "Agent Tool Reference — OSD Desktop"
---

# Agent Tool Reference

All 28 built-in tools available to the AI agent.

---

## Query Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `opensearch-query` | Run DSL queries against OpenSearch | "Show me errors in logs-* from the last hour" |
| `elasticsearch-query` | Run DSL queries against Elasticsearch | "Count documents in metrics-* by day" |
| `nl-query` | Natural language → query DSL translation | "Find all orders over $1000 from California" |
| `query-profiler` | Profile query execution performance | "Why is this query slow?" |
| `export-results` | Export query results to JSON/CSV | "Export the last query results as CSV" |

## Cluster Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `cluster-health` | Cluster status, nodes, shards, storage | "Is my cluster healthy?" |
| `cluster-compare` | Compare two clusters side-by-side | "Compare prod and staging" |
| `cluster-settings` | View/update cluster settings | "Show me cluster settings" |
| `cluster-reroute` | Reroute shards manually | "Move shard 3 of logs to node-2" |
| `hot-threads` | Identify CPU-intensive threads | "What's causing high CPU?" |
| `cat-api` | Run _cat API endpoints | "Show me node allocation" |
| `task-management` | List/cancel running tasks | "Show me running tasks" |
| `multi-cluster-dashboard` | Health summary across all connections | "Health of all my clusters" |

## Index Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `index-manage` | Create, delete, reindex, aliases | "Create index test-logs with 3 shards" |
| `index-template` | Manage index templates | "Create a template for logs-*" |
| `index-rollover` | Roll over an index alias | "Rollover current-logs if over 50GB" |
| `index-diff` | Compare mappings between indices | "Diff mappings of logs-v1 and logs-v2" |
| `bulk-index-ops` | Bulk open/close/freeze indices | "Close all indices older than 90 days" |
| `data-stream` | Manage data streams | "List data streams" |

## Admin Tools — OpenSearch

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `admin-opensearch` | Security, alerting, ISM, snapshots, ingest | "List all alerting monitors" |
| `ism-policy` | Manage ISM policies | "Create ISM policy: hot 7d, warm 30d, delete 90d" |
| `anomaly-detection` | Create/manage anomaly detectors | "Create detector for error rate spikes" |
| `snapshot` | Snapshot management | "Take a snapshot to s3-backup" |

## Admin Tools — Elasticsearch

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `admin-elasticsearch` | ILM, Watcher, snapshots, ingest, security | "Show me ILM policies" |

## Utility Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `osd-manage` | Manage local OSD instance | "Restart OSD" |
| `s3-credentials` | AWS S3 credential helper | "Configure S3 access for snapshots" |
| `painless-validator` | Validate Painless scripts | "Check this script for errors" |

---

## Tool Behavior

- **Confirmation required** for destructive operations (delete, reindex, config changes)
- **Streaming feedback** — "Running query on prod-opensearch..." with spinner
- **Result caching** — cluster health is cached briefly to avoid redundant calls
- **Error handling** — errors are explained in plain language with suggested fixes
- **Collapsible output** — long results can be expanded/collapsed in the chat UI

---
title: "Managing Clusters via Chat"
head:
  - - meta
    - property: og:title
      content: "Managing Clusters via Chat — OSD Desktop"
---

# Managing Clusters via Chat

Use natural language to monitor, manage, and troubleshoot OpenSearch and Elasticsearch clusters.

---

## Health Monitoring

### Quick Health Check

```
Is my cluster healthy?
```

The agent returns: status (GREEN/YELLOW/RED), node count, index count, shard allocation, storage, and proactive warnings.

### Node-Level Detail

```
Show me node stats — heap, disk, CPU for each node
```

### Compare Clusters

```
Compare prod-opensearch and staging-elastic
```

Returns a side-by-side table: version, node count, index count, storage, health status.

---

## Index Management

### List and Explore

```
Show me all indices over 1GB, sorted by size
What's the mapping for the logs-2026-04 index?
How many documents are in orders-* ?
```

### Create

```
Create an index called logs-2026-05 with 3 primary shards and 1 replica
```

The agent confirms before creating.

### Reindex

```
Reindex logs-2026-03 into logs-archive, only documents older than 30 days
```

Progress is reported as the task runs.

### Aliases

```
Add alias "current-logs" pointing to logs-2026-05
Remove alias "current-logs" from logs-2026-04
```

### Templates

```
Show me all index templates
Create a template for logs-* with 3 shards, 1 replica, and a timestamp field
```

---

## Security (OpenSearch)

```
List all custom roles
Show me which users have the admin role
Create a read-only role for the analytics team with access to logs-* and metrics-*
```

> Security commands require the OpenSearch Security plugin on the cluster.

---

## Alerting

### OpenSearch

```
Show me all active alerting monitors
Create a monitor that alerts when error rate exceeds 5% in the last 15 minutes
Disable the "disk-space-warning" monitor
```

### Elasticsearch (Watcher)

```
Show me all active Watcher alerts
Create a watch that triggers when disk usage exceeds 85%
```

---

## Snapshots

```
List snapshot repositories
Take a snapshot of prod-opensearch to the s3-backup repository
Show me snapshots from the last 7 days
Restore the logs-2026-03 index from snapshot snap-20260318
```

---

## Ingest Pipelines

```
Show me all ingest pipelines
Create a pipeline that extracts timestamps from the message field and converts to ISO format
Test the pipeline with this sample document: {"message": "2026-04-22 ERROR timeout"}
```

---

## ILM (Elasticsearch)

```
Show me all ILM policies
What's the retention for the logs policy?
Create an ILM policy: 7 days hot, 30 days warm, 90 days delete
```

---

## Anomaly Detection (OpenSearch)

```
List anomaly detection jobs
Create a detector for unusual error rate spikes in logs-*
Start the error-rate-detector
Show me recent anomaly results
```

---

## Multi-Cluster Workflows

### Switch Clusters

```
Switch to staging-elastic
```

All subsequent commands target the new cluster until you switch again.

### Cross-Cluster Operations

```
Compare index count between prod and staging
Check health across all my connections
```

---

## Troubleshooting via Chat

### Diagnose Issues

```
Why is my cluster yellow?
Why do I have unassigned shards?
What's causing high CPU on node data-3?
```

The agent investigates and suggests fixes.

### Fix Issues

```
Add replicas to all indices that have none
Move shards off the hot node to balance storage
```

The agent confirms before making changes.

### Explain Errors

```
I got this error: "rejected execution of coordinating operation"
What does "circuit_breaking_exception" mean and how do I fix it?
```

---

## Tips

- **The agent remembers context** — ask follow-ups without repeating cluster names or index patterns
- **Destructive operations require confirmation** — delete, reindex, and config changes always ask first
- **Use "switch to X" for multi-cluster** — faster than clicking through the connection manager
- **Ask "why"** — the agent can diagnose yellow/red clusters, unassigned shards, and performance issues
- **Export results** — ask the agent to format findings as markdown for reports

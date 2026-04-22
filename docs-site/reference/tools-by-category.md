# Tool Reference — By Category

Detailed reference for all 28 agent tools, organized by category.

---

## Cluster Tools

### cluster-health
Returns cluster status, node count, index count, shard allocation, storage.

```
> Is my cluster healthy?
```
```json
{ "status": "green", "nodes": 6, "indices": 142, "shards": 847, "storage": "2.3TB/8TB" }
```

### cluster-compare
Compares two clusters side-by-side.

```
> Compare prod-opensearch and staging-elastic
```
Returns table: version, node count, index count, storage, health.

### cluster-settings
View or update dynamic cluster settings.

```
> Show me cluster settings
> Set cluster.routing.allocation.enable to all
```

### cluster-reroute
Manually move shards between nodes.

```
> Move shard 3 of logs-2026-04 from node-1 to node-3
```

### hot-threads
Identify CPU-intensive threads on cluster nodes.

```
> What's causing high CPU on my cluster?
```

### cat-api
Run any `_cat` API endpoint.

```
> Show me node allocation
> Show me thread pool stats
```

### task-management
List and cancel running tasks.

```
> Show me running tasks
> Cancel task abc123
```

### multi-cluster-dashboard
Health summary across all configured connections.

```
> Health of all my clusters
```

---

## Index Tools

### index-manage
Create, delete, open, close indices.

```
> Create index test-logs with 3 shards and 1 replica
> Delete the temp-reindex index
> Close all indices older than 90 days
```

### index-template
Manage index templates.

```
> Show me all index templates
> Create a template for logs-* with 3 shards
```

### index-rollover
Roll over an index alias when conditions are met.

```
> Rollover current-logs if over 50GB or 30 days old
```

### index-diff
Compare mappings between two indices.

```
> Diff mappings of logs-v1 and logs-v2
```

### bulk-index-ops
Bulk operations on multiple indices.

```
> Close all indices matching logs-2025-*
> Freeze all indices older than 6 months
```

### data-stream
Manage data streams.

```
> List data streams
> Create data stream for logs
```

---

## Query Tools

### opensearch-query
Run DSL queries against OpenSearch clusters.

```
> Show me all documents where status=500 in the last hour
> Count errors by service in logs-*
```

### elasticsearch-query
Run DSL queries against Elasticsearch clusters.

```
> Show me the top 10 customers by order volume
```

### nl-query
Natural language to query DSL translation.

```
> Find all orders over $1000 from California
```
The agent generates the DSL, shows it (collapsible), and runs it.

### query-profiler
Profile query execution for performance analysis.

```
> Why is this query slow? Profile it.
```

### export-results
Export query results to JSON or CSV.

```
> Export the last query results as CSV
```

---

## Security Tools

### admin-opensearch (security)
Manage OpenSearch Security: roles, users, tenants.

```
> List all custom roles
> Create a read-only role for analytics team with access to logs-*
> Show me which users have admin role
```

### admin-elasticsearch (security)
Manage Elasticsearch native realm: users, API keys, role mappings.

```
> List all API keys
> Create a user with read-only access
```

---

## Alerting Tools

### admin-opensearch (alerting)
Manage OpenSearch alerting monitors and destinations.

```
> Show me all active monitors
> Create a monitor for error rate > 5% in 15 minutes
> Disable the disk-space-warning monitor
```

### admin-elasticsearch (watcher)
Manage Elasticsearch Watcher alerts.

```
> Show me all active watches
> Create a watch for disk usage > 85%
```

---

## Admin Tools

### ism-policy
Manage OpenSearch Index State Management policies.

```
> Create ISM policy: hot 7d, warm 30d, delete 90d
> Show me all ISM policies
```

### anomaly-detection
Manage OpenSearch anomaly detection jobs.

```
> Create a detector for error rate spikes in logs-*
> Start the error-rate-detector
> Show me recent anomaly results
```

### snapshot
Manage snapshot repositories and snapshots.

```
> List snapshot repositories
> Take a snapshot to s3-backup
> Restore logs-2026-03 from snap-20260318
```

### osd-manage
Manage the local OSD instance.

```
> Restart OSD
> Show OSD status
```

### s3-credentials
AWS S3 credential helper for snapshot repositories.

```
> Configure S3 access for the backup repository
```

### painless-validator
Validate Painless scripts before deployment.

```
> Check this Painless script for errors: doc['timestamp'].value.toInstant()
```

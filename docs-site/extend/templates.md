# Community Templates

Ready-to-use MCP servers, skills, and agent personas for OSD Desktop.

---

## MCP Servers

### Filesystem Access

Read and write local files from chat.

```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp config server-filesystem --root ~/data
```

```
> List all JSON files in ~/data/exports
> Read the contents of config.yaml
> Create a file called report.md with today's cluster health summary
```

### GitHub Integration

Browse repos, issues, and PRs.

```bash
osd mcp install @modelcontextprotocol/server-github
# Requires GITHUB_TOKEN environment variable
```

```
> Show me open issues in opensearch-project/dashboards-desktop
> What PRs were merged this week?
> Create an issue titled "Add dark mode support"
```

### PostgreSQL

Query relational databases alongside your search clusters.

```bash
osd mcp install @modelcontextprotocol/server-postgres
osd mcp config server-postgres --connection-string "postgresql://user:pass@localhost/mydb"
```

```
> Show me the top 10 customers by order count from the orders table
> Compare order volume this month vs last month
```

### SQLite

Query local SQLite databases.

```bash
osd mcp install @modelcontextprotocol/server-sqlite
osd mcp config server-sqlite --db-path ~/data/analytics.db
```

---

## Skills

### OpenSearch DBA

Index tuning, shard strategy, and performance analysis.

```bash
osd skill install opensearch-dba
```

```
> Analyze my index settings and suggest optimizations
> What's the ideal shard count for a 500GB index?
> Review my ISM policy for cost optimization
```

### Security Analyst

Threat hunting, log correlation, and audit reports.

```bash
osd skill install security-analyst
```

```
> Find all failed login attempts in the last 48 hours, grouped by source IP
> Correlate failed logins with successful logins from the same IPs
> Generate a security incident report for the last 24 hours
```

---

## Agent Personas

Pre-configured profiles that change the agent's focus and behavior.

### Ops Agent

Cluster operations focus — health monitoring, capacity planning, incident response.

```bash
osd agent switch ops-agent
```

```
> Morning health check — all clusters
> Any capacity concerns for the next 7 days?
> Why is prod-opensearch showing high CPU?
```

### Analyst Agent

Data exploration focus — queries, aggregations, visualizations.

```bash
osd agent switch analyst-agent
```

```
> Show me revenue trends by region for Q1
> What's the average response time by endpoint?
> Find anomalies in the error rate over the last week
```

### Security Agent

Security and compliance focus — audit, access review, threat detection.

```bash
osd agent switch security-agent
```

```
> List all users with admin privileges
> Show me security audit events for the last 24 hours
> Are there any indices without encryption at rest?
```

---

## Building Your Own

See the [Plugin Development Guide](GUIDE-PLUGIN-DEVELOPMENT.md) for:
- How to build a skill (TypeScript package with tools)
- How to build an MCP server (any language, stdio transport)
- How to publish and share with the community

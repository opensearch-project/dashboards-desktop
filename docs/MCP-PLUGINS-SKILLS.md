# MCP, Plugins & Skills Guide

Extend OSD Desktop with MCP servers, plugins, skills, and agent personas.

---

## MCP Servers

MCP (Model Context Protocol) servers add new tools to the agent — filesystem access, GitHub, databases, and more.

### Install

```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp install @modelcontextprotocol/server-github
osd mcp install ./my-custom-server
```

### Configure

```bash
osd mcp config server-filesystem --root ~/projects
osd mcp config server-github enabled true
```

Configuration is stored in `~/.osd/mcp/config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

### Manage

```bash
osd mcp list                  # List servers with status and tool count
osd mcp start <server>        # Start a server
osd mcp stop <server>         # Stop a server
osd mcp restart <server>      # Restart a server
```

### How It Works

- MCP servers run as child processes supervised by the app
- If a server crashes, it auto-restarts with exponential backoff (max 3 retries)
- On app exit, all servers receive SIGTERM → 5s timeout → SIGKILL
- The agent discovers MCP tools alongside built-in tools — no user-visible distinction

### Popular MCP Servers

| Server | What It Does |
|--------|-------------|
| `server-filesystem` | Read/write local files |
| `server-github` | GitHub repos, issues, PRs |
| `server-postgres` | Query PostgreSQL databases |
| `server-sqlite` | Query SQLite databases |

---

## Plugins

Plugins add dashboards, visualizations, and admin features to the GUI.

### Install (CLI)

```bash
osd plugin install opensearch-security-dashboards
osd plugin install ./my-plugin.zip       # From local file
osd plugin list
osd plugin remove <name>
osd plugin enable <name>
osd plugin disable <name>
```

### Install (GUI)

Settings → Plugins → browse available plugins → click Install.

### Sandboxing

Plugins run in `worker_threads` or `child_process` sandboxes. They cannot access the main process, other plugins, or the filesystem outside their scope.

---

## Skills

Skills are TypeScript packages that add capabilities to the agent — specialized prompts, tool bundles, and domain knowledge.

### Install

```bash
osd skill install opensearch-dba          # DBA skill: index tuning, shard strategy
osd skill install security-analyst        # Security: threat hunting queries
osd skill install ./my-skill              # From local path
osd skill list
osd skill remove <name>
```

### Skill Format

Skills are TypeScript packages (not YAML) — testable, type-safe, composable. They export tools, prompts, and configuration via a standard interface.

---

## Agent Personas

Personas are pre-configured agent profiles with specialized system prompts, default tools, and model preferences.

### Switch Personas

```bash
osd agent list                    # See available personas
osd agent current                 # Show active persona
osd agent switch ops-agent        # Cluster operations focus
osd agent switch analyst-agent    # Data analysis focus
osd agent switch security-agent   # Security and audit focus
osd agent switch default          # General purpose
```

In the GUI: use the agent selector in Settings → Skills, or the command palette (Cmd+M).

### What Changes

| Persona | System Prompt | Default Tools | Model Preference |
|---------|--------------|---------------|-----------------|
| default | General assistant | All tools | User's default |
| ops-agent | Cluster operations | cluster-health, admin-* | Fast model |
| analyst-agent | Data exploration | *-query, index-manage | Powerful model |
| security-agent | Security audit | admin-*-security | Powerful model |

---

## File Locations

```
~/.osd/
├── mcp/config.json     # MCP server configuration
├── skills/             # Installed skill packages
├── plugins/            # Installed plugin packages
```

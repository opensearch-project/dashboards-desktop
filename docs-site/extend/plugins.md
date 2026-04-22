# Plugin Development Guide

Build plugins, skills, and MCP servers for OSD Desktop.

---

## Overview

OSD Desktop supports three extension types:

| Type | What It Does | Format | Runs In |
|------|-------------|--------|---------|
| **Plugin** | Adds UI features to OSD | OSD plugin (zip) | `worker_threads` sandbox |
| **Skill** | Adds agent capabilities | TypeScript package | Agent runtime |
| **MCP Server** | Adds tools via MCP protocol | Any language (stdio) | Child process |

---

## Building a Skill

Skills are the easiest way to extend the agent. They're TypeScript packages that export tools, prompts, and configuration.

### Scaffold

```bash
mkdir my-skill && cd my-skill
npm init -y
npm install typescript --save-dev
```

### Define Tools

```typescript
// src/index.ts
import { SkillDefinition, ToolDefinition } from 'osd-desktop/core/types';

const myTool: ToolDefinition = {
  name: 'my-tool',
  description: 'Describe what this tool does — the agent reads this to decide when to use it',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description: 'Max results', default: 10 },
    },
    required: ['query'],
  },
  execute: async (params, context) => {
    // context.connection gives you the active cluster client
    // context.storage gives you SQLite access
    const results = await doSomething(params.query, params.limit);
    return { content: JSON.stringify(results) };
  },
};

export const skill: SkillDefinition = {
  name: 'my-skill',
  description: 'A custom skill for my workflow',
  tools: [myTool],
};
```

### Install and Test

```bash
# Build
npx tsc

# Install locally
osd skill install ./my-skill

# Verify
osd skill list

# Test in chat
osd chat
> Use my-tool to search for "error"
```

### Skill Best Practices

- **Write clear tool descriptions** — the agent uses these to decide when to invoke your tool
- **Return structured data** — JSON or markdown tables render well in chat
- **Handle errors gracefully** — return `{ error: "message" }` instead of throwing
- **Keep tools focused** — one tool per action, not one mega-tool

---

## Building an MCP Server

MCP servers expose tools via the Model Context Protocol. They can be written in any language.

### Minimal Example (TypeScript)

```typescript
// echo-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({ name: 'echo', version: '1.0.0' }, {
  capabilities: { tools: {} },
});

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'echo',
    description: 'Echoes back the input',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  }],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'echo') {
    return { content: [{ type: 'text', text: request.params.arguments.message }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Install and Configure

```bash
# Install
osd mcp install ./echo-server

# Or add to ~/.osd/mcp/config.json manually:
{
  "mcpServers": {
    "echo": {
      "command": "npx",
      "args": ["tsx", "echo-server.ts"]
    }
  }
}

# Verify
osd mcp list
```

### MCP Best Practices

- **Use stdio transport** — OSD Desktop communicates via stdin/stdout
- **Handle errors** — return error responses, don't crash
- **Keep servers lightweight** — they run as child processes alongside the app
- **Test independently** — MCP servers can be tested outside OSD Desktop

---

## Building an OSD Plugin

OSD plugins follow the standard OpenSearch Dashboards plugin format. They run inside the OSD instance that OSD Desktop manages.

### Install Existing Plugins

```bash
osd plugin install opensearch-security-dashboards
osd plugin install ./my-plugin.zip
```

### Plugin Sandboxing

Plugins run in `worker_threads` sandboxes. They cannot:
- Access the main Electron process
- Access other plugins' data
- Access the filesystem outside their scope
- Make network requests outside their declared permissions

### Plugin Lifecycle

1. Install: `osd plugin install <name>`
2. OSD Desktop tracks installed plugins in SQLite
3. On OSD upgrade, plugins are automatically re-installed
4. Remove: `osd plugin remove <name>`

---

## Community Templates

### Sample MCP Server: Filesystem

```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp config server-filesystem --root ~/projects
```

Now the agent can read and write files in your projects directory.

### Sample MCP Server: GitHub

```bash
osd mcp install @modelcontextprotocol/server-github
# Set GITHUB_TOKEN in your environment
```

The agent can browse repos, read issues, and create PRs.

### Sample Skill: DBA

```bash
osd skill install opensearch-dba
```

Adds tools for index tuning, shard strategy, and performance analysis.

### Sample Skill: Security Analyst

```bash
osd skill install security-analyst
```

Adds tools for threat hunting queries, log correlation, and audit reports.

---

## Publishing

### npm

```bash
cd my-skill
npm publish
# Users install with: osd skill install my-skill
```

### GitHub Releases

Attach a `.zip` to a GitHub Release. Users install with:

```bash
osd skill install https://github.com/you/my-skill/releases/download/v1.0/my-skill.zip
```

### Local

```bash
osd skill install ./path/to/my-skill
osd mcp install ./path/to/my-server
osd plugin install ./path/to/my-plugin.zip
```

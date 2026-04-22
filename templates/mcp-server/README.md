# MCP Server Template

Scaffold for building custom MCP (Model Context Protocol) servers for OpenSearch Dashboards Desktop.

## Quick Start

1. Copy this directory: `cp -r templates/mcp-server my-server`
2. Edit `index.js` — add your tools to `TOOLS` array and implement in `callTool()`
3. Test: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node index.js`
4. Install: `osd mcp install my-server --command "node /path/to/my-server/index.js"`
5. Start: `osd mcp start my-server`

## Protocol

MCP servers communicate via JSON-RPC over stdio. Required methods:
- `initialize` — return server info and capabilities
- `tools/list` — return available tools
- `tools/call` — execute a tool and return results

## Tool Schema

```javascript
{
  name: 'my-tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: { param1: { type: 'string', description: 'Description' } },
    required: ['param1'],
  },
}
```

#!/usr/bin/env node
/**
 * Custom MCP Server Template
 *
 * Clone this directory and modify to create your own MCP server.
 * The server communicates via JSON-RPC over stdio.
 *
 * Usage:
 *   osd mcp install my-server --command "node /path/to/index.js"
 *   osd mcp start my-server
 */

const readline = require('readline');

// Define your tools here
const TOOLS = [
  {
    name: 'hello',
    description: 'Says hello to the given name',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Name to greet' } },
      required: ['name'],
    },
  },
  // Add more tools here...
];

// Implement your tool logic here
function callTool(name, args) {
  switch (name) {
    case 'hello':
      return [{ type: 'text', text: `Hello, ${args.name}!` }];
    default:
      return [{ type: 'text', text: `Unknown tool: ${name}` }];
  }
}

// --- MCP Protocol (don't modify below) ---

function handleRequest(req) {
  switch (req.method) {
    case 'initialize':
      return { jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'my-mcp-server', version: '0.1.0' } } };
    case 'tools/list':
      return { jsonrpc: '2.0', id: req.id, result: { tools: TOOLS } };
    case 'tools/call':
      return { jsonrpc: '2.0', id: req.id, result: { content: callTool(req.params.name, req.params.arguments) } };
    default:
      return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Unknown method: ${req.method}` } };
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  try {
    process.stdout.write(JSON.stringify(handleRequest(JSON.parse(line))) + '\n');
  } catch { /* ignore */ }
});

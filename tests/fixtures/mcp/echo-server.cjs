#!/usr/bin/env node
/**
 * Test MCP server for CI — echo + math tools over JSON-RPC stdio.
 * Plain JS — no tsx/ts-node required.
 */

const readline = require('readline');

const TOOLS = [
  {
    name: 'echo',
    description: 'Echoes back the input message',
    inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
  },
  {
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
  },
];

function handleRequest(req) {
  switch (req.method) {
    case 'initialize':
      return { jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'echo-server', version: '0.1.0' } } };
    case 'tools/list':
      return { jsonrpc: '2.0', id: req.id, result: { tools: TOOLS } };
    case 'tools/call': {
      const { name, arguments: args } = req.params;
      const content = name === 'echo' ? [{ type: 'text', text: String(args.message) }]
        : name === 'add' ? [{ type: 'text', text: String(Number(args.a) + Number(args.b)) }]
        : [{ type: 'text', text: `Unknown tool: ${name}` }];
      return { jsonrpc: '2.0', id: req.id, result: { content } };
    }
    default:
      return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Unknown method: ${req.method}` } };
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  try {
    const res = handleRequest(JSON.parse(line));
    process.stdout.write(JSON.stringify(res) + '\n');
  } catch { /* ignore */ }
});

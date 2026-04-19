#!/usr/bin/env node
/**
 * Test MCP server for CI — echo + math tools over JSON-RPC stdio.
 * Usage: node echo-server.js
 */

import * as readline from 'readline';

const TOOLS = [
  {
    name: 'echo',
    description: 'Echoes back the input message',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
  {
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'],
    },
  },
];

function handleRequest(req: { id: number; method: string; params?: Record<string, unknown> }) {
  switch (req.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'echo-server', version: '0.1.0' },
        },
      };

    case 'tools/list':
      return { jsonrpc: '2.0', id: req.id, result: { tools: TOOLS } };

    case 'tools/call': {
      const { name, arguments: args } = req.params as {
        name: string;
        arguments: Record<string, unknown>;
      };
      const content = callTool(name, args);
      return { jsonrpc: '2.0', id: req.id, result: { content } };
    }

    default:
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: `Unknown method: ${req.method}` },
      };
  }
}

function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'echo':
      return [{ type: 'text', text: String(args.message) }];
    case 'add':
      return [{ type: 'text', text: String(Number(args.a) + Number(args.b)) }];
    default:
      return [{ type: 'text', text: `Unknown tool: ${name}` }];
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  try {
    const req = JSON.parse(line);
    const res = handleRequest(req);
    process.stdout.write(JSON.stringify(res) + '\n');
  } catch {
    /* ignore malformed input */
  }
});

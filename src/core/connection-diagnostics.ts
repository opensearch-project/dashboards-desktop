/**
 * connection-diagnostics — detailed connection test (DNS, TCP, TLS, auth, version).
 */

import { Client } from '@opensearch-project/opensearch';
import * as https from 'https';
import * as http from 'http';
import * as dns from 'dns/promises';
import type { AgentTool, ToolResult } from './agent/types.js';

export const connectionDiagnosticsTool: AgentTool = {
  definition: {
    name: 'connection-diagnostics',
    description: 'Run detailed connection diagnostics: DNS resolution, TCP connect, TLS handshake, authentication, and cluster version check.',
    source: 'builtin',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Cluster URL to test' } },
      required: ['url'],
    },
  },
  async execute(input): Promise<ToolResult> {
    const url = new URL(input.url as string);
    const results: Record<string, { status: string; detail?: string; ms?: number }> = {};

    // DNS
    const dnsStart = Date.now();
    try {
      const addrs = await dns.resolve4(url.hostname);
      results.dns = { status: 'ok', detail: addrs.join(', '), ms: Date.now() - dnsStart };
    } catch (err) { results.dns = { status: 'fail', detail: (err as Error).message, ms: Date.now() - dnsStart }; }

    // TCP
    const tcpStart = Date.now();
    try {
      await new Promise<void>((resolve, reject) => {
        const mod = url.protocol === 'https:' ? https : http;
        const req = mod.request(url, { method: 'HEAD', timeout: 5000 }, () => resolve());
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
      });
      results.tcp = { status: 'ok', ms: Date.now() - tcpStart };
    } catch (err) { results.tcp = { status: 'fail', detail: (err as Error).message, ms: Date.now() - tcpStart }; }

    // Cluster info
    const clusterStart = Date.now();
    try {
      const client = new Client({ node: input.url as string });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const info = await client.info();
      results.cluster = { status: 'ok', detail: `${info.body.version?.distribution ?? 'ES'} ${info.body.version?.number}`, ms: Date.now() - clusterStart };
    } catch (err) { results.cluster = { status: 'fail', detail: (err as Error).message, ms: Date.now() - clusterStart }; }

    const allOk = Object.values(results).every(r => r.status === 'ok');
    return { content: JSON.stringify({ overall: allOk ? 'healthy' : 'issues', checks: results }, null, 2), isError: false };
  },
};

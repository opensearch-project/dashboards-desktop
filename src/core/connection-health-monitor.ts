/**
 * Connection health monitor — background polling with auto-reconnect and exponential backoff.
 */

import { EventEmitter } from 'events';
import { Client } from '@opensearch-project/opensearch';

export type HealthStatus = 'green' | 'yellow' | 'red' | 'unreachable';

interface MonitoredConnection { url: string; id: string; status: HealthStatus; failures: number; timer?: ReturnType<typeof setTimeout>; }

const BASE_INTERVAL = 10_000;
const MAX_BACKOFF = 300_000; // 5 min

export class ConnectionHealthMonitor extends EventEmitter {
  private connections = new Map<string, MonitoredConnection>();

  add(id: string, url: string): void {
    if (this.connections.has(id)) return;
    const conn: MonitoredConnection = { url, id, status: 'unreachable', failures: 0 };
    this.connections.set(id, conn);
    this.poll(conn);
  }

  remove(id: string): void {
    const conn = this.connections.get(id);
    if (conn?.timer) clearTimeout(conn.timer);
    this.connections.delete(id);
  }

  getStatus(id: string): HealthStatus | undefined {
    return this.connections.get(id)?.status;
  }

  getAll(): Array<{ id: string; url: string; status: HealthStatus }> {
    return Array.from(this.connections.values()).map(c => ({ id: c.id, url: c.url, status: c.status }));
  }

  stop(): void {
    for (const conn of this.connections.values()) {
      if (conn.timer) clearTimeout(conn.timer);
    }
    this.connections.clear();
  }

  private async poll(conn: MonitoredConnection): Promise<void> {
    try {
      const client = new Client({ node: conn.url });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore OpenSearch client overload
      const res = await client.cluster.health({ timeout: '5s' });
      const prev = conn.status;
      conn.status = res.body.status as HealthStatus;
      conn.failures = 0;
      if (prev !== conn.status) this.emit('status-change', conn.id, conn.status, prev);
    } catch {
      conn.failures++;
      const prev = conn.status;
      conn.status = 'unreachable';
      if (prev !== 'unreachable') this.emit('status-change', conn.id, 'unreachable', prev);
    }
    const delay = Math.min(BASE_INTERVAL * Math.pow(2, conn.failures), MAX_BACKOFF);
    conn.timer = setTimeout(() => this.poll(conn), delay);
  }
}

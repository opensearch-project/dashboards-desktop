/**
 * Connection pool — reuse OpenSearch HTTP clients, configurable pool size.
 */

import { Client } from '@opensearch-project/opensearch';

interface PoolEntry { client: Client; lastUsed: number; }

export class ConnectionPool {
  private pools = new Map<string, PoolEntry>();
  private maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  get(url: string, opts?: Record<string, unknown>): Client {
    const entry = this.pools.get(url);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.client;
    }
    // Evict oldest if at capacity
    if (this.pools.size >= this.maxSize) {
      let oldest = '';
      let oldestTime = Infinity;
      for (const [k, v] of this.pools) {
        if (v.lastUsed < oldestTime) { oldest = k; oldestTime = v.lastUsed; }
      }
      if (oldest) { this.pools.get(oldest)?.client.close(); this.pools.delete(oldest); }
    }
    const client = new Client({ node: url, ...opts });
    this.pools.set(url, { client, lastUsed: Date.now() });
    return client;
  }

  remove(url: string): void {
    this.pools.get(url)?.client.close();
    this.pools.delete(url);
  }

  size(): number { return this.pools.size; }

  close(): void {
    for (const entry of this.pools.values()) entry.client.close();
    this.pools.clear();
  }
}

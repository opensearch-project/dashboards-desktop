/**
 * Client factory — creates the right client type based on connection config.
 * Returns a unified interface regardless of OpenSearch vs Elasticsearch.
 */

import { Client as OSClient } from '@opensearch-project/opensearch';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

export interface UnifiedClient {
  type: 'opensearch' | 'elasticsearch';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  info(): Promise<{ cluster_name: string; version: string }>;
  search(index: string, body: Record<string, unknown>): Promise<unknown>;
  clusterHealth(): Promise<unknown>;
}

interface ConnectionConfig {
  url: string;
  type: 'opensearch' | 'elasticsearch';
  auth_type: string;
  username?: string;
  password?: string;
  api_key?: string;
  region?: string;
}

export function createClient(config: ConnectionConfig): UnifiedClient {
  if (config.type === 'opensearch') {
    return createOSClient(config);
  }
  return createESClient(config);
}

function createOSClient(config: ConnectionConfig): UnifiedClient {
  const opts: Record<string, unknown> = { node: config.url };
  if (config.auth_type === 'basic' && config.username && config.password) {
    opts.auth = { username: config.username, password: config.password };
  }
  const client = new OSClient(opts);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  return {
    type: 'opensearch',
    raw: client,
    async info() {
      const res = await c.info();
      return { cluster_name: res.body.cluster_name, version: res.body.version?.number };
    },
    async search(index, body) {
      const res = await c.search({ index, body });
      return res.body;
    },
    async clusterHealth() {
      const res = await c.cluster.health();
      return res.body;
    },
  };
}

function createESClient(config: ConnectionConfig): UnifiedClient {
  const opts: Record<string, unknown> = { node: config.url };
  if (config.auth_type === 'basic' && config.username && config.password) {
    opts.auth = { username: config.username, password: config.password };
  } else if (config.auth_type === 'apikey' && config.api_key) {
    opts.auth = { apiKey: config.api_key };
  }
  const client = new ElasticsearchClient(
    opts as ConstructorParameters<typeof ElasticsearchClient>[0],
  );

  return {
    type: 'elasticsearch',
    raw: client,
    async info() {
      const res = await client.info();
      return { cluster_name: res.cluster_name, version: res.version?.number };
    },
    async search(index, body) {
      return client.search({ index, ...body });
    },
    async clusterHealth() {
      return client.cluster.health();
    },
  };
}

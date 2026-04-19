/**
 * Connection manager — test connectivity and manage credentials.
 *
 * Supports OpenSearch and Elasticsearch via their native JS clients.
 * All cluster communication runs in the main process (clients are Node-only).
 */

import { safeStorage } from 'electron';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { ConnectionInput, ConnectionTestResult } from './types';

// ---------------------------------------------------------------------------
// Credential encryption (via Electron safeStorage)
// ---------------------------------------------------------------------------

export function encryptCredential(value: string): Buffer {
  return safeStorage.encryptString(value);
}

export function decryptCredential(encrypted: Buffer): string {
  return safeStorage.decryptString(encrypted);
}

// ---------------------------------------------------------------------------
// Connection testing
// ---------------------------------------------------------------------------

interface TestOptions {
  timeoutMs?: number;
}

export async function testConnection(
  input: ConnectionInput,
  options?: TestOptions
): Promise<ConnectionTestResult> {
  try {
    if (input.type === 'opensearch') {
      return await testOpenSearch(input, options);
    } else {
      return await testElasticsearch(input, options);
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testOpenSearch(
  input: ConnectionInput,
  options?: TestOptions
): Promise<ConnectionTestResult> {
  const opts: Record<string, unknown> = { node: input.url };

  if (input.auth_type === 'basic' && input.username && input.password) {
    opts.auth = { username: input.username, password: input.password };
  }
  if (options?.timeoutMs) {
    opts.requestTimeout = options.timeoutMs;
  }

  const client = new OpenSearchClient(opts);
  const info = await client.info();
  const body = info.body;
  return {
    success: true,
    cluster_name: body.cluster_name,
    version: body.version?.number,
  };
}

async function testElasticsearch(
  input: ConnectionInput,
  options?: TestOptions
): Promise<ConnectionTestResult> {
  const opts: Record<string, unknown> = { node: input.url };

  if (input.auth_type === 'basic' && input.username && input.password) {
    opts.auth = { username: input.username, password: input.password };
  } else if (input.auth_type === 'apikey' && input.api_key) {
    opts.auth = { apiKey: input.api_key };
  }
  if (options?.timeoutMs) {
    opts.requestTimeout = options.timeoutMs;
  }

  const client = new ElasticsearchClient(opts as ConstructorParameters<typeof ElasticsearchClient>[0]);
  const info = await client.info();
  return {
    success: true,
    cluster_name: info.cluster_name,
    version: info.version?.number,
  };
}

/**
 * OpenSearch Index State Management (ISM) admin.
 * Uses the _plugins/_ism REST API.
 */

import { Client } from '@opensearch-project/opensearch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResult = any;

async function api(url: string, method: string, path: string, body?: unknown): Promise<ApiResult> {
  const c = new Client({ node: url });
  const res = await c.transport.request({ method, path, body } as Parameters<
    typeof c.transport.request
  >[0]);
  return (res as ApiResult).body ?? res;
}

export async function listPolicies(url: string) {
  return api(url, 'GET', '/_plugins/_ism/policies');
}

export async function getPolicy(url: string, id: string) {
  return api(url, 'GET', `/_plugins/_ism/policies/${id}`);
}

export async function createPolicy(url: string, id: string, body: Record<string, unknown>) {
  return api(url, 'PUT', `/_plugins/_ism/policies/${id}`, body);
}

export async function deletePolicy(url: string, id: string) {
  return api(url, 'DELETE', `/_plugins/_ism/policies/${id}`);
}

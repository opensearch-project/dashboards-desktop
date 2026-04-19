/**
 * Elasticsearch Index Lifecycle Management (ILM) admin.
 */

import { Client } from '@elastic/elasticsearch';

function client(url: string): Client { return new Client({ node: url }); }

export async function listPolicies(url: string) {
  return client(url).ilm.getLifecycle();
}

export async function getPolicy(url: string, name: string) {
  return client(url).ilm.getLifecycle({ name });
}

export async function createPolicy(url: string, name: string, body: Record<string, unknown>) {
  return client(url).ilm.putLifecycle({ name, body });
}

export async function deletePolicy(url: string, name: string) {
  return client(url).ilm.deleteLifecycle({ name });
}

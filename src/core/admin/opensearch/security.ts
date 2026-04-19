/**
 * OpenSearch Security plugin admin — roles, users, tenants.
 * Uses the _plugins/_security REST API.
 */

import { Client } from '@opensearch-project/opensearch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResult = any;

function client(url: string): Client { return new Client({ node: url }); }

async function api(url: string, method: string, path: string, body?: unknown): Promise<ApiResult> {
  const c = client(url);
  const res = await c.transport.request({ method, path, body } as Parameters<typeof c.transport.request>[0]);
  return (res as ApiResult).body ?? res;
}

export async function listRoles(url: string) {
  return api(url, 'GET', '/_plugins/_security/api/roles');
}

export async function getRole(url: string, name: string) {
  return api(url, 'GET', `/_plugins/_security/api/roles/${name}`);
}

export async function createRole(url: string, name: string, body: Record<string, unknown>) {
  return api(url, 'PUT', `/_plugins/_security/api/roles/${name}`, body);
}

export async function deleteRole(url: string, name: string) {
  return api(url, 'DELETE', `/_plugins/_security/api/roles/${name}`);
}

export async function listUsers(url: string) {
  return api(url, 'GET', '/_plugins/_security/api/internalusers');
}

export async function createUser(url: string, name: string, body: Record<string, unknown>) {
  return api(url, 'PUT', `/_plugins/_security/api/internalusers/${name}`, body);
}

export async function deleteUser(url: string, name: string) {
  return api(url, 'DELETE', `/_plugins/_security/api/internalusers/${name}`);
}

export async function listTenants(url: string) {
  return api(url, 'GET', '/_plugins/_security/api/tenants');
}

export async function createTenant(url: string, name: string, body: Record<string, unknown>) {
  return api(url, 'PUT', `/_plugins/_security/api/tenants/${name}`, body);
}

export async function deleteTenant(url: string, name: string) {
  return api(url, 'DELETE', `/_plugins/_security/api/tenants/${name}`);
}

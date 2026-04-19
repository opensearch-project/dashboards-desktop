/**
 * Elasticsearch security admin — users, roles, API keys.
 */

import { Client } from '@elastic/elasticsearch';

function client(url: string): Client {
  return new Client({ node: url });
}

export async function listUsers(url: string) {
  return client(url).security.getUser();
}

export async function createUser(url: string, username: string, body: Record<string, unknown>) {
  return client(url).security.putUser({ username, ...body });
}

export async function deleteUser(url: string, username: string) {
  return client(url).security.deleteUser({ username });
}

export async function listRoles(url: string) {
  return client(url).security.getRole();
}

export async function createRole(url: string, name: string, body: Record<string, unknown>) {
  return client(url).security.putRole({ name, ...body });
}

export async function deleteRole(url: string, name: string) {
  return client(url).security.deleteRole({ name });
}

export async function listApiKeys(url: string) {
  return client(url).security.getApiKey();
}

export async function createApiKey(url: string, body: Record<string, unknown>) {
  return client(url).security.createApiKey(body);
}

export async function invalidateApiKey(url: string, ids: string[]) {
  return client(url).security.invalidateApiKey({ ids });
}

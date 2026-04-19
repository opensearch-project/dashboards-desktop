/**
 * Elasticsearch snapshot/restore admin.
 */

import { Client } from '@elastic/elasticsearch';

function client(url: string): Client {
  return new Client({ node: url });
}

export async function listRepos(url: string) {
  return client(url).snapshot.getRepository({ name: '_all' });
}

export async function listSnapshots(url: string, repo: string) {
  return client(url).snapshot.get({ repository: repo, snapshot: '_all' });
}

export async function createSnapshot(
  url: string,
  repo: string,
  name: string,
  body?: Record<string, unknown>,
) {
  return client(url).snapshot.create({ repository: repo, snapshot: name, ...body });
}

export async function restoreSnapshot(
  url: string,
  repo: string,
  name: string,
  body?: Record<string, unknown>,
) {
  return client(url).snapshot.restore({ repository: repo, snapshot: name, ...body });
}

export async function deleteSnapshot(url: string, repo: string, name: string) {
  return client(url).snapshot.delete({ repository: repo, snapshot: name });
}

/**
 * OpenSearch snapshot/restore admin.
 */

import { Client } from '@opensearch-project/opensearch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any;

function client(url: string): C { return new Client({ node: url }); }

export async function listRepos(url: string) {
  const res = await client(url).snapshot.getRepository({ repository: '_all' });
  return res.body;
}

export async function listSnapshots(url: string, repo: string) {
  const res = await client(url).snapshot.get({ repository: repo, snapshot: '_all' });
  return res.body;
}

export async function createSnapshot(url: string, repo: string, name: string, body?: Record<string, unknown>) {
  const res = await client(url).snapshot.create({ repository: repo, snapshot: name, body });
  return res.body;
}

export async function restoreSnapshot(url: string, repo: string, name: string, body?: Record<string, unknown>) {
  const res = await client(url).snapshot.restore({ repository: repo, snapshot: name, body });
  return res.body;
}

export async function deleteSnapshot(url: string, repo: string, name: string) {
  const res = await client(url).snapshot.delete({ repository: repo, snapshot: name });
  return res.body;
}

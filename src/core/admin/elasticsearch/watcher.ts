/**
 * Elasticsearch Watcher admin — watches (alerts).
 */

import { Client } from '@elastic/elasticsearch';

function client(url: string): Client {
  return new Client({ node: url });
}

export async function listWatches(url: string) {
  return client(url).watcher.queryWatches();
}

export async function getWatch(url: string, id: string) {
  return client(url).watcher.getWatch({ id });
}

export async function createWatch(url: string, id: string, body: Record<string, unknown>) {
  return client(url).watcher.putWatch({ id, body });
}

export async function deleteWatch(url: string, id: string) {
  return client(url).watcher.deleteWatch({ id });
}

export async function activateWatch(url: string, id: string) {
  return client(url).watcher.activateWatch({ watch_id: id });
}

export async function deactivateWatch(url: string, id: string) {
  return client(url).watcher.deactivateWatch({ watch_id: id });
}

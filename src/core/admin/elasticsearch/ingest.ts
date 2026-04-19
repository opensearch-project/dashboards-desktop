/**
 * Elasticsearch ingest pipeline admin.
 */

import { Client } from '@elastic/elasticsearch';

function client(url: string): Client {
  return new Client({ node: url });
}

export async function listPipelines(url: string) {
  return client(url).ingest.getPipeline();
}

export async function getPipeline(url: string, id: string) {
  return client(url).ingest.getPipeline({ id });
}

export async function createPipeline(url: string, id: string, body: Record<string, unknown>) {
  return client(url).ingest.putPipeline({ id, ...body });
}

export async function deletePipeline(url: string, id: string) {
  return client(url).ingest.deletePipeline({ id });
}

/**
 * OpenSearch ingest pipeline admin.
 */

import { Client } from '@opensearch-project/opensearch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any;

function client(url: string): C { return new Client({ node: url }); }

export async function listPipelines(url: string) {
  const res = await client(url).ingest.getPipeline();
  return res.body;
}

export async function getPipeline(url: string, id: string) {
  const res = await client(url).ingest.getPipeline({ id });
  return res.body;
}

export async function createPipeline(url: string, id: string, body: Record<string, unknown>) {
  const res = await client(url).ingest.putPipeline({ id, body });
  return res.body;
}

export async function deletePipeline(url: string, id: string) {
  const res = await client(url).ingest.deletePipeline({ id });
  return res.body;
}

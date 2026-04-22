/**
 * Query timeout — configurable per-connection, cancel support, progress tracking.
 */

import { Client } from '@opensearch-project/opensearch';

export interface QueryOptions {
  index: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function executeWithTimeout(url: string, opts: QueryOptions): Promise<{ body: unknown; durationMs: number; cancelled: boolean }> {
  const client = new Client({ node: url, requestTimeout: opts.timeoutMs ?? 30_000 });
  const start = Date.now();
  const controller = new AbortController();

  if (opts.signal) {
    opts.signal.addEventListener('abort', () => controller.abort());
  }

  const timer = opts.timeoutMs ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore OpenSearch client overload
    const res = await client.search({ index: opts.index, body: opts.body }, { signal: controller.signal });
    return { body: res.body, durationMs: Date.now() - start, cancelled: false };
  } catch (err) {
    if (controller.signal.aborted) return { body: null, durationMs: Date.now() - start, cancelled: true };
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

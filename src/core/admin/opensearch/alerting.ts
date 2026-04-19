/**
 * OpenSearch Alerting plugin admin — monitors and destinations.
 * Uses the _plugins/_alerting REST API.
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

export async function listMonitors(url: string) {
  return api(url, 'POST', '/_plugins/_alerting/monitors/_search', { query: { match_all: {} } });
}

export async function getMonitor(url: string, id: string) {
  return api(url, 'GET', `/_plugins/_alerting/monitors/${id}`);
}

export async function createMonitor(url: string, body: Record<string, unknown>) {
  return api(url, 'POST', '/_plugins/_alerting/monitors', body);
}

export async function updateMonitor(url: string, id: string, body: Record<string, unknown>) {
  return api(url, 'PUT', `/_plugins/_alerting/monitors/${id}`, body);
}

export async function deleteMonitor(url: string, id: string) {
  return api(url, 'DELETE', `/_plugins/_alerting/monitors/${id}`);
}

export async function listDestinations(url: string) {
  return api(url, 'GET', '/_plugins/_alerting/destinations');
}

export async function createDestination(url: string, body: Record<string, unknown>) {
  return api(url, 'POST', '/_plugins/_alerting/destinations', body);
}

export async function deleteDestination(url: string, id: string) {
  return api(url, 'DELETE', `/_plugins/_alerting/destinations/${id}`);
}

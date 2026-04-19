/** Mock OpenSearch cluster responses for testing */

export const OPENSEARCH_ROOT = {
  name: 'test-node-1',
  cluster_name: 'test-cluster',
  cluster_uuid: 'abc123',
  version: { number: '2.12.0', distribution: 'opensearch' },
  tagline: 'The OpenSearch Project: https://opensearch.org/',
};

export const OPENSEARCH_CLUSTER_HEALTH = {
  cluster_name: 'test-cluster',
  status: 'green',
  timed_out: false,
  number_of_nodes: 3,
  number_of_data_nodes: 2,
  active_primary_shards: 24,
  active_shards: 48,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 0,
};

export const OPENSEARCH_INDICES = [
  { index: 'logs-2026.04', health: 'green', status: 'open', pri: '5', rep: '1', 'docs.count': '1000000', 'store.size': '512mb' },
  { index: 'metrics-2026.04', health: 'green', status: 'open', pri: '3', rep: '1', 'docs.count': '500000', 'store.size': '256mb' },
];

export const OPENSEARCH_SEARCH_RESULT = {
  took: 5,
  timed_out: false,
  _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
  hits: {
    total: { value: 42, relation: 'eq' },
    max_score: 1.0,
    hits: [
      { _index: 'logs-2026.04', _id: '1', _score: 1.0, _source: { message: 'test log entry', level: 'info', timestamp: '2026-04-19T00:00:00Z' } },
    ],
  },
};

/** Mock Elasticsearch cluster responses for testing */

export const ELASTICSEARCH_ROOT = {
  name: 'es-node-1',
  cluster_name: 'es-cluster',
  cluster_uuid: 'def456',
  version: { number: '8.17.0', build_flavor: 'default', build_type: 'docker' },
  tagline: 'You Know, for Search',
};

export const ELASTICSEARCH_CLUSTER_HEALTH = {
  cluster_name: 'es-cluster',
  status: 'green',
  timed_out: false,
  number_of_nodes: 3,
  number_of_data_nodes: 2,
  active_primary_shards: 18,
  active_shards: 36,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 0,
};

export const ELASTICSEARCH_INDICES = [
  { index: 'app-logs', health: 'green', status: 'open', pri: '3', rep: '1', 'docs.count': '750000', 'store.size': '384mb' },
];

export const ELASTICSEARCH_SEARCH_RESULT = {
  took: 3,
  timed_out: false,
  _shards: { total: 3, successful: 3, skipped: 0, failed: 0 },
  hits: {
    total: { value: 10, relation: 'eq' },
    max_score: 1.0,
    hits: [
      { _index: 'app-logs', _id: '1', _score: 1.0, _source: { message: 'request completed', status: 200, timestamp: '2026-04-19T00:00:00Z' } },
    ],
  },
};

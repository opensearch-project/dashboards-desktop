/**
 * Error explanation — auto-explain cluster errors and suggest fixes.
 */

interface ErrorExplanation { error: string; explanation: string; suggestion: string }

const PATTERNS: Array<{ pattern: RegExp; explanation: string; suggestion: string }> = [
  { pattern: /index_not_found_exception/i, explanation: 'The specified index does not exist.', suggestion: 'Check the index name for typos, or create the index first.' },
  { pattern: /cluster_block_exception.*read.only/i, explanation: 'Cluster is in read-only mode, usually due to low disk space.', suggestion: 'Free disk space, then run: PUT _cluster/settings {"transient":{"cluster.blocks.read_only_allow_delete":null}}' },
  { pattern: /circuit_breaking_exception/i, explanation: 'Request exceeded memory circuit breaker limit.', suggestion: 'Reduce query size, add pagination, or increase circuit breaker limits.' },
  { pattern: /search_phase_execution_exception/i, explanation: 'Query execution failed on one or more shards.', suggestion: 'Check shard health and query syntax. Some shards may be unavailable.' },
  { pattern: /mapper_parsing_exception/i, explanation: 'Document field type doesn\'t match the index mapping.', suggestion: 'Check the field types in your mapping vs the document being indexed.' },
  { pattern: /resource_already_exists_exception/i, explanation: 'The resource (index, alias, template) already exists.', suggestion: 'Use a different name, or delete the existing resource first.' },
  { pattern: /authentication_exception|security_exception/i, explanation: 'Authentication or authorization failed.', suggestion: 'Check credentials, roles, and permissions for the current user.' },
  { pattern: /connection refused|ECONNREFUSED/i, explanation: 'Cannot connect to the cluster.', suggestion: 'Verify the cluster URL, check if the cluster is running, and check network/firewall.' },
  { pattern: /timeout|timed out/i, explanation: 'Request timed out waiting for a response.', suggestion: 'The cluster may be overloaded. Try a simpler query or increase timeout.' },
];

export function explainError(errorText: string): ErrorExplanation | null {
  for (const { pattern, explanation, suggestion } of PATTERNS) {
    if (pattern.test(errorText)) {
      return { error: errorText.slice(0, 200), explanation, suggestion };
    }
  }
  return null;
}

export function formatExplanation(e: ErrorExplanation): string {
  return `**Error**: ${e.error}\n**What happened**: ${e.explanation}\n**Suggested fix**: ${e.suggestion}`;
}

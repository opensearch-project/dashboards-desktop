/**
 * Tool recommender — suggests relevant tools based on conversation context.
 * Keyword-based matching against tool descriptions and names.
 */

import type { ToolDefinition } from './types';

interface Recommendation { tool: ToolDefinition; score: number; reason: string }

const KEYWORD_MAP: Record<string, string[]> = {
  'opensearch-query': ['search', 'query', 'find', 'count', 'aggregate', 'dsl', 'match', 'filter'],
  'elasticsearch-query': ['elastic', 'es', 'kibana', 'query', 'search'],
  'cluster-health': ['health', 'status', 'cluster', 'node', 'shard', 'red', 'yellow', 'green'],
  'index-manage': ['index', 'create', 'delete', 'reindex', 'alias', 'mapping', 'template'],
  'admin-opensearch': ['security', 'role', 'user', 'alert', 'monitor', 'ism', 'snapshot', 'ingest'],
  'admin-elasticsearch': ['ilm', 'watcher', 'snapshot', 'ingest', 'security', 'role'],
  'osd-manage': ['restart', 'plugin', 'install', 'dashboards', 'osd', 'status'],
};

export function recommendTools(message: string, availableTools: ToolDefinition[], limit = 3): Recommendation[] {
  const lower = message.toLowerCase();
  const scored: Recommendation[] = [];

  for (const tool of availableTools) {
    let score = 0;
    const reasons: string[] = [];

    // Keyword matching from map
    const keywords = KEYWORD_MAP[tool.name] ?? [];
    for (const kw of keywords) {
      if (lower.includes(kw)) { score += 2; reasons.push(kw); }
    }

    // Match against tool description
    const descWords = (tool.description ?? '').toLowerCase().split(/\s+/);
    for (const word of lower.split(/\s+/)) {
      if (word.length > 3 && descWords.includes(word)) { score += 1; }
    }

    // Match tool name directly
    if (lower.includes(tool.name)) { score += 5; reasons.push('direct match'); }

    if (score > 0) {
      scored.push({ tool, score, reason: reasons.slice(0, 3).join(', ') || 'context match' });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

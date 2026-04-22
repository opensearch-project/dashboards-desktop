/**
 * Context-aware suggestions — proactive prompts based on app state.
 */

export interface Suggestion { id: string; text: string; prompt: string }

type AppState = {
  hasConnection: boolean;
  clusterHealth?: 'green' | 'yellow' | 'red';
  indexCount?: number;
  lastAction?: string;
};

export function getSuggestions(state: AppState): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (state.hasConnection && !state.lastAction) {
    suggestions.push(
      { id: 'check-health', text: '🔍 Check cluster health', prompt: 'Check my cluster health and report any issues.' },
      { id: 'view-indices', text: '📋 View indices', prompt: 'List all my indices with their sizes and document counts.' },
    );
  }
  if (state.clusterHealth === 'red') {
    suggestions.push({ id: 'diagnose-red', text: '🚨 Diagnose red cluster', prompt: 'My cluster is red. Diagnose the issue and suggest a fix.' });
  }
  if (state.clusterHealth === 'yellow') {
    suggestions.push({ id: 'fix-yellow', text: '⚠️ Fix yellow status', prompt: 'My cluster is yellow. Check unassigned shards and suggest how to fix.' });
  }
  if (state.lastAction === 'connect') {
    suggestions.push(
      { id: 'post-connect-health', text: '🔍 Check health', prompt: 'Check the health of my newly connected cluster.' },
      { id: 'post-connect-overview', text: '📊 Cluster overview', prompt: 'Give me an overview of this cluster: version, nodes, indices, disk usage.' },
    );
  }

  return suggestions.slice(0, 3);
}

/**
 * Multi-turn tool chain planner — agent plans multi-step workflows.
 * Example: check health → identify issue → suggest fix.
 */

export interface ToolStep {
  tool: string;
  input: Record<string, unknown>;
  description: string;
  dependsOn?: number; // index of prior step whose output feeds this input
}

export interface ToolChain {
  name: string;
  description: string;
  steps: ToolStep[];
}

/** Pre-built chains for common diagnostic workflows */
export const BUILTIN_CHAINS: ToolChain[] = [
  {
    name: 'diagnose-cluster',
    description: 'Full cluster diagnostic: health → nodes → hot threads',
    steps: [
      { tool: 'cluster-health', input: {}, description: 'Check cluster health status' },
      { tool: 'cluster-health', input: { detail: 'nodes' }, description: 'List node details' },
      { tool: 'opensearch-query', input: { method: 'GET', path: '/_nodes/hot_threads' }, description: 'Check hot threads for bottlenecks' },
    ],
  },
  {
    name: 'index-audit',
    description: 'Audit indices: list → check sizes → identify problems',
    steps: [
      { tool: 'index-manage', input: { action: 'list' }, description: 'List all indices with sizes' },
      { tool: 'cluster-health', input: { detail: 'shards' }, description: 'Check shard allocation' },
    ],
  },
];

/**
 * Build a system prompt that instructs the agent to execute a chain.
 */
export function chainToPrompt(chain: ToolChain): string {
  const steps = chain.steps.map((s, i) => `${i + 1}. Use tool "${s.tool}" — ${s.description}`).join('\n');
  return `Execute this multi-step workflow:\n${steps}\n\nAfter each step, analyze the result before proceeding. If you find an issue, explain it and suggest a fix.`;
}

export function getChain(name: string): ToolChain | undefined {
  return BUILTIN_CHAINS.find((c) => c.name === name);
}

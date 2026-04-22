/**
 * Agent handoff — suggest switching persona when current one can't help.
 */

const HANDOFF_RULES: Array<{ from: string; keywords: string[]; to: string; reason: string }> = [
  { from: 'ops-agent', keywords: ['query', 'search', 'aggregate', 'dsl', 'sql'], to: 'analyst-agent', reason: 'This looks like a data query — the analyst agent is better suited.' },
  { from: 'ops-agent', keywords: ['role', 'user', 'permission', 'tenant', 'audit'], to: 'security-agent', reason: 'This is a security question — switching to the security agent.' },
  { from: 'analyst-agent', keywords: ['health', 'shard', 'node', 'restart', 'slow', 'down'], to: 'ops-agent', reason: 'This is an operational issue — the ops agent can help.' },
  { from: 'analyst-agent', keywords: ['role', 'permission', 'security', 'access'], to: 'security-agent', reason: 'This is a security question — switching to the security agent.' },
  { from: 'security-agent', keywords: ['query', 'search', 'aggregate', 'count'], to: 'analyst-agent', reason: 'This looks like a data query — the analyst agent is better suited.' },
  { from: 'security-agent', keywords: ['health', 'shard', 'restart', 'performance'], to: 'ops-agent', reason: 'This is an operational issue — the ops agent can help.' },
];

export interface HandoffSuggestion { to: string; reason: string }

export function checkHandoff(currentPersona: string, message: string): HandoffSuggestion | null {
  const lower = message.toLowerCase();
  for (const rule of HANDOFF_RULES) {
    if (rule.from !== currentPersona) continue;
    const matches = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (matches >= 2) return { to: rule.to, reason: rule.reason };
  }
  return null;
}

/**
 * Guardrails — block destructive operations without explicit user confirmation.
 */

const DESTRUCTIVE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /delete.*index|drop.*index/i, description: 'Delete index' },
  { pattern: /delete.*template/i, description: 'Delete index template' },
  { pattern: /reindex/i, description: 'Reindex (may overwrite data)' },
  { pattern: /_cluster\/settings.*allocation.*none/i, description: 'Disable shard allocation' },
  { pattern: /close.*index/i, description: 'Close index' },
  { pattern: /_snapshot.*delete/i, description: 'Delete snapshot' },
  { pattern: /delete.*role|delete.*user/i, description: 'Delete security principal' },
  { pattern: /factory.?reset/i, description: 'Factory reset' },
];

export interface GuardrailCheck {
  blocked: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

export function checkGuardrails(toolName: string, input: Record<string, unknown>): GuardrailCheck {
  const serialized = JSON.stringify(input).toLowerCase();
  const combined = `${toolName} ${serialized}`;

  for (const { pattern, description } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(combined)) {
      return { blocked: false, requiresConfirmation: true, reason: `Destructive operation: ${description}` };
    }
  }
  return { blocked: false, requiresConfirmation: false };
}

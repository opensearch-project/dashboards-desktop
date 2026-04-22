/**
 * Compliance mode — force local-only models, audit all prompts, disable cloud APIs.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS prompt_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt_length INTEGER NOT NULL,
  tools_requested TEXT,
  blocked INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface ComplianceConfig {
  localOnly: boolean;
  auditPrompts: boolean;
  blockedModels: string[];
  maxPromptLength: number;
}

export const DEFAULT_COMPLIANCE: ComplianceConfig = {
  localOnly: false,
  auditPrompts: false,
  blockedModels: [],
  maxPromptLength: 50000,
};

export class ComplianceManager {
  private config: ComplianceConfig;

  constructor(private db: DB, config?: Partial<ComplianceConfig>) {
    this.db.exec(SCHEMA);
    this.config = { ...DEFAULT_COMPLIANCE, ...config };
  }

  checkModel(model: string): { allowed: boolean; reason?: string } {
    if (this.config.blockedModels.includes(model)) return { allowed: false, reason: `Model "${model}" is blocked by compliance policy` };
    if (this.config.localOnly && !model.startsWith('ollama:')) return { allowed: false, reason: 'Compliance mode: only local models allowed' };
    return { allowed: true };
  }

  auditPrompt(model: string, prompt: string, tools: string[]): void {
    if (!this.config.auditPrompts) return;
    const hash = Buffer.from(prompt.slice(0, 200)).toString('base64').slice(0, 32);
    this.db.prepare(
      'INSERT INTO prompt_audit_log (model, prompt_hash, prompt_length, tools_requested) VALUES (?, ?, ?, ?)'
    ).run(model, hash, prompt.length, tools.join(','));
  }

  checkPromptLength(prompt: string): { allowed: boolean; reason?: string } {
    if (prompt.length > this.config.maxPromptLength) return { allowed: false, reason: `Prompt exceeds max length (${this.config.maxPromptLength})` };
    return { allowed: true };
  }

  getAuditLog(limit = 100): unknown[] {
    return this.db.prepare('SELECT * FROM prompt_audit_log ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  updateConfig(config: Partial<ComplianceConfig>): void {
    Object.assign(this.config, config);
  }
}

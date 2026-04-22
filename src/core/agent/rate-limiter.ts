/**
 * Agent rate limiting — per-user, per-model token budgets with alerts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS token_budgets (
  model TEXT PRIMARY KEY,
  daily_limit INTEGER NOT NULL DEFAULT 100000,
  used_today INTEGER NOT NULL DEFAULT 0,
  last_reset TEXT DEFAULT (date('now'))
);
`;

export class RateLimiter {
  constructor(private db: DB) { this.db.exec(SCHEMA); }

  check(model: string, estimatedTokens: number): { allowed: boolean; remaining: number; limit: number } {
    this.resetIfNewDay(model);
    const row = this.db.prepare('SELECT daily_limit, used_today FROM token_budgets WHERE model = ?').get(model) as { daily_limit: number; used_today: number } | undefined;
    const limit = row?.daily_limit ?? 100000;
    const used = row?.used_today ?? 0;
    const remaining = Math.max(0, limit - used);
    return { allowed: remaining >= estimatedTokens, remaining, limit };
  }

  record(model: string, tokensUsed: number): void {
    this.db.prepare(
      `INSERT INTO token_budgets (model, used_today, last_reset) VALUES (?, ?, date('now'))
       ON CONFLICT(model) DO UPDATE SET used_today = used_today + ?`
    ).run(model, tokensUsed, tokensUsed);
  }

  setLimit(model: string, dailyLimit: number): void {
    this.db.prepare(
      `INSERT INTO token_budgets (model, daily_limit) VALUES (?, ?)
       ON CONFLICT(model) DO UPDATE SET daily_limit = ?`
    ).run(model, dailyLimit, dailyLimit);
  }

  private resetIfNewDay(model: string): void {
    this.db.prepare(
      `UPDATE token_budgets SET used_today = 0, last_reset = date('now') WHERE model = ? AND last_reset < date('now')`
    ).run(model);
  }
}

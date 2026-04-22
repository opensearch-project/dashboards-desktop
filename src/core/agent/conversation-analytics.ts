/**
 * Conversation analytics — track response time, tool usage, error rate per model.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agent_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  model TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  tools_used INTEGER NOT NULL DEFAULT 0,
  is_error INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface AnalyticsEntry { model: string; responseTimeMs: number; toolsUsed: number; isError: boolean }
export interface ModelStats { model: string; avgResponseMs: number; toolUsageRate: number; errorRate: number; totalCalls: number }

export class ConversationAnalytics {
  constructor(private db: DB) { this.db.exec(SCHEMA); }

  record(conversationId: string, entry: AnalyticsEntry): void {
    this.db.prepare(
      'INSERT INTO agent_analytics (conversation_id, model, response_time_ms, tools_used, is_error) VALUES (?, ?, ?, ?, ?)'
    ).run(conversationId, entry.model, entry.responseTimeMs, entry.toolsUsed, entry.isError ? 1 : 0);
  }

  getModelStats(): ModelStats[] {
    return this.db.prepare(`
      SELECT model, AVG(response_time_ms) as avgResponseMs,
        AVG(CASE WHEN tools_used > 0 THEN 1.0 ELSE 0.0 END) as toolUsageRate,
        AVG(is_error) as errorRate, COUNT(*) as totalCalls
      FROM agent_analytics GROUP BY model ORDER BY totalCalls DESC
    `).all() as ModelStats[];
  }

  getConversationStats(conversationId: string): { avgResponseMs: number; totalTools: number; errors: number } {
    return this.db.prepare(`
      SELECT COALESCE(AVG(response_time_ms),0) as avgResponseMs,
        COALESCE(SUM(tools_used),0) as totalTools,
        COALESCE(SUM(is_error),0) as errors
      FROM agent_analytics WHERE conversation_id = ?
    `).get(conversationId) as { avgResponseMs: number; totalTools: number; errors: number };
  }
}

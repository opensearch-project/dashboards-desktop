/**
 * Token usage tracker — tracks per-message and per-conversation token counts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface TokenUsage { inputTokens: number; outputTokens: number; model?: string }
export interface ConversationUsage { totalInput: number; totalOutput: number; messageCount: number }

export class TokenTracker {
  constructor(private db: DB) {
    this.db.exec(SCHEMA);
  }

  record(conversationId: string, messageIndex: number, usage: TokenUsage): void {
    this.db.prepare(
      'INSERT INTO token_usage (conversation_id, message_index, input_tokens, output_tokens, model) VALUES (?, ?, ?, ?, ?)'
    ).run(conversationId, messageIndex, usage.inputTokens, usage.outputTokens, usage.model ?? null);
  }

  getConversationUsage(conversationId: string): ConversationUsage {
    const row = this.db.prepare(
      'SELECT COALESCE(SUM(input_tokens),0) as totalInput, COALESCE(SUM(output_tokens),0) as totalOutput, COUNT(*) as messageCount FROM token_usage WHERE conversation_id = ?'
    ).get(conversationId) as ConversationUsage;
    return row;
  }

  getMessageUsage(conversationId: string, messageIndex: number): TokenUsage | undefined {
    return this.db.prepare(
      'SELECT input_tokens as inputTokens, output_tokens as outputTokens, model FROM token_usage WHERE conversation_id = ? AND message_index = ?'
    ).get(conversationId, messageIndex) as TokenUsage | undefined;
  }

  getTotalUsage(): ConversationUsage {
    return this.db.prepare(
      'SELECT COALESCE(SUM(input_tokens),0) as totalInput, COALESCE(SUM(output_tokens),0) as totalOutput, COUNT(*) as messageCount FROM token_usage'
    ).get() as ConversationUsage;
  }
}

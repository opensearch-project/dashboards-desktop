/**
 * Semantic search over conversations — FTS5 keyword search across all messages.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE VIRTUAL TABLE IF NOT EXISTS conversation_fts USING fts5(content, conversation_id UNINDEXED, role UNINDEXED, message_id UNINDEXED);
`;

export interface SearchResult { messageId: string; conversationId: string; role: string; content: string; score: number }

export class ConversationSearch {
  constructor(private db: DB) { this.db.exec(SCHEMA); }

  index(messageId: string, conversationId: string, role: string, content: string): void {
    this.db.prepare('INSERT INTO conversation_fts (message_id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(messageId, conversationId, role, content);
  }

  search(query: string, limit = 10): SearchResult[] {
    return this.db.prepare(
      `SELECT message_id as messageId, conversation_id as conversationId, role, content, rank as score
       FROM conversation_fts WHERE conversation_fts MATCH ? ORDER BY rank LIMIT ?`
    ).all(query, limit) as SearchResult[];
  }

  removeConversation(conversationId: string): void {
    this.db.prepare('DELETE FROM conversation_fts WHERE conversation_id = ?').run(conversationId);
  }
}

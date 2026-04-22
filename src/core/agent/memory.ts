/**
 * Agent memory — persists user preferences and facts across conversations.
 * Stored in SQLite, injected into system prompt as context.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agent_memory (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

export interface MemoryEntry { key: string; value: string; category: string }

export class AgentMemory {
  constructor(private db: DB) {
    this.db.exec(SCHEMA);
  }

  set(key: string, value: string, category = 'general'): void {
    this.db.prepare(
      `INSERT INTO agent_memory (key, value, category, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = excluded.updated_at`
    ).run(key, value, category);
  }

  get(key: string): string | undefined {
    return this.db.prepare('SELECT value FROM agent_memory WHERE key = ?').get(key)?.value;
  }

  delete(key: string): void {
    this.db.prepare('DELETE FROM agent_memory WHERE key = ?').run(key);
  }

  listByCategory(category: string): MemoryEntry[] {
    return this.db.prepare('SELECT key, value, category FROM agent_memory WHERE category = ? ORDER BY updated_at DESC').all(category) as MemoryEntry[];
  }

  all(): MemoryEntry[] {
    return this.db.prepare('SELECT key, value, category FROM agent_memory ORDER BY updated_at DESC LIMIT 50').all() as MemoryEntry[];
  }

  /** Build a context string for injection into the system prompt */
  toContext(): string {
    const entries = this.all();
    if (entries.length === 0) return '';
    const lines = entries.map((e) => `- ${e.key}: ${e.value}`);
    return `User preferences and known facts:\n${lines.join('\n')}`;
  }

  clear(): void {
    this.db.prepare('DELETE FROM agent_memory').run();
  }
}

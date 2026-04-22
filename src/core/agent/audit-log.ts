/**
 * Audit log — log destructive operations to SQLite.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  tool TEXT NOT NULL,
  input TEXT,
  user TEXT DEFAULT 'local',
  result TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export class AuditLog {
  constructor(private db: DB) { this.db.exec(SCHEMA); }

  log(action: string, tool: string, input: Record<string, unknown>, result?: string): void {
    this.db.prepare('INSERT INTO audit_log (action, tool, input, result) VALUES (?, ?, ?, ?)').run(action, tool, JSON.stringify(input), result ?? null);
  }

  query(limit = 50, tool?: string): Array<{ id: number; action: string; tool: string; input: string; createdAt: string }> {
    if (tool) return this.db.prepare('SELECT id, action, tool, input, created_at as createdAt FROM audit_log WHERE tool = ? ORDER BY id DESC LIMIT ?').all(tool, limit);
    return this.db.prepare('SELECT id, action, tool, input, created_at as createdAt FROM audit_log ORDER BY id DESC LIMIT ?').all(limit);
  }
}

/**
 * Prompt versioning — track prompt changes, A/B test system prompts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS prompt_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export class PromptVersioning {
  constructor(private db: DB) { this.db.exec(SCHEMA); }

  save(workspaceId: string, prompt: string): number {
    const maxVer = this.db.prepare('SELECT COALESCE(MAX(version),0) as v FROM prompt_versions WHERE workspace_id = ?').get(workspaceId) as { v: number };
    const version = maxVer.v + 1;
    this.db.prepare('UPDATE prompt_versions SET is_active = 0 WHERE workspace_id = ?').run(workspaceId);
    this.db.prepare('INSERT INTO prompt_versions (workspace_id, version, prompt, is_active) VALUES (?, ?, ?, 1)').run(workspaceId, version, prompt);
    return version;
  }

  getActive(workspaceId: string): { version: number; prompt: string } | undefined {
    return this.db.prepare('SELECT version, prompt FROM prompt_versions WHERE workspace_id = ? AND is_active = 1').get(workspaceId) as { version: number; prompt: string } | undefined;
  }

  activate(workspaceId: string, version: number): void {
    this.db.prepare('UPDATE prompt_versions SET is_active = 0 WHERE workspace_id = ?').run(workspaceId);
    this.db.prepare('UPDATE prompt_versions SET is_active = 1 WHERE workspace_id = ? AND version = ?').run(workspaceId, version);
  }

  listVersions(workspaceId: string): Array<{ version: number; prompt: string; isActive: boolean; createdAt: string }> {
    return this.db.prepare('SELECT version, prompt, is_active as isActive, created_at as createdAt FROM prompt_versions WHERE workspace_id = ? ORDER BY version DESC').all(workspaceId) as any[];
  }
}

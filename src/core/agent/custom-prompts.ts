/**
 * System prompt customization — per-workspace custom system prompts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const DEFAULT_PROMPT = 'You are an OpenSearch assistant. Help users manage their clusters, write queries, and troubleshoot issues. Be concise and accurate.';

export class CustomPrompts {
  constructor(private db: DB) {
    this.db.exec(`CREATE TABLE IF NOT EXISTS custom_prompts (
      workspace_id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
  }

  get(workspaceId: string): string {
    const row = this.db.prepare('SELECT prompt FROM custom_prompts WHERE workspace_id = ?').get(workspaceId) as { prompt: string } | undefined;
    return row?.prompt ?? DEFAULT_PROMPT;
  }

  set(workspaceId: string, prompt: string): void {
    this.db.prepare(
      `INSERT INTO custom_prompts (workspace_id, prompt, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(workspace_id) DO UPDATE SET prompt = excluded.prompt, updated_at = excluded.updated_at`
    ).run(workspaceId, prompt);
  }

  reset(workspaceId: string): void {
    this.db.prepare('DELETE FROM custom_prompts WHERE workspace_id = ?').run(workspaceId);
  }

  getDefault(): string { return DEFAULT_PROMPT; }
}

/**
 * Conversation manager — per-workspace conversation storage and context window management.
 */

import * as crypto from 'crypto';
import type { ChatMessage, ModelInfo, ToolDefinition } from './types';

const RESERVED_OUTPUT_TOKENS = 4096;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

export class ConversationManager {
  constructor(private db: DB) {}

  create(workspaceId: string, model: string, title?: string): string {
    const id = crypto.randomUUID();
    this.db
      .prepare(
        `INSERT INTO conversations (id, workspace_id, title, model, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(id, workspaceId, title ?? 'New conversation', model);
    return id;
  }

  list(workspaceId: string): Array<{ id: string; title: string; updated_at: string }> {
    return this.db
      .prepare(
        'SELECT id, title, updated_at FROM conversations WHERE workspace_id = ? ORDER BY updated_at DESC',
      )
      .all(workspaceId);
  }

  delete(conversationId: string): void {
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
  }

  addMessage(
    conversationId: string,
    role: string,
    content: string,
    toolCalls?: string,
    toolCallId?: string,
  ): string {
    const id = crypto.randomUUID();
    const tokenCount = estimateTokens(content);
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, token_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(id, conversationId, role, content, toolCalls ?? null, toolCallId ?? null, tokenCount);
    // Update conversation timestamp
    this.db
      .prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
      .run(conversationId);
    return id;
  }

  getMessages(conversationId: string): ChatMessage[] {
    const rows = this.db
      .prepare(
        'SELECT role, content, tool_calls, tool_call_id FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      )
      .all(conversationId) as Array<{
      role: string;
      content: string;
      tool_calls: string | null;
      tool_call_id: string | null;
    }>;

    return rows.map((r) => {
      const msg: ChatMessage = { role: r.role as ChatMessage['role'], content: r.content };
      if (r.tool_calls) msg.toolCalls = JSON.parse(r.tool_calls);
      if (r.tool_call_id) msg.toolCallId = r.tool_call_id;
      return msg;
    });
  }

  /** Build context for a model call — fits messages within the context window budget */
  buildContext(
    conversationId: string,
    model: ModelInfo,
    tools: ToolDefinition[],
    workspaceId: string,
  ): ChatMessage[] {
    const budget = model.contextWindow - RESERVED_OUTPUT_TOKENS;
    const systemPrompt = buildSystemPrompt(tools, workspaceId);
    let used = estimateTokens(systemPrompt);

    const rows = this.db
      .prepare(
        'SELECT role, content, tool_calls, tool_call_id, token_count FROM messages WHERE conversation_id = ? ORDER BY created_at DESC',
      )
      .all(conversationId) as Array<{
      role: string;
      content: string;
      tool_calls: string | null;
      tool_call_id: string | null;
      token_count: number | null;
    }>;

    const included: ChatMessage[] = [];
    for (const row of rows) {
      const cost = row.token_count ?? estimateTokens(row.content);
      if (used + cost > budget) break;
      const msg: ChatMessage = { role: row.role as ChatMessage['role'], content: row.content };
      if (row.tool_calls) msg.toolCalls = JSON.parse(row.tool_calls);
      if (row.tool_call_id) msg.toolCallId = row.tool_call_id;
      included.unshift(msg);
      used += cost;
    }

    return [{ role: 'system', content: systemPrompt }, ...included];
  }
}

function buildSystemPrompt(tools: ToolDefinition[], workspaceId: string): string {
  const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');
  return `You are an OpenSearch Dashboards Desktop assistant. Workspace: ${workspaceId}.

Available tools:
${toolList || '(none)'}

Use tools to query data, manage clusters, and help the user. Be concise and accurate.`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

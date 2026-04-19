/**
 * Conversation branching — fork from any message to create a new conversation.
 */

import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

/**
 * Fork a conversation at a specific message, creating a new conversation
 * with history up to (and including) that message.
 *
 * @returns The new conversation ID
 */
export function branchConversation(
  db: DB,
  sourceConversationId: string,
  messageId: string,
  workspaceId: string,
): string {
  // Get source conversation metadata
  const source = db.prepare('SELECT model, title FROM conversations WHERE id = ?').get(sourceConversationId);
  if (!source) throw new Error(`Conversation not found: ${sourceConversationId}`);

  // Get the target message to find its timestamp
  const targetMsg = db.prepare('SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?')
    .get(messageId, sourceConversationId);
  if (!targetMsg) throw new Error(`Message not found: ${messageId}`);

  // Create new conversation
  const newId = uuidv4();
  db.prepare(
    `INSERT INTO conversations (id, workspace_id, title, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(newId, workspaceId, `${source.title} (branch)`, source.model);

  // Use a transaction for atomicity
  const copyMessages = db.transaction(() => {
    const rows = db.prepare(
      `SELECT role, content, tool_calls, tool_call_id, token_count, created_at
       FROM messages WHERE conversation_id = ? AND created_at <= (
         SELECT created_at FROM messages WHERE id = ?
       ) ORDER BY created_at ASC`
    ).all(sourceConversationId, messageId);

    const insert = db.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, token_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const row of rows) {
      insert.run(uuidv4(), newId, row.role, row.content, row.tool_calls, row.tool_call_id, row.token_count, row.created_at);
    }
  });

  copyMessages();
  return newId;
}

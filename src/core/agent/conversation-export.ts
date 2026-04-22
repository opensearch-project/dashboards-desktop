/**
 * Conversation export — export chat as markdown with tool results.
 */

import type { ChatMessage } from './types';

export function exportToMarkdown(title: string, messages: ChatMessage[], model?: string): string {
  const lines: string[] = [
    `# ${title}`,
    '',
    `*Exported: ${new Date().toISOString()}*`,
  ];
  if (model) lines.push(`*Model: ${model}*`);
  lines.push('', '---', '');

  for (const msg of messages) {
    switch (msg.role) {
      case 'system':
        lines.push(`> **System**: ${msg.content}`, '');
        break;
      case 'user':
        lines.push(`**You**: ${msg.content}`, '');
        break;
      case 'assistant':
        lines.push(`**Assistant**: ${msg.content}`, '');
        if (msg.toolCalls?.length) {
          for (const tc of msg.toolCalls) {
            lines.push(`\`\`\`tool-call: ${tc.name}\`\`\``);
            lines.push('```json', JSON.stringify(tc.input, null, 2), '```', '');
          }
        }
        break;
      case 'tool':
        lines.push(`<details><summary>Tool result (${msg.toolCallId})</summary>`, '', '```', msg.content ?? '', '```', '</details>', '');
        break;
    }
  }

  return lines.join('\n');
}

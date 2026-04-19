import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface ToolStatus {
  id: string;
  name: string;
  state: 'running' | 'done' | 'error';
  output?: string;
  isError?: boolean;
}

interface Props {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  streaming?: boolean;
  toolStatuses?: ToolStatus[];
  messageId?: string;
  pinned?: boolean;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
}

/** Parse markdown to HTML — minimal inline parser for streaming content */
function renderMarkdown(src: string): string {
  let html = escapeHtml(src);
  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<div class="code-block" data-lang="${lang}"><pre><code class="language-${lang}">${code}</code></pre><button class="code-copy" aria-label="Copy code">Copy</button></div>`
  );
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1 <span aria-label="external link">↗</span></a>');
  // Simple tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_m, header, _sep, body) => {
    const ths = header.split('|').filter(Boolean).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const tds = row.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table role="table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  // Line breaks (preserve paragraphs)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const ChatMessage: React.FC<Props> = ({ role, content, streaming, toolStatuses, messageId, pinned, onPin, onUnpin }) => {
  const [displayContent, setDisplayContent] = useState(content);
  const bufferRef = useRef(content);
  const rafRef = useRef<number>(0);

  // Streaming: accumulate tokens and flush via rAF
  useEffect(() => {
    bufferRef.current = content;
    if (streaming) {
      const flush = () => {
        setDisplayContent(bufferRef.current);
        rafRef.current = requestAnimationFrame(flush);
      };
      rafRef.current = requestAnimationFrame(flush);
      return () => cancelAnimationFrame(rafRef.current);
    }
    setDisplayContent(content);
  }, [content, streaming]);

  const html = useMemo(() => renderMarkdown(displayContent), [displayContent]);

  // Copy code block handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.code-copy');
    if (!btn) return;
    const code = btn.parentElement?.querySelector('code')?.textContent ?? '';
    navigator.clipboard.writeText(code);
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  }, []);

  return (
    <div className={`chat-msg chat-msg-${role}`} role="article" aria-label={`${role} message`} onClick={handleClick}>
      {/* Tool execution feedback */}
      {toolStatuses?.map(tool => (
        <div key={tool.id} className={`tool-status tool-status-${tool.state}`} role="status">
          {tool.state === 'running' && <span className="tool-spinner" aria-hidden="true" />}
          <span className="tool-name">
            {tool.state === 'running' && `Running ${tool.name}…`}
            {tool.state === 'done' && `✓ ${tool.name}`}
            {tool.state === 'error' && `✕ ${tool.name} failed`}
          </span>
          {tool.state !== 'running' && tool.output && (
            <details className="tool-output">
              <summary>{tool.isError ? 'Error details' : 'Result'}</summary>
              <pre><code>{tool.output}</code></pre>
            </details>
          )}
        </div>
      ))}

      {/* Message content */}
      <div
        className="chat-msg-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {streaming && <span className="streaming-cursor" aria-hidden="true" />}

      {/* Pin/bookmark action */}
      {!streaming && messageId && (
        <div className="msg-actions">
          <button
            className={`btn-icon-sm msg-pin ${pinned ? 'pinned' : ''}`}
            onClick={() => pinned ? onUnpin?.(messageId) : onPin?.(messageId)}
            aria-label={pinned ? 'Unpin message' : 'Pin message'}
          >
            {pinned ? '★' : '☆'}
          </button>
        </div>
      )}
    </div>
  );
};

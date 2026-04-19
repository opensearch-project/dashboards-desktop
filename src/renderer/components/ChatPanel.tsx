import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ModelSwitcher } from './ModelSwitcher';
import { ConversationSidebar } from './ConversationSidebar';
import type { StreamEvent, ChatMessage as ChatMsg } from '../../core/types';

interface ToolStatus { id: string; name: string; state: 'running' | 'done' | 'error'; output?: string; isError?: boolean; }
interface DisplayMessage { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean; toolStatuses?: ToolStatus[]; }

interface Props {
  fullScreen: boolean;
  onClose: () => void;
  onToggleFullScreen: () => void;
  workspaceId?: string;
}

const MIN_WIDTH = 320;
const MAX_WIDTH_RATIO = 0.8;

export const ChatPanel: React.FC<Props> = ({ fullScreen, onClose, onToggleFullScreen, workspaceId }) => {
  const [width, setWidth] = useState(480);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef('');
  const toolStatusesRef = useRef<ToolStatus[]>([]);
  const resizing = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load conversation messages when switching
  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    window.osd.conversations.messages(activeConv).then((msgs: ChatMsg[]) => {
      setMessages(msgs.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
        id: m.id, role: m.role as 'user' | 'assistant', content: m.content ?? '',
      })));
    }).catch(() => {});
  }, [activeConv]);

  // Subscribe to stream events
  useEffect(() => {
    const unsub = window.osd.agent.onStream((event: StreamEvent) => {
      switch (event.type) {
        case 'token':
          streamBufferRef.current += event.content;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.streaming) return [...prev.slice(0, -1), { ...last, content: streamBufferRef.current }];
            return prev;
          });
          break;
        case 'tool_call_start':
          toolStatusesRef.current = [...toolStatusesRef.current, { id: event.id, name: event.name, state: 'running' }];
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.streaming) return [...prev.slice(0, -1), { ...last, toolStatuses: [...toolStatusesRef.current] }];
            return prev;
          });
          break;
        case 'tool_result':
          toolStatusesRef.current = toolStatusesRef.current.map(t =>
            t.id === event.id ? { ...t, state: event.isError ? 'error' : 'done', output: event.output, isError: event.isError } : t
          );
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.streaming) return [...prev.slice(0, -1), { ...last, toolStatuses: [...toolStatusesRef.current] }];
            return prev;
          });
          break;
        case 'done':
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.streaming) return [...prev.slice(0, -1), { ...last, streaming: false }];
            return prev;
          });
          setStreaming(false);
          break;
        case 'error':
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.streaming) return [...prev.slice(0, -1), { ...last, content: `Error: ${event.message}`, streaming: false }];
            return [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${event.message}` }];
          });
          setStreaming(false);
          break;
      }
    });
    return unsub;
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput('');
    setEditIndex(null);
    streamBufferRef.current = '';
    toolStatusesRef.current = [];

    const userMsg: DisplayMessage = { id: Date.now().toString(), role: 'user', content: msg };
    const assistantMsg: DisplayMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', streaming: true, toolStatuses: [] };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const convId = await window.osd.agent.send(msg, activeConv ?? undefined);
      if (!activeConv && convId) setActiveConv(convId);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to send message.';
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.streaming) return [...prev.slice(0, -1), { ...last, content: errMsg, streaming: false }];
        return prev;
      });
      setStreaming(false);
    }
    }
  }, [input, streaming, activeConv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    // Up arrow to edit last user message
    if (e.key === 'ArrowUp' && !input) {
      const lastUserIdx = messages.findLastIndex((m: DisplayMessage) => m.role === 'user');
      if (lastUserIdx >= 0) {
        setEditIndex(lastUserIdx);
        setInput(messages[lastUserIdx].content);
      }
    }
  };

  const handleEditSend = () => {
    if (editIndex === null) return;
    // Truncate messages to the edit point and resend
    setMessages(prev => prev.slice(0, editIndex));
    sendMessage();
  };

  // Resize
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX, startW = width;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      setWidth(Math.max(MIN_WIDTH, Math.min(window.innerWidth * MAX_WIDTH_RATIO, startW + (startX - ev.clientX))));
    };
    const onUp = () => { resizing.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [width]);

  return (
    <aside
      className={`chat-panel ${fullScreen ? 'chat-panel-fullscreen' : ''}`}
      style={fullScreen ? undefined : { width }}
      role="complementary"
      aria-label="Chat panel"
    >
      {!fullScreen && (
        <div
          className="chat-resize-handle"
          onMouseDown={onResizeStart}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); setWidth(w => Math.min(window.innerWidth * MAX_WIDTH_RATIO, w + 20)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setWidth(w => Math.max(MIN_WIDTH, w - 20)); }
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={Math.round(window.innerWidth * MAX_WIDTH_RATIO)}
          tabIndex={0}
        />
      )}

      <header className="chat-header">
        <button className="btn-icon" onClick={() => setSidebarOpen(s => !s)} aria-label={sidebarOpen ? 'Hide conversations' : 'Show conversations'} aria-expanded={sidebarOpen}>☰</button>
        <h2 className="chat-title">Chat</h2>
        <ModelSwitcher />
        <div className="chat-header-actions">
          <button className="btn-icon" onClick={onToggleFullScreen} aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}>{fullScreen ? '⊡' : '⊞'}</button>
          <button className="btn-icon" onClick={onClose} aria-label="Close chat">✕</button>
        </div>
      </header>

      <div className="chat-body">
        {sidebarOpen && (
          <ConversationSidebar
            workspaceId={workspaceId}
            activeId={activeConv}
            onSelect={setActiveConv}
            onNew={() => { setActiveConv(null); setMessages([]); }}
          />
        )}

        <div className="chat-messages" role="log" aria-label="Chat messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat-empty" role="status">
              <p>Start a conversation</p>
              <p className="empty-subtitle">Ask about your clusters, data, or anything else.</p>
            </div>
          ) : (
            messages.map(msg => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                streaming={msg.streaming}
                toolStatuses={msg.toolStatuses}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="chat-input-area">
        {editIndex !== null && (
          <div className="edit-indicator" role="status">
            Editing message — <button className="btn-link" onClick={() => { setEditIndex(null); setInput(''); }}>Cancel</button>
          </div>
        )}
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Waiting for response…' : 'Ask anything… (Enter to send)'}
            aria-label="Message input"
            rows={1}
            disabled={streaming}
          />
          {streaming ? (
            <button className="btn-danger chat-send" onClick={() => window.osd.agent.cancel()} aria-label="Stop generation">■</button>
          ) : (
            <button className="btn-primary chat-send" onClick={() => editIndex !== null ? handleEditSend() : sendMessage()} disabled={!input.trim()} aria-label="Send message">↑</button>
          )}
        </div>
      </footer>
    </aside>
  );
};

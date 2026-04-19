import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Conversation { id: string; title: string; updatedAt: string; }
interface Message { id: string; role: 'user' | 'assistant'; content: string; }

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);

  // Focus input on open
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Resize handler
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const maxW = window.innerWidth * MAX_WIDTH_RATIO;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxW, startW + (startX - ev.clientX))));
    };
    const onUp = () => { resizing.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [width]);

  // Send message (placeholder — agent runtime in M2)
  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Connect a model to start chatting. Agent runtime ships in M2.' };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    if (!activeConv) {
      const conv: Conversation = { id: Date.now().toString(), title: text.slice(0, 50), updatedAt: new Date().toISOString() };
      setConversations(prev => [conv, ...prev]);
      setActiveConv(conv.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filteredConvs = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  return (
    <aside
      ref={panelRef}
      className={`chat-panel ${fullScreen ? 'chat-panel-fullscreen' : ''}`}
      style={fullScreen ? undefined : { width }}
      role="complementary"
      aria-label="Chat panel"
    >
      {/* Resize handle */}
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
          tabIndex={0}
        />
      )}

      {/* Header */}
      <header className="chat-header">
        <button className="btn-icon" onClick={() => setSidebarOpen(s => !s)} aria-label={sidebarOpen ? 'Hide conversations' : 'Show conversations'} aria-expanded={sidebarOpen}>
          ☰
        </button>
        <h2 className="chat-title">Chat</h2>
        <div className="chat-header-actions">
          <button className="btn-icon" onClick={onToggleFullScreen} aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}>
            {fullScreen ? '⊡' : '⊞'}
          </button>
          <button className="btn-icon" onClick={onClose} aria-label="Close chat">✕</button>
        </div>
      </header>

      <div className="chat-body">
        {/* Conversation sidebar */}
        {sidebarOpen && (
          <nav className="chat-sidebar" aria-label="Conversation history">
            <div className="chat-sidebar-search">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                aria-label="Search conversations"
              />
            </div>
            <button className="btn-sm chat-new-conv" onClick={() => { setActiveConv(null); setMessages([]); }}>
              + New conversation
            </button>
            {filteredConvs.length === 0 ? (
              <p className="chat-sidebar-empty" role="status">No conversations yet</p>
            ) : (
              <ul role="list">
                {filteredConvs.map(c => (
                  <li key={c.id}>
                    <button
                      className={`conv-item ${c.id === activeConv ? 'active' : ''}`}
                      onClick={() => setActiveConv(c.id)}
                      aria-current={c.id === activeConv ? 'true' : undefined}
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        )}

        {/* Messages */}
        <div className="chat-messages" role="log" aria-label="Chat messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat-empty" role="status">
              <p>Start a conversation</p>
              <p className="empty-subtitle">Ask about your clusters, data, or anything else.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`} role="article" aria-label={`${msg.role} message`}>
                <div className="chat-msg-content">{msg.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <footer className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
          aria-label="Message input"
          rows={1}
        />
        <button className="btn-primary chat-send" onClick={sendMessage} disabled={!input.trim()} aria-label="Send message">
          ↑
        </button>
      </footer>
    </aside>
  );
};

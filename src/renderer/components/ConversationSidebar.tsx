import React, { useState, useEffect, useRef } from 'react';
import type { Conversation } from '../../core/types';

interface Props {
  workspaceId?: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export const ConversationSidebar: React.FC<Props> = ({
  workspaceId,
  activeId,
  onSelect,
  onNew,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!workspaceId) return;
    const list = await window.osd.conversations.list(workspaceId);
    setConversations(list);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const filtered = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const handleRename = async (id: string) => {
    if (renameValue.trim()) {
      await window.osd.conversations.rename(id, renameValue.trim());
      await load();
    }
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    await window.osd.conversations.delete(id);
    await load();
    if (activeId === id) onNew();
  };

  return (
    <nav className="conv-sidebar" aria-label="Conversation history">
      <div className="conv-sidebar-header">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          aria-label="Search conversations"
          className="conv-search"
        />
        <button className="btn-sm" onClick={onNew} aria-label="New conversation">
          + New
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="conv-empty" role="status">
          {search ? 'No matches' : 'No conversations yet'}
        </p>
      ) : (
        <ul className="conv-list" role="list">
          {filtered.map((c) => (
            <li key={c.id} className={`conv-item-row ${c.id === activeId ? 'active' : ''}`}>
              {renamingId === c.id ? (
                <form
                  className="conv-rename-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRename(c.id);
                  }}
                >
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    aria-label="Rename conversation"
                  />
                </form>
              ) : (
                <button
                  className="conv-item-btn"
                  onClick={() => onSelect(c.id)}
                  aria-current={c.id === activeId ? 'true' : undefined}
                  title={c.title}
                >
                  <span className="conv-item-title">{c.title || 'Untitled'}</span>
                </button>
              )}
              <div className="conv-item-actions">
                <button
                  className="btn-icon-sm"
                  onClick={() => {
                    setRenamingId(c.id);
                    setRenameValue(c.title);
                  }}
                  aria-label={`Rename "${c.title}"`}
                >
                  ✎
                </button>
                <button
                  className="btn-icon-sm"
                  onClick={() => handleDelete(c.id)}
                  aria-label={`Delete "${c.title}"`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};

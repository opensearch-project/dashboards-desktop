/**
 * Multi-tab chat — tab bar for switching between conversations.
 */
import React from 'react';

interface Tab { id: string; title: string; unread?: boolean }
interface Props { tabs: Tab[]; activeId: string; onSelect: (id: string) => void; onClose: (id: string) => void; onNew: () => void }

export const ChatTabs: React.FC<Props> = ({ tabs, activeId, onSelect, onClose, onNew }) => (
  <div className="chat-tabs" role="tablist" aria-label="Conversations">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={tab.id === activeId}
        className={`chat-tab ${tab.id === activeId ? 'active' : ''} ${tab.unread ? 'unread' : ''}`}
        onClick={() => onSelect(tab.id)}
      >
        <span className="chat-tab-title">{tab.title || 'New Chat'}</span>
        <span className="chat-tab-close" onClick={(e) => { e.stopPropagation(); onClose(tab.id); }} aria-label="Close tab">×</span>
      </button>
    ))}
    <button className="chat-tab-new" onClick={onNew} aria-label="New conversation">+</button>
  </div>
);

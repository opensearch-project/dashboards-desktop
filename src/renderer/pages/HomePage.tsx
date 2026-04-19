import React, { useState } from 'react';
import type { Workspace, Connection } from '../../core/types';

interface Props {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  connections: Connection[];
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: (name: string) => void;
  onOpenChat: () => void;
  onAddConnection: () => void;
  onEditConnection: (conn: Connection) => void;
  onRefresh: () => void;
}

const HEALTH: Record<string, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'health-green' },
  degraded: { label: 'Degraded', className: 'health-yellow' },
  offline: { label: 'Offline', className: 'health-red' },
  unknown: { label: 'Unknown', className: 'health-gray' },
};

// Placeholder recent items — will come from SQLite in M2
const RECENT_PLACEHOLDER = [
  {
    id: '1',
    title: 'No recent items yet',
    subtitle: 'Start a conversation or connect a data source',
  },
];

export const HomePage: React.FC<Props> = ({
  workspaces,
  activeWorkspace,
  connections,
  onSwitchWorkspace,
  onCreateWorkspace,
  onOpenChat,
  onAddConnection,
  onEditConnection,
  onRefresh,
}) => {
  const [newWsName, setNewWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  const handleCreateWorkspace = () => {
    if (creatingWs) {
      if (newWsName.trim()) {
        onCreateWorkspace(newWsName.trim());
        setNewWsName('');
      }
      setCreatingWs(false);
    } else {
      setCreatingWs(true);
    }
  };

  return (
    <div className="homepage" role="region" aria-label="Homepage">
      {/* Header */}
      <header className="homepage-header">
        <h1>OpenSearch Dashboards Desktop</h1>
        <button className="btn-icon" onClick={onRefresh} aria-label="Refresh">
          ↻
        </button>
      </header>

      {/* Chat entry */}
      <section className="homepage-chat-entry" aria-label="Start a conversation">
        <button className="chat-entry-btn" onClick={onOpenChat}>
          <span className="chat-entry-icon" aria-hidden="true">
            💬
          </span>
          <span className="chat-entry-text">Ask anything…</span>
          <kbd aria-label="Command K">⌘K</kbd>
        </button>
      </section>

      {/* Workspaces */}
      <section className="homepage-section" aria-label="Workspaces">
        <h2>Workspaces</h2>
        <div className="card-grid" role="list">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              role="listitem"
              className={`workspace-card ${ws.id === activeWorkspace?.id ? 'active' : ''}`}
              onClick={() => onSwitchWorkspace(ws)}
              aria-current={ws.id === activeWorkspace?.id ? 'true' : undefined}
              aria-label={`${ws.name} workspace${ws.id === activeWorkspace?.id ? ', active' : ''}`}
            >
              <span className="workspace-name">{ws.name}</span>
              {ws.is_default ? <span className="badge">Default</span> : null}
            </button>
          ))}
          <div className="workspace-card workspace-card-new" role="listitem">
            {creatingWs ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateWorkspace();
                }}
                className="new-ws-form"
              >
                <input
                  autoFocus
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="Workspace name"
                  aria-label="New workspace name"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setCreatingWs(false);
                  }}
                />
                <button type="submit" aria-label="Create workspace">
                  ✓
                </button>
                <button type="button" onClick={() => setCreatingWs(false)} aria-label="Cancel">
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={handleCreateWorkspace}
                className="new-ws-btn"
                aria-label="Create new workspace"
              >
                + New
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Connections */}
      <section className="homepage-section" aria-label="Data source connections">
        <div className="section-header">
          <h2>Connected Data Sources</h2>
          <button className="btn-sm" onClick={onAddConnection}>
            + Add
          </button>
        </div>
        {connections.length === 0 ? (
          <div className="empty-state" role="status">
            <p>No connections yet.</p>
            <button className="btn-primary" onClick={onAddConnection}>
              Add your first connection
            </button>
          </div>
        ) : (
          <ul className="connection-list" role="list">
            {connections.map((conn) => {
              const health = HEALTH.unknown; // Real health checks come in M2
              return (
                <li key={conn.id} className="connection-item" role="listitem">
                  <button
                    className="connection-btn"
                    onClick={() => onEditConnection(conn)}
                    aria-label={`Edit ${conn.name}`}
                  >
                    <span className={`health-dot ${health.className}`} aria-label={health.label} />
                    <span className="connection-name">{conn.name}</span>
                    <span className="connection-meta">
                      {conn.type} · {conn.url}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent items */}
      <section className="homepage-section" aria-label="Recent items">
        <h2>Recent</h2>
        {RECENT_PLACEHOLDER[0].id === '1' ? (
          <div className="empty-state" role="status">
            <p>{RECENT_PLACEHOLDER[0].title}</p>
            <p className="empty-subtitle">{RECENT_PLACEHOLDER[0].subtitle}</p>
          </div>
        ) : (
          <ul className="recent-list" role="list">
            {RECENT_PLACEHOLDER.map((item) => (
              <li key={item.id} role="listitem">
                {item.title}
                <span className="recent-sub">{item.subtitle}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

import React from 'react';
import type { Connection } from '../../core/types';
import { OAuthLogin } from './OAuthLogin';

export type Page = 'home' | 'chat' | 'cluster' | 'indices' | 'security' | 'settings';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'cluster', label: 'Cluster', icon: '🖥' },
  { id: 'indices', label: 'Indices', icon: '📑' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
  activeConnection: Connection | null;
  connections: Connection[];
  onSwitchConnection: (conn: Connection) => void;
}

export const Sidebar: React.FC<Props> = ({ activePage, onNavigate, activeConnection, connections, onSwitchConnection }) => (
  <nav className="sidebar" aria-label="Main navigation">
    <div className="sidebar-brand">
      <span className="sidebar-logo" aria-hidden="true">◆</span>
      <span className="sidebar-title">OSD</span>
    </div>

    {/* Connection indicator */}
    {connections.length > 0 && (
      <div className="sidebar-connection">
        <select
          value={activeConnection?.id ?? ''}
          onChange={e => {
            const c = connections.find(conn => conn.id === e.target.value);
            if (c) onSwitchConnection(c);
          }}
          aria-label="Active connection"
          className="sidebar-conn-select"
        >
          {connections.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    )}

    <ul className="sidebar-nav" role="list">
      {NAV_ITEMS.map(item => (
        <li key={item.id}>
          <button
            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>

    <div className="sidebar-footer">
      <OAuthLogin />
    </div>
  </nav>
);

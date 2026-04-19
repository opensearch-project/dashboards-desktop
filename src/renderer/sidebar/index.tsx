/**
 * Desktop Management Sidebar — Slack-style left panel.
 * Renders in its own BrowserView, managed by Electron.
 *
 * Sections: Connections, Config, Plugins, Chat, Settings
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './sidebar.css';

type Section = 'connections' | 'config' | 'plugins' | 'chat' | 'settings';

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'connections', icon: '🔌', label: 'Connections' },
  { id: 'config', icon: '⚙️', label: 'OSD Config' },
  { id: 'plugins', icon: '🧩', label: 'Plugins' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'settings', icon: '🔧', label: 'Settings' },
];

const Sidebar: React.FC = () => {
  const [active, setActive] = useState<Section>('connections');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <header className="sidebar-header">
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && <span className="sidebar-title">Desktop</span>}
      </header>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => {
              if (item.id === 'chat') {
                window.osd?.agent?.send('__toggle_chat__').catch(() => {});
              } else {
                setActive(item.id);
              }
            }}
            aria-current={active === item.id ? 'page' : undefined}
            title={item.label}
          >
            <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
            {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <main className="sidebar-content" aria-live="polite">
        {active === 'connections' && <ConnectionsPanel />}
        {active === 'config' && <ConfigPanel />}
        {active === 'plugins' && <PluginsPanel />}
        {active === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
};

// --- Section Components ---

const ConnectionsPanel: React.FC = () => {
  const [connections, setConnections] = React.useState<Array<{ id: string; name: string; url: string; status?: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.osd?.connections?.list().then(conns => {
      setConnections(conns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel-loading" role="status">Loading…</div>;

  return (
    <section aria-label="Connections">
      <div className="panel-header">
        <h2>Connections</h2>
        <button className="btn-sm" aria-label="Add connection">+ Add</button>
      </div>
      {connections.length === 0 ? (
        <p className="panel-empty" role="status">No connections configured</p>
      ) : (
        <ul className="conn-list" role="list">
          {connections.map(c => (
            <li key={c.id} className="conn-item">
              <span className={`conn-status ${c.status ?? 'unknown'}`} aria-label={`Status: ${c.status ?? 'unknown'}`} />
              <span className="conn-name">{c.name}</span>
              <span className="conn-url">{c.url}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ConfigPanel: React.FC = () => {
  const [osdStatus, setOsdStatus] = React.useState<string>('unknown');
  const [config, setConfig] = React.useState('');

  React.useEffect(() => {
    window.osd?.settings?.get('osd_status').then(s => setOsdStatus(s ?? 'unknown')).catch(() => {});
    window.osd?.settings?.get('osd_config_yml').then(c => setConfig(c ?? '')).catch(() => {});
  }, []);

  return (
    <section aria-label="OSD Configuration">
      <div className="panel-header">
        <h2>OSD Config</h2>
        <span className={`osd-status-badge ${osdStatus}`}>{osdStatus}</span>
      </div>
      <textarea
        className="config-editor"
        value={config}
        onChange={e => setConfig(e.target.value)}
        aria-label="opensearch_dashboards.yml editor"
        spellCheck={false}
      />
      <div className="panel-actions">
        <button className="btn-sm" onClick={() => window.osd?.settings?.set('osd_config_yml', config).catch(() => {})}>Save</button>
        <button className="btn-sm btn-warning" onClick={() => window.osd?.agent?.send('__restart_osd__').catch(() => {})}>Restart OSD</button>
      </div>
    </section>
  );
};

const PluginsPanel: React.FC = () => {
  const [plugins, setPlugins] = React.useState<Array<{ name: string; installed: boolean }>>([]);

  React.useEffect(() => {
    window.osd?.plugins?.list().then(setPlugins).catch(() => {});
  }, []);

  return (
    <section aria-label="Plugin Management">
      <div className="panel-header">
        <h2>Plugins</h2>
        <button className="btn-sm" aria-label="Install plugin">+ Install</button>
      </div>
      {plugins.length === 0 ? (
        <p className="panel-empty" role="status">No plugins tracked</p>
      ) : (
        <ul className="plugin-list" role="list">
          {plugins.map(p => (
            <li key={p.name} className="plugin-item">
              <span className="plugin-name">{p.name}</span>
              <button className="btn-xs btn-danger" onClick={() => window.osd?.plugins?.uninstall(p.name).catch(() => {})}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const SettingsPanel: React.FC = () => (
  <section aria-label="Settings">
    <div className="panel-header"><h2>Settings</h2></div>
    <div className="settings-group">
      <label>OSD Binary Path</label>
      <input type="text" className="settings-input" placeholder="/usr/share/opensearch-dashboards" aria-label="OSD binary path" />
    </div>
    <div className="settings-group">
      <label>Update Channel</label>
      <select className="settings-input" aria-label="Update channel">
        <option value="stable">Stable</option>
        <option value="beta">Beta</option>
      </select>
    </div>
    <div className="settings-group">
      <button className="btn-sm" onClick={() => window.osd?.settings?.get('all_settings').then(s => {
        const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'osd-settings.json'; a.click();
      }).catch(() => {})}>Export Settings</button>
    </div>
  </section>
);

// --- Mount ---
const root = createRoot(document.getElementById('root')!);
root.render(<Sidebar />);

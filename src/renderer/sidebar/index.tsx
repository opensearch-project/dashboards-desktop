/**
 * Desktop Management Sidebar — Slack-style left panel.
 * Renders in its own BrowserView, managed by Electron.
 *
 * Sections: Connections, Config, Plugins, Chat, Settings
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './sidebar.css';

type Section = 'home' | 'connections' | 'config' | 'plugins' | 'chat' | 'settings';

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
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
              } else if (item.id === 'home') {
                window.osd?.agent?.send('__navigate_home__').catch(() => {});
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
  const [saved, setSaved] = React.useState(false);
  const [enabledPlugins, setEnabledPlugins] = React.useState<string[]>([]);

  const COMMON_PLUGINS = ['alerting', 'anomalyDetection', 'ganttChart', 'indexManagement', 'maps', 'observability', 'queryWorkbench', 'reportsDashboards', 'securityDashboards'];

  React.useEffect(() => {
    window.osd?.settings?.get('osd_status').then(s => setOsdStatus(s ?? 'unknown')).catch(() => {});
    window.osd?.settings?.get('osd_config_yml').then(c => setConfig(c ?? '')).catch(() => {});
    window.osd?.settings?.get('enabled_plugins').then(p => setEnabledPlugins(p ? JSON.parse(p) : COMMON_PLUGINS)).catch(() => {});
  }, []);

  const handleSave = async () => {
    await window.osd?.settings?.set('osd_config_yml', config).catch(() => {});
    await window.osd?.settings?.set('enabled_plugins', JSON.stringify(enabledPlugins)).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePlugin = (name: string) => {
    setEnabledPlugins(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

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
        placeholder="# opensearch_dashboards.yml overrides"
      />
      <h3 className="subsection-title">Plugin Toggles</h3>
      <ul className="toggle-list" role="list">
        {COMMON_PLUGINS.map(p => (
          <li key={p} className="toggle-item">
            <label className="toggle-label">
              <input type="checkbox" checked={enabledPlugins.includes(p)} onChange={() => togglePlugin(p)} />
              <span>{p}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="panel-actions">
        <button className="btn-sm" onClick={handleSave}>{saved ? '✓ Saved' : 'Save'}</button>
        <button className="btn-sm btn-warning" onClick={() => window.osd?.agent?.send('__restart_osd__').catch(() => {})}>Restart OSD</button>
      </div>
    </section>
  );
};

const PluginsPanel: React.FC = () => {
  const [plugins, setPlugins] = React.useState<Array<{ name: string; installed: boolean; source?: string }>>([]);
  const [installing, setInstalling] = React.useState(false);
  const [installInput, setInstallInput] = React.useState('');
  const [showInstall, setShowInstall] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    window.osd?.plugins?.list().then(setPlugins).catch(() => {});
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleInstall = async () => {
    if (!installInput.trim()) return;
    setInstalling(true);
    setError('');
    try {
      await window.osd?.plugins?.install(installInput.trim());
      setInstallInput('');
      setShowInstall(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Install failed');
    }
    setInstalling(false);
  };

  const handleRemove = async (name: string) => {
    try {
      await window.osd?.plugins?.uninstall(name);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  };

  return (
    <section aria-label="Plugin Management">
      <div className="panel-header">
        <h2>Plugins</h2>
        <button className="btn-sm" onClick={() => setShowInstall(s => !s)} aria-label="Install plugin">+ Install</button>
      </div>
      {error && <p className="panel-error" role="alert">{error}</p>}
      {showInstall && (
        <div className="install-form">
          <input
            className="settings-input"
            value={installInput}
            onChange={e => setInstallInput(e.target.value)}
            placeholder="Plugin name or URL"
            aria-label="Plugin source"
            onKeyDown={e => { if (e.key === 'Enter') handleInstall(); if (e.key === 'Escape') setShowInstall(false); }}
            autoFocus
          />
          <button className="btn-sm" onClick={handleInstall} disabled={installing}>{installing ? 'Installing…' : 'Install'}</button>
        </div>
      )}
      {plugins.length === 0 ? (
        <p className="panel-empty" role="status">No plugins tracked</p>
      ) : (
        <ul className="plugin-list" role="list">
          {plugins.map(p => (
            <li key={p.name} className="plugin-item">
              <span className="plugin-name">{p.name}</span>
              {p.source && <span className="plugin-source">{p.source}</span>}
              <span className={`plugin-badge ${p.installed ? 'installed' : 'tracked'}`}>{p.installed ? '●' : '○'}</span>
              <button className="btn-xs btn-danger" onClick={() => handleRemove(p.name)} aria-label={`Remove ${p.name}`}>✕</button>
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

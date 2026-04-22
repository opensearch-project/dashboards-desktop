/**
 * Desktop Management Sidebar — Slack-style left panel.
 * Renders in its own BrowserView, managed by Electron.
 *
 * Sections: Connections, Config, Plugins, Update, Feedback, Chat, Settings
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './sidebar.css';

type Section = 'home' | 'connections' | 'config' | 'plugins' | 'update' | 'chat' | 'feedback' | 'settings';

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'connections', icon: '🔌', label: 'Connections' },
  { id: 'config', icon: '⚙️', label: 'OSD Config' },
  { id: 'plugins', icon: '🧩', label: 'Plugins' },
  { id: 'update', icon: '🔄', label: 'Update OSD' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'feedback', icon: '📣', label: 'Feedback' },
  { id: 'settings', icon: '🔧', label: 'Settings' },
];

const Sidebar: React.FC = () => {
  const [active, setActive] = useState<Section>('connections');
  const [collapsed, setCollapsed] = useState(false);
  const [theme, _setTheme] = useState<'dark' | 'light'>('dark');
  const [showTour, setShowTour] = React.useState(false);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [badges, setBadges] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Show tour on first launch
  React.useEffect(() => {
    window.osd?.settings?.get('onboarding_done').then(v => {
      if (!v) setShowTour(true);
    }).catch(() => {});
  }, []);

  const dismissTour = () => {
    setShowTour(false);
    window.osd?.settings?.set('onboarding_done', 'true').catch(() => {});
  };

  // Toast helper
  const _addToast = React.useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // Fetch badge counts
  React.useEffect(() => {
    Promise.all([
      window.osd?.indices?.list().then(list => setBadges(b => ({ ...b, config: list?.length ?? 0 }))).catch(() => {}),
      window.osd?.plugins?.list().then(list => setBadges(b => ({ ...b, plugins: list?.length ?? 0 }))).catch(() => {}),
      window.osd?.connections?.list().then(list => setBadges(b => ({ ...b, connections: list?.length ?? 0 }))).catch(() => {}),
    ]);
  }, []);

  const [navFilter, setNavFilter] = React.useState('');
  const [notifications, setNotifications] = React.useState<Array<{ id: number; text: string; time: number }>>([]);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [connHealth, setConnHealth] = React.useState<Array<{ name: string; status: string }>>([]);

  // Poll connection health
  React.useEffect(() => {
    const poll = () => window.osd?.connections?.list().then(setConnHealth).catch(() => {});
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  const filteredNav = navFilter ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(navFilter.toLowerCase())) : NAV_ITEMS;
  const activeLabel = NAV_ITEMS.find(i => i.id === active)?.label ?? '';

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`} data-theme={theme}>
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
        {!collapsed && (
          <button className="sidebar-notif-btn" onClick={() => setShowNotifs(s => !s)} aria-label={`Notifications (${notifications.length})`} title="Notifications">
            🔔{notifications.length > 0 && <span className="notif-dot" />}
          </button>
        )}
      </header>

      {showNotifs && !collapsed && (
        <div className="notif-panel" role="region" aria-label="Notifications">
          <div className="panel-header"><h3>Notifications</h3></div>
          {notifications.length === 0 ? <p className="panel-empty">No notifications</p> : (
            <ul className="notif-list">{notifications.map(n => (
              <li key={n.id} className="notif-item">{n.text}</li>
            ))}</ul>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="sidebar-search">
          <input className="sidebar-search-input" value={navFilter} onChange={e => setNavFilter(e.target.value)} placeholder="Filter…" aria-label="Filter navigation" />
        </div>
      )}

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {filteredNav.map(item => (
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
            {badges[item.id] != null && badges[item.id] > 0 && (
              <span className="sidebar-badge" aria-label={`${badges[item.id]} items`}>{badges[item.id]}</span>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && activeLabel && (
        <div className="sidebar-breadcrumb" aria-label="Breadcrumb">
          <span className="breadcrumb-root">Desktop</span> <span className="breadcrumb-sep">›</span> <span className="breadcrumb-current">{activeLabel}</span>
        </div>
      )}

      <main className="sidebar-content" id="sidebar-content" aria-live="polite">
        {active === 'connections' && <ConnectionsPanel />}
        {active === 'config' && <ConfigPanel />}
        {active === 'plugins' && <PluginsPanel />}
        {active === 'update' && <UpdatePanel />}
        {active === 'feedback' && <FeedbackPanel />}
        {active === 'settings' && <SettingsPanel />}
      </main>
      {showTour && <OnboardingTour onDone={dismissTour} />}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {!collapsed && (
        <footer className="sidebar-status-bar" aria-label="Connection status">
          {connHealth.length === 0 ? <span className="status-text">No connections</span> : connHealth.map(c => (
            <span key={c.name} className="status-item"><span className={`conn-status ${c.status ?? 'unknown'}`} />{c.name}</span>
          ))}
        </footer>
      )}
    </div>
  );
};

// --- Section Components ---

const ConnectionsPanel: React.FC = () => {
  const [connections, setConnections] = React.useState<Array<{ id: string; name: string; url: string; status?: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [wizard, setWizard] = React.useState<null | { step: number; type: string; url: string; auth: string; name: string; testing: boolean; result: string }>(null);

  const load = React.useCallback(() => {
    window.osd?.connections?.list().then(conns => {
      setConnections(conns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const startWizard = () => setWizard({ step: 0, type: 'opensearch', url: 'https://localhost:9200', auth: '', name: '', testing: false, result: '' });

  const testConnection = async () => {
    if (!wizard) return;
    setWizard({ ...wizard, testing: true, result: '' });
    try {
      await window.osd?.connections?.test({ name: wizard.name, url: wizard.url, auth: wizard.auth } as never);
      setWizard(w => w ? { ...w, testing: false, result: 'success', step: 3 } : null);
    } catch {
      setWizard(w => w ? { ...w, testing: false, result: 'failed' } : null);
    }
  };

  const saveConnection = async () => {
    if (!wizard) return;
    await window.osd?.connections?.add({ name: wizard.name || wizard.url, url: wizard.url, auth: wizard.auth } as never).catch(() => {});
    setWizard(null);
    load();
  };

  if (loading) return <div className="panel-loading" role="status">Loading…</div>;

  if (wizard) {
    const steps = ['Type', 'Details', 'Test', 'Save'];
    return (
      <section aria-label="Add Connection">
        <div className="panel-header"><h2>New Connection</h2></div>
        <div className="wizard-steps">{steps.map((s, i) => (
          <span key={s} className={`wizard-step ${i === wizard.step ? 'active' : ''} ${i < wizard.step ? 'done' : ''}`}>{i < wizard.step ? '✓' : i + 1}. {s}</span>
        ))}</div>
        {wizard.step === 0 && (
          <div className="settings-group">
            <label>Cluster Type</label>
            <select className="settings-input" value={wizard.type} onChange={e => setWizard({ ...wizard, type: e.target.value })}>
              <option value="opensearch">OpenSearch</option>
              <option value="elasticsearch">Elasticsearch</option>
            </select>
            <div className="panel-actions"><button className="btn-sm" onClick={() => setWizard({ ...wizard, step: 1 })}>Next</button></div>
          </div>
        )}
        {wizard.step === 1 && (
          <div className="settings-group">
            <label>URL</label>
            <input className="settings-input" value={wizard.url} onChange={e => setWizard({ ...wizard, url: e.target.value })} placeholder="https://localhost:9200" />
            <label>Name (optional)</label>
            <input className="settings-input" value={wizard.name} onChange={e => setWizard({ ...wizard, name: e.target.value })} placeholder="My Cluster" />
            <label>Auth (user:pass or token)</label>
            <input className="settings-input" type="password" value={wizard.auth} onChange={e => setWizard({ ...wizard, auth: e.target.value })} placeholder="Optional" />
            <div className="panel-actions">
              <button className="btn-sm" onClick={() => setWizard({ ...wizard, step: 0 })}>Back</button>
              <button className="btn-sm" onClick={testConnection} disabled={!wizard.url}>{wizard.testing ? 'Testing…' : 'Test Connection'}</button>
            </div>
            {wizard.result === 'failed' && <p className="panel-error" role="alert">Connection failed. Check URL and auth.</p>}
          </div>
        )}
        {wizard.step === 2 && (
          <div className="settings-group">
            <div className="panel-loading">Testing connection…</div>
          </div>
        )}
        {wizard.step === 3 && (
          <div className="settings-group">
            <p style={{ color: 'var(--accent)', fontWeight: 500 }}>✓ Connection successful!</p>
            <div className="panel-actions">
              <button className="btn-sm" onClick={saveConnection}>Save</button>
              <button className="btn-sm" onClick={() => setWizard(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Connections">
      <div className="panel-header">
        <h2>Connections</h2>
        <button className="btn-sm" onClick={startWizard} aria-label="Add connection">+ Add</button>
      </div>
      {connections.length === 0 ? (
        <div className="empty-state" role="status">
          <span className="empty-icon" aria-hidden="true">🔌</span>
          <p className="empty-title">No connections</p>
          <p className="empty-subtitle">Connect to an OpenSearch or Elasticsearch cluster to get started.</p>
          <button className="btn-sm" onClick={startWizard}>Add Connection</button>
        </div>
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

const COMMON_PLUGINS = ['alerting', 'anomalyDetection', 'ganttChart', 'indexManagement', 'maps', 'observability', 'queryWorkbench', 'reportsDashboards', 'securityDashboards'];

const ConfigPanel: React.FC = () => {
  const [osdStatus, setOsdStatus] = React.useState<string>('unknown');
  const [config, setConfig] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [enabledPlugins, setEnabledPlugins] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      window.osd?.settings?.get('osd_status').then(s => setOsdStatus(s ?? 'unknown')).catch(() => {}),
      window.osd?.settings?.get('osd_config_yml').then(c => setConfig(c ?? '')).catch(() => {}),
      window.osd?.settings?.get('enabled_plugins').then(p => setEnabledPlugins(p ? JSON.parse(p) : COMMON_PLUGINS)).catch(() => {}),
    ]).finally(() => setLoading(false));
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
      {loading ? <div className="panel-loading" role="status">Loading…</div> : <>
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
      </>}
    </section>
  );
};

const PluginsPanel: React.FC = () => {
  const [plugins, setPlugins] = React.useState<Array<{ name: string; installed: boolean; source?: string }>>([]);
  const [installing, setInstalling] = React.useState(false);
  const [installInput, setInstallInput] = React.useState('');
  const [showInstall, setShowInstall] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    window.osd?.plugins?.list().then(setPlugins).catch(() => {}).finally(() => setLoading(false));
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
      {loading ? <div className="panel-loading" role="status">Loading…</div> : <>
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
        <div className="empty-state" role="status">
          <span className="empty-icon" aria-hidden="true">🧩</span>
          <p className="empty-title">No plugins</p>
          <p className="empty-subtitle">Install plugins to extend OpenSearch Dashboards.</p>
        </div>
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
      </>}
    </section>
  );
};

const UpdatePanel: React.FC = () => {
  const [current, setCurrent] = React.useState('');
  const [latest, setLatest] = React.useState('');
  const [available, setAvailable] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.osd?.osdUpgrade?.getVersion().then(v => setCurrent(v ?? 'unknown')).catch(() => {}).finally(() => setLoading(false));
    const unsub = window.osd?.osdUpgrade?.onProgress((p: { percent: number }) => setProgress(p.percent));
    return () => { if (unsub) unsub(); };
  }, []);

  const checkUpdate = async () => {
    setChecking(true); setError('');
    try {
      const result = await window.osd?.osdUpgrade?.checkAvailable();
      if (result) { setAvailable(result.available); setCurrent(result.current); setLatest(result.latest); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Check failed'); }
    setChecking(false);
  };

  const doUpgrade = async () => {
    setUpgrading(true); setProgress(0); setError('');
    try {
      await window.osd?.osdUpgrade?.upgrade();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upgrade failed'); }
    setUpgrading(false);
  };

  return (
    <section aria-label="Update OSD">
      <div className="panel-header"><h2>Update OSD</h2></div>
      {loading ? <div className="panel-loading" role="status">Loading…</div> : <>
      <div className="update-version">
        <span className="update-label">Current:</span>
        <span className="update-value">{current || '—'}</span>
      </div>
      {latest && (
        <div className="update-version">
          <span className="update-label">Latest:</span>
          <span className="update-value">{latest}</span>
        </div>
      )}
      {error && <p className="panel-error" role="alert">{error}</p>}
      {upgrading && (
        <div className="update-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="update-progress-bar" style={{ width: `${progress}%` }} />
          <span className="update-progress-text">{progress}%</span>
        </div>
      )}
      <div className="panel-actions">
        {!available && <button className="btn-sm" onClick={checkUpdate} disabled={checking}>{checking ? 'Checking…' : 'Check for Updates'}</button>}
        {available && !upgrading && <button className="btn-sm btn-warning" onClick={doUpgrade}>Upgrade to {latest}</button>}
      </div>
      </>}
    </section>
  );
};

const FeedbackPanel: React.FC = () => {
  const [type, setType] = React.useState('bug');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [meta, setMeta] = React.useState<{ screenshot?: string; errors?: string[]; os?: string; osdVersion?: string; appVersion?: string; plugins?: string[] } | null>(null);
  const [metaOpen, setMetaOpen] = React.useState(false);
  const [removeScreenshot, setRemoveScreenshot] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.osd?.feedback?.collectMeta().then(setMeta).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await window.osd?.feedback?.submit(JSON.stringify({
        type, title, description,
        includeScreenshot: !removeScreenshot,
      }));
    } catch { /* sde handles errors */ }
    setSubmitting(false);
  };

  const TYPES = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'general', label: 'General Feedback' },
  ];

  return (
    <section aria-label="Send Feedback">
      <div className="panel-header"><h2>Feedback</h2></div>
      {loading ? <div className="panel-loading" role="status">Loading…</div> : <>
      <div className="settings-group">
        <label htmlFor="fb-type">Type</label>
        <select id="fb-type" className="settings-input" value={type} onChange={e => setType(e.target.value)}>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="settings-group">
        <label htmlFor="fb-title">Title</label>
        <input id="fb-title" className="settings-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief summary" />
      </div>

      <div className="settings-group">
        <label htmlFor="fb-desc">Description</label>
        <textarea id="fb-desc" className="feedback-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details (optional)" />
      </div>

      {meta && (
        <details className="feedback-meta" open={metaOpen} onToggle={e => setMetaOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="subsection-title" style={{ cursor: 'pointer' }}>Auto-collected info</summary>
          <div className="feedback-meta-content">
            {meta.screenshot && !removeScreenshot && (
              <div className="feedback-screenshot">
                <img src={meta.screenshot} alt="App screenshot" className="feedback-thumb" />
                <button className="btn-xs btn-danger" onClick={() => setRemoveScreenshot(true)}>Remove</button>
              </div>
            )}
            {meta.errors && meta.errors.length > 0 && (
              <div className="feedback-meta-row"><span className="update-label">Console errors:</span> <span>{meta.errors.length}</span></div>
            )}
            {meta.os && <div className="feedback-meta-row"><span className="update-label">OS:</span> <span>{meta.os}</span></div>}
            {meta.osdVersion && <div className="feedback-meta-row"><span className="update-label">OSD:</span> <span>{meta.osdVersion}</span></div>}
            {meta.appVersion && <div className="feedback-meta-row"><span className="update-label">Desktop:</span> <span>{meta.appVersion}</span></div>}
            {meta.plugins && meta.plugins.length > 0 && (
              <div className="feedback-meta-row"><span className="update-label">Plugins:</span> <span>{meta.plugins.join(', ')}</span></div>
            )}
          </div>
        </details>
      )}

      <div className="panel-actions">
        <button className="btn-sm" onClick={handleSubmit} disabled={submitting || !title.trim()}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      </>}
    </section>
  );
};

const SettingsPanel: React.FC = () => {
  const [theme, _setTheme] = React.useState(() => document.documentElement.getAttribute('data-theme') || 'system');

  const applyTheme = (value: string) => {
    _setTheme(value);
    if (value === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', value);
    }
    window.osd?.settings?.set('sidebar_theme', value).catch(() => {});
  };

  React.useEffect(() => {
    window.osd?.settings?.get('sidebar_theme').then(saved => {
      if (saved && saved !== 'system') {
        document.documentElement.setAttribute('data-theme', saved);
        _setTheme(saved);
      }
    }).catch(() => {});
  }, []);

  return (
  <section aria-label="Settings">
    <div className="panel-header"><h2>Settings</h2></div>
    <div className="settings-group">
      <label htmlFor="theme-select">Theme</label>
      <select id="theme-select" className="settings-input" value={theme} onChange={e => applyTheme(e.target.value)}>
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </div>
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
    <h3 className="subsection-title">Chat</h3>
    <div className="settings-group">
      <label className="toggle-label"><input type="checkbox" defaultChecked /> <span>Show token count</span></label>
    </div>
    <div className="settings-group">
      <label className="toggle-label"><input type="checkbox" defaultChecked /> <span>Stream responses</span></label>
    </div>
    <h3 className="subsection-title">Notifications</h3>
    <div className="settings-group">
      <label className="toggle-label"><input type="checkbox" defaultChecked /> <span>Show toast notifications</span></label>
    </div>
    <h3 className="subsection-title">Data</h3>
    <div className="settings-group">
      <button className="btn-sm btn-danger" onClick={() => { if (confirm('Reset all settings?')) window.osd?.settings?.set('factory_reset', 'true').catch(() => {}); }}>Factory Reset</button>
    </div>
  </section>
  );
};

// --- Onboarding Tour ---
const TOUR_STEPS = [
  { target: '.sidebar-nav', title: 'Navigation', text: 'Switch between connections, config, plugins, and more.' },
  { target: '.sidebar-nav-item[title="Chat"]', title: 'AI Chat', text: 'Ask questions about your clusters, data, or anything else.' },
  { target: '.sidebar-nav-item[title="Settings"]', title: 'Settings', text: 'Configure paths, themes, and export your settings.' },
];

const OnboardingTour: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [step, setStep] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, [step]);
  const current = TOUR_STEPS[step];
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onDone(); if (e.key === 'Tab') { const focusable = ref.current?.querySelectorAll('button'); if (focusable && e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable[focusable.length - 1].focus(); } else if (focusable && !e.shiftKey && document.activeElement === focusable[focusable.length - 1]) { e.preventDefault(); focusable[0].focus(); } } };
  return (
    <div className="tour-overlay" onClick={onDone} role="dialog" aria-modal="true" aria-label="Onboarding tour">
      <div className="tour-tooltip" ref={ref} tabIndex={-1} onClick={e => e.stopPropagation()} onKeyDown={onKey}>
        <div className="tour-step">{step + 1}/{TOUR_STEPS.length}</div>
        <h3 className="tour-title">{current.title}</h3>
        <p className="tour-text">{current.text}</p>
        <div className="panel-actions">
          {step > 0 && <button className="btn-sm" onClick={() => setStep(s => s - 1)}>Back</button>}
          {step < TOUR_STEPS.length - 1
            ? <button className="btn-sm" onClick={() => setStep(s => s + 1)}>Next</button>
            : <button className="btn-sm" onClick={onDone}>Done</button>}
          <button className="btn-sm" onClick={onDone} style={{ marginLeft: 'auto' }}>Skip</button>
        </div>
      </div>
    </div>
  );
};

// --- Toast Notifications ---
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string }
let toastId = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
  <div className="toast-container" aria-live="polite">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`} role="alert">
        <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'} {t.message}</span>
        <button className="btn-xs" onClick={() => onDismiss(t.id)} aria-label="Dismiss">✕</button>
      </div>
    ))}
  </div>
);

// --- Mount ---
const root = createRoot(document.getElementById('root')!);
root.render(<Sidebar />);

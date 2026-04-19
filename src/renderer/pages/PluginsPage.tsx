import React, { useState, useEffect } from 'react';
import type { PluginInfo } from '../../core/types';

export const PluginsPage: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [installSource, setInstallSource] = useState('');
  const [installing, setInstalling] = useState(false);
  const [detail, setDetail] = useState<PluginInfo | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setPlugins(await window.osd.plugins.list()); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInstall = async () => {
    if (!installSource.trim()) return;
    setInstalling(true); setError('');
    try { await window.osd.plugins.install(installSource.trim()); setInstallOpen(false); setInstallSource(''); load(); }
    catch (e: any) { setError(e.message); }
    setInstalling(false);
  };

  const handleUninstall = async (name: string) => {
    if (!confirm(`Uninstall "${name}"?`)) return;
    try { await window.osd.plugins.uninstall(name); load(); }
    catch (e: any) { setError(e.message); }
  };

  const togglePlugin = async (p: PluginInfo) => {
    try {
      if (p.enabled) await window.osd.plugins.disable(p.name);
      else await window.osd.plugins.enable(p.name);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const filtered = search ? plugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : plugins;

  if (loading) return <div className="page-loading" role="status">Loading plugins…</div>;

  return (
    <div className="admin-page" role="region" aria-label="Plugin manager">
      <header className="admin-header">
        <h1>Plugins ({plugins.length})</h1>
        <div className="admin-header-actions">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plugins…" aria-label="Search plugins" className="admin-search" />
          <button className="btn-primary btn-sm" onClick={() => setInstallOpen(true)}>+ Install Plugin</button>
          <button className="btn-sm" onClick={load} aria-label="Refresh">↻</button>
        </div>
      </header>

      {error && <div className="admin-error" role="alert">{error} <button className="btn-link" onClick={() => setError('')}>Dismiss</button></div>}

      {filtered.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{search ? 'No matching plugins' : 'No plugins installed'}</p>
          <button className="btn-primary" onClick={() => setInstallOpen(true)}>Install your first plugin</button>
        </div>
      ) : (
        <div className="plugin-grid" role="list">
          {filtered.map(p => (
            <div key={p.name} className={`plugin-card ${!p.enabled ? 'plugin-disabled' : ''}`} role="listitem">
              <div className="plugin-card-header">
                <h3 className="plugin-name">{p.name}</h3>
                <label className="toggle" aria-label={`${p.enabled ? 'Disable' : 'Enable'} ${p.name}`}>
                  <input type="checkbox" checked={p.enabled} onChange={() => togglePlugin(p)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <p className="plugin-desc">{p.description}</p>
              <div className="plugin-meta">
                <span>v{p.version}</span>
                <span>{p.author}</span>
              </div>
              <div className="plugin-actions">
                <button className="btn-sm" onClick={() => setDetail(p)}>Details</button>
                <button className="btn-sm btn-danger-sm" onClick={() => handleUninstall(p.name)}>Uninstall</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail view */}
      {detail && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="plugin-detail-title">
            <h2 id="plugin-detail-title">{detail.name}</h2>
            <div className="plugin-detail-meta">
              <span>Version: {detail.version}</span>
              <span>Author: {detail.author}</span>
              <span>Status: {detail.enabled ? 'Enabled' : 'Disabled'}</span>
              <span>Installed: {detail.installed_at}</span>
            </div>
            <p>{detail.description}</p>
            {detail.homepage && <p><a href={detail.homepage} target="_blank" rel="noopener">Homepage</a></p>}
            {detail.changelog && <details><summary>Changelog</summary><pre className="plugin-changelog">{detail.changelog}</pre></details>}
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Install dialog */}
      {installOpen && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setInstallOpen(false); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="install-plugin-title">
            <h2 id="install-plugin-title">Install Plugin</h2>
            <div className="form-group">
              <label htmlFor="plugin-source">Package name, URL, or local path</label>
              <input id="plugin-source" value={installSource} onChange={e => setInstallSource(e.target.value)} placeholder="opensearch-security-dashboards or ./my-plugin.zip" />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setInstallOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleInstall} disabled={!installSource.trim() || installing}>{installing ? 'Installing…' : 'Install'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

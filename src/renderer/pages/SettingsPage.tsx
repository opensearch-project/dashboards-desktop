import React, { useState, useEffect } from 'react';
import type { UpdateInfo } from '../../core/types';

type Tab = 'general' | 'models' | 'updates' | 'about';

export const SettingsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('general');
  const [theme, setTheme] = useState('system');
  const [defaultModel, setDefaultModel] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [channel, setChannel] = useState<string>('stable');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [t, m, au, ch] = await Promise.all([
        window.osd.settings.get('theme'),
        window.osd.settings.get('defaultModel'),
        window.osd.settings.get('autoUpdate'),
        window.osd.updates.channel(),
      ]);
      if (t) setTheme(t);
      if (m) setDefaultModel(m);
      if (au !== null) setAutoUpdate(au !== 'false');
      if (ch) setChannel(ch);
    })();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    await window.osd.settings.set(key, value);
  };

  const checkUpdates = async () => {
    setChecking(true); setError('');
    try { setUpdateInfo(await window.osd.updates.check()); }
    catch (e: any) { setError(e.message); }
    setChecking(false);
  };

  const installUpdate = async () => {
    try { await window.osd.updates.install(); }
    catch (e: any) { setError(e.message); }
  };

  const changeChannel = async (ch: string) => {
    setChannel(ch);
    await window.osd.updates.setChannel(ch);
  };

  return (
    <div className="admin-page" role="region" aria-label="Settings">
      <header className="admin-header"><h1>Settings</h1></header>

      {error && <div className="admin-error" role="alert">{error} <button className="btn-link" onClick={() => setError('')}>Dismiss</button></div>}

      <div className="admin-tabs" role="tablist">
        {(['general', 'models', 'updates', 'about'] as Tab[]).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <section role="tabpanel" aria-label="General settings" className="settings-section">
          <div className="form-group">
            <label htmlFor="set-theme">Theme</label>
            <select id="set-theme" value={theme} onChange={e => { setTheme(e.target.value); saveSetting('theme', e.target.value); }}>
              <option value="system">System preference</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="set-model">Default Model</label>
            <input id="set-model" value={defaultModel} onChange={e => setDefaultModel(e.target.value)} onBlur={() => saveSetting('defaultModel', defaultModel)} placeholder="ollama:llama3" />
          </div>
        </section>
      )}

      {/* Models */}
      {tab === 'models' && (
        <section role="tabpanel" aria-label="Model providers" className="settings-section">
          <p className="settings-hint">Model providers are configured via the model switcher in the chat panel or via CLI: <code>osd chat --model provider:model</code></p>
          <p className="settings-hint">Supported: Ollama (local), OpenAI, Anthropic, Amazon Bedrock, any OpenAI-compatible API.</p>
          <p className="settings-hint">API keys are stored securely in your OS keychain via Electron safeStorage.</p>
        </section>
      )}

      {/* Updates */}
      {tab === 'updates' && (
        <section role="tabpanel" aria-label="Update settings" className="settings-section">
          <div className="form-group">
            <label htmlFor="set-channel">Update Channel</label>
            <select id="set-channel" value={channel} onChange={e => changeChannel(e.target.value)}>
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
              <option value="nightly">Nightly</option>
            </select>
          </div>
          <div className="form-group">
            <label className="toggle-label">
              <input type="checkbox" checked={autoUpdate} onChange={e => { setAutoUpdate(e.target.checked); saveSetting('autoUpdate', String(e.target.checked)); }} />
              Auto-install updates
            </label>
          </div>
          <div className="settings-update-check">
            <button className="btn-primary" onClick={checkUpdates} disabled={checking}>{checking ? 'Checking…' : 'Check for Updates'}</button>
            {updateInfo && (
              <div className="update-result" role="status">
                {updateInfo.available ? (
                  <>
                    <p>Update available: <strong>v{updateInfo.latest_version}</strong> (current: v{updateInfo.current_version})</p>
                    {updateInfo.release_notes && <details><summary>Release notes</summary><pre>{updateInfo.release_notes}</pre></details>}
                    <button className="btn-primary" onClick={installUpdate}>Install Update</button>
                  </>
                ) : (
                  <p>You&apos;re on the latest version (v{updateInfo.current_version})</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* About */}
      {tab === 'about' && (
        <section role="tabpanel" aria-label="About" className="settings-section">
          <h2>OpenSearch Dashboards Desktop</h2>
          <p>An agent-first, local-first desktop app for managing OpenSearch and Elasticsearch clusters.</p>
          <dl className="about-list">
            <dt>Version</dt><dd>0.1.0</dd>
            <dt>License</dt><dd>Apache-2.0</dd>
            <dt>Repository</dt><dd><a href="https://github.com/opensearch-project/dashboards-desktop" target="_blank" rel="noopener">GitHub</a></dd>
            <dt>Electron</dt><dd>{navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? 'N/A'}</dd>
            <dt>Chrome</dt><dd>{navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? 'N/A'}</dd>
          </dl>
        </section>
      )}
    </div>
  );
};

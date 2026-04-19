import React, { useState, useEffect } from 'react';
import type { SkillInfo, AgentPersona } from '../../core/types';

type Tab = 'skills' | 'agents';

export const SkillsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('skills');
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [personas, setPersonas] = useState<AgentPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [installSource, setInstallSource] = useState('');
  const [installing, setInstalling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p] = await Promise.all([
        window.osd.skills.list(),
        window.osd.agents.listPersonas(),
      ]);
      setSkills(s);
      setPersonas(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleInstall = async () => {
    if (!installSource.trim()) return;
    setInstalling(true);
    try {
      await window.osd.skills.install(installSource.trim());
      setInstallOpen(false);
      setInstallSource('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setInstalling(false);
  };

  const toggleSkill = async (s: SkillInfo) => {
    try {
      await window.osd.skills.activate(s.name);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const switchAgent = async (id: string) => {
    try {
      await window.osd.agents.switchPersona(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading)
    return (
      <div className="page-loading" role="status">
        Loading…
      </div>
    );

  return (
    <div className="admin-page" role="region" aria-label="Skills & Agents">
      <header className="admin-header">
        <h1>Skills &amp; Agents</h1>
        <div className="admin-header-actions">
          <button className="btn-primary btn-sm" onClick={() => setInstallOpen(true)}>
            + Install Skill
          </button>
          <button className="btn-sm" onClick={load} aria-label="Refresh">
            ↻
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-error" role="alert">
          {error}{' '}
          <button className="btn-link" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'skills'}
          className={`admin-tab ${tab === 'skills' ? 'active' : ''}`}
          onClick={() => setTab('skills')}
        >
          Skills ({skills.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === 'agents'}
          className={`admin-tab ${tab === 'agents' ? 'active' : ''}`}
          onClick={() => setTab('agents')}
        >
          Agent Personas ({personas.length})
        </button>
      </div>

      {tab === 'skills' && (
        <section role="tabpanel" aria-label="Skills">
          {skills.length === 0 ? (
            <div className="empty-state" role="status">
              <p>No skills installed</p>
            </div>
          ) : (
            <div className="plugin-grid" role="list">
              {skills.map((s) => (
                <div
                  key={s.name}
                  className={`plugin-card ${!s.enabled ? 'plugin-disabled' : ''}`}
                  role="listitem"
                >
                  <div className="plugin-card-header">
                    <h3 className="plugin-name">{s.name}</h3>
                    <label className="toggle" aria-label={`Toggle ${s.name}`}>
                      <input type="checkbox" checked={s.enabled} onChange={() => toggleSkill(s)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <p className="plugin-desc">{s.description}</p>
                  <div className="plugin-meta">
                    <span>v{s.version}</span>
                    <span>{s.tools.length} tools</span>
                  </div>
                  <div className="plugin-actions">
                    <button
                      className="btn-sm btn-danger-sm"
                      onClick={async () => {
                        await window.osd.skills.remove(s.name);
                        load();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'agents' && (
        <section role="tabpanel" aria-label="Agent Personas">
          {personas.length === 0 ? (
            <div className="empty-state" role="status">
              <p>No agent personas available</p>
            </div>
          ) : (
            <div className="plugin-grid" role="list">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className={`plugin-card ${p.active ? 'plugin-card-active' : ''}`}
                  role="listitem"
                >
                  <div className="plugin-card-header">
                    <h3 className="plugin-name">{p.name}</h3>
                    {p.active && <span className="badge badge-active">Active</span>}
                  </div>
                  <p className="plugin-desc">{p.description}</p>
                  <div className="plugin-meta">
                    <span>{p.skills.length} skills</span>
                  </div>
                  <div className="plugin-actions">
                    {!p.active && (
                      <button className="btn-primary btn-sm" onClick={() => switchAgent(p.id)}>
                        Switch to this agent
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {installOpen && (
        <div
          className="dialog-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInstallOpen(false);
          }}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-skill-title"
          >
            <h2 id="install-skill-title">Install Skill</h2>
            <div className="form-group">
              <label htmlFor="skill-source">Package name or path</label>
              <input
                id="skill-source"
                value={installSource}
                onChange={(e) => setInstallSource(e.target.value)}
                placeholder="opensearch-dba or ./my-skill.ts"
              />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setInstallOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleInstall}
                disabled={!installSource.trim() || installing}
              >
                {installing ? 'Installing…' : 'Install'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

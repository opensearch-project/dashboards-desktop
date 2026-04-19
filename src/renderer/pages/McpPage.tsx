import React, { useState, useEffect } from 'react';
import type { McpServerInfo, McpToolInfo } from '../../core/types';

export const McpPage: React.FC = () => {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [installSource, setInstallSource] = useState('');
  const [installing, setInstalling] = useState(false);
  const [configServer, setConfigServer] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState('');
  const [toolsServer, setToolsServer] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolInfo[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setServers(await window.osd.mcp.list());
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
      await window.osd.mcp.install(installSource.trim());
      setInstallOpen(false);
      setInstallSource('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setInstalling(false);
  };

  const openConfig = async (name: string) => {
    try {
      const cfg = await window.osd.mcp.getConfig(name);
      setConfigJson(JSON.stringify(cfg, null, 2));
      setConfigServer(name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const saveConfig = async () => {
    if (!configServer) return;
    try {
      await window.osd.mcp.setConfig(configServer, JSON.parse(configJson));
      setConfigServer(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const openTools = async (name: string) => {
    try {
      setTools(await window.osd.mcp.tools(name));
      setToolsServer(name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const statusClass = (s: string) =>
    s === 'running' ? 'health-green' : s === 'unhealthy' ? 'health-yellow' : 'health-red';

  if (loading)
    return (
      <div className="page-loading" role="status">
        Loading MCP servers…
      </div>
    );

  return (
    <div className="admin-page" role="region" aria-label="MCP Servers">
      <header className="admin-header">
        <h1>MCP Servers ({servers.length})</h1>
        <div className="admin-header-actions">
          <button className="btn-primary btn-sm" onClick={() => setInstallOpen(true)}>
            + Install Server
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

      {servers.length === 0 ? (
        <div className="empty-state" role="status">
          <p>No MCP servers installed</p>
          <button className="btn-primary" onClick={() => setInstallOpen(true)}>
            Install your first MCP server
          </button>
        </div>
      ) : (
        <table className="admin-table" role="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Tools</th>
              <th>Memory</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.name}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>
                  <span className={`health-dot ${statusClass(s.status)}`} aria-label={s.status} />{' '}
                  {s.status}
                </td>
                <td>
                  <button className="btn-link" onClick={() => openTools(s.name)}>
                    {s.tools_count} tools
                  </button>
                </td>
                <td>{s.memory_mb > 0 ? `${s.memory_mb} MB` : '—'}</td>
                <td className="action-cell">
                  {s.status === 'running' ? (
                    <button
                      className="btn-sm"
                      onClick={async () => {
                        await window.osd.mcp.stop(s.name);
                        load();
                      }}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      className="btn-sm"
                      onClick={async () => {
                        await window.osd.mcp.start(s.name);
                        load();
                      }}
                    >
                      Start
                    </button>
                  )}
                  <button
                    className="btn-sm"
                    onClick={async () => {
                      await window.osd.mcp.restart(s.name);
                      load();
                    }}
                  >
                    Restart
                  </button>
                  <button className="btn-sm" onClick={() => openConfig(s.name)}>
                    Config
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Install dialog */}
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
            aria-labelledby="install-mcp-title"
          >
            <h2 id="install-mcp-title">Install MCP Server</h2>
            <div className="form-group">
              <label htmlFor="mcp-source">npm package or local path</label>
              <input
                id="mcp-source"
                value={installSource}
                onChange={(e) => setInstallSource(e.target.value)}
                placeholder="@modelcontextprotocol/server-filesystem"
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

      {/* Config editor */}
      {configServer && (
        <div
          className="dialog-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfigServer(null);
          }}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-config-title"
          >
            <h2 id="mcp-config-title">Config: {configServer}</h2>
            <div className="form-group">
              <label htmlFor="mcp-config-json">Server Configuration (JSON)</label>
              <textarea
                id="mcp-config-json"
                className="json-editor"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={12}
              />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setConfigServer(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveConfig}>
                Save &amp; Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools list */}
      {toolsServer && (
        <div
          className="dialog-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setToolsServer(null);
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="mcp-tools-title">
            <h2 id="mcp-tools-title">Tools: {toolsServer}</h2>
            {tools.length === 0 ? (
              <p>No tools exposed</p>
            ) : (
              <table className="admin-table" role="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.name}>
                      <td>
                        <code>{t.name}</code>
                      </td>
                      <td>{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setToolsServer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import type { IndexInfo } from '../../core/types';

function formatBytes(b: number): string {
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(1)} GB`;
}

type Dialog = null | 'create' | 'reindex' | 'alias';

export const IndicesPage: React.FC = () => {
  const [indices, setIndices] = useState<IndexInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newSettings, setNewSettings] = useState('{\n  "number_of_shards": 1,\n  "number_of_replicas": 1\n}');
  const [newMappings, setNewMappings] = useState('{}');

  // Reindex form
  const [reindexDest, setReindexDest] = useState('');

  // Alias form
  const [aliasName, setAliasName] = useState('');
  const [aliasIndex, setAliasIndex] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setIndices(await window.osd.indices.list()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = search ? indices.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : indices;

  const handleCreate = async () => {
    try {
      await window.osd.indices.create(newName, JSON.parse(newSettings), JSON.parse(newMappings));
      setDialog(null); setNewName(''); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete index "${name}"? This cannot be undone.`)) return;
    try { await window.osd.indices.delete(name); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const handleReindex = async () => {
    if (!selected || !reindexDest) return;
    try { await window.osd.indices.reindex(selected, reindexDest); setDialog(null); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const handleAddAlias = async () => {
    if (!aliasName || !aliasIndex) return;
    try {
      await window.osd.indices.updateAlias([{ add: { index: aliasIndex, alias: aliasName } }]);
      setDialog(null); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const handleRemoveAlias = async (index: string, alias: string) => {
    try {
      await window.osd.indices.updateAlias([{ remove: { index, alias } }]);
      load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  if (loading) return <div className="page-loading" role="status">Loading indices…</div>;

  return (
    <div className="admin-page" role="region" aria-label="Index management">
      <header className="admin-header">
        <h1>Indices ({indices.length})</h1>
        <div className="admin-header-actions">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter indices…" aria-label="Filter indices" className="admin-search" />
          <button className="btn-sm" onClick={() => setDialog('alias')}>Manage Aliases</button>
          <button className="btn-primary btn-sm" onClick={() => setDialog('create')}>+ Create Index</button>
          <button className="btn-sm" onClick={load} aria-label="Refresh">↻</button>
        </div>
      </header>

      {error && <div className="admin-error" role="alert">{error} <button className="btn-link" onClick={() => setError('')}>Dismiss</button></div>}

      <table className="admin-table" role="table">
        <thead>
          <tr><th>Name</th><th>Health</th><th>Status</th><th>Docs</th><th>Size</th><th>Shards</th><th>Aliases</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filtered.map(idx => (
            <tr key={idx.name}>
              <td><strong>{idx.name}</strong></td>
              <td><span className={`health-dot health-${idx.health}`} aria-label={idx.health} /> {idx.health}</td>
              <td>{idx.status}</td>
              <td>{idx.docs_count.toLocaleString()}</td>
              <td>{formatBytes(idx.store_size_bytes)}</td>
              <td>{idx.primary_shards}p / {idx.replica_shards}r</td>
              <td>{idx.aliases.length ? idx.aliases.map(a => (
                <span key={a} className="alias-tag">
                  {a} <button className="btn-icon-sm" onClick={() => handleRemoveAlias(idx.name, a)} aria-label={`Remove alias ${a}`}>✕</button>
                </span>
              )) : '—'}</td>
              <td className="action-cell">
                {idx.status === 'open'
                  ? <button className="btn-sm" onClick={() => window.osd.indices.close(idx.name).then(load)}>Close</button>
                  : <button className="btn-sm" onClick={() => window.osd.indices.open(idx.name).then(load)}>Open</button>
                }
                <button className="btn-sm" onClick={() => { setSelected(idx.name); setDialog('reindex'); }}>Reindex</button>
                <button className="btn-sm btn-danger-sm" onClick={() => handleDelete(idx.name)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="empty-state" role="status"><p>{search ? 'No matching indices' : 'No indices found'}</p></div>}

      {/* Create Index Dialog */}
      {dialog === 'create' && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-idx-title">
            <h2 id="create-idx-title">Create Index</h2>
            <div className="form-group">
              <label htmlFor="idx-name">Index Name</label>
              <input id="idx-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-index" />
            </div>
            <div className="form-group">
              <label htmlFor="idx-settings">Settings (JSON)</label>
              <textarea id="idx-settings" className="json-editor" value={newSettings} onChange={e => setNewSettings(e.target.value)} rows={4} />
            </div>
            <div className="form-group">
              <label htmlFor="idx-mappings">Mappings (JSON)</label>
              <textarea id="idx-mappings" className="json-editor" value={newMappings} onChange={e => setNewMappings(e.target.value)} rows={4} />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newName}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Reindex Dialog */}
      {dialog === 'reindex' && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="reindex-title">
            <h2 id="reindex-title">Reindex</h2>
            <p>Source: <strong>{selected}</strong></p>
            <div className="form-group">
              <label htmlFor="reindex-dest">Destination Index</label>
              <input id="reindex-dest" value={reindexDest} onChange={e => setReindexDest(e.target.value)} placeholder="new-index-name" />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleReindex} disabled={!reindexDest}>Reindex</button>
            </div>
          </div>
        </div>
      )}

      {/* Alias Dialog */}
      {dialog === 'alias' && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="alias-title">
            <h2 id="alias-title">Add Alias</h2>
            <div className="form-group">
              <label htmlFor="alias-idx">Index</label>
              <select id="alias-idx" value={aliasIndex} onChange={e => setAliasIndex(e.target.value)}>
                <option value="">Select index…</option>
                {indices.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="alias-name">Alias Name</label>
              <input id="alias-name" value={aliasName} onChange={e => setAliasName(e.target.value)} placeholder="my-alias" />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddAlias} disabled={!aliasName || !aliasIndex}>Add Alias</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

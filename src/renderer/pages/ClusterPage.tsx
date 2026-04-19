import React, { useState, useEffect } from 'react';
import type { ClusterHealth, ClusterNode, ShardInfo } from '../../core/types';

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(1)} GB`;
}

export const ClusterPage: React.FC = () => {
  const [health, setHealth] = useState<ClusterHealth | null>(null);
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [shards, setShards] = useState<ShardInfo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, n, s] = await Promise.all([
        window.osd.cluster.health(),
        window.osd.cluster.nodes(),
        window.osd.cluster.shards(),
      ]);
      setHealth(h);
      setNodes(n);
      setShards(s);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load cluster data');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="page-loading" role="status">Loading cluster data…</div>;
  if (error) return (
    <div className="page-error" role="alert">
      <p>Failed to load cluster data: {error}</p>
      <button className="btn-primary" onClick={load}>Retry</button>
    </div>
  );
  if (!health) return null;

  const statusClass = `health-${health.status}`;
  const storagePercent = health.storage_total_bytes ? Math.round((health.storage_used_bytes / health.storage_total_bytes) * 100) : 0;

  return (
    <div className="admin-page" role="region" aria-label="Cluster overview">
      <header className="admin-header">
        <h1>Cluster Overview</h1>
        <button className="btn-sm" onClick={load} aria-label="Refresh">↻ Refresh</button>
      </header>

      {/* Health card */}
      <section className="health-card" aria-label="Cluster health">
        <div className={`health-badge ${statusClass}`}>{health.status.toUpperCase()}</div>
        <div className="health-details">
          <h2>{health.cluster_name}</h2>
          <div className="health-stats">
            <div className="stat"><span className="stat-value">{health.number_of_nodes}</span><span className="stat-label">Nodes</span></div>
            <div className="stat"><span className="stat-value">{health.active_shards}</span><span className="stat-label">Shards</span></div>
            <div className="stat"><span className="stat-value">{health.unassigned_shards}</span><span className="stat-label">Unassigned</span></div>
            <div className="stat">
              <span className="stat-value">{formatBytes(health.storage_used_bytes)}</span>
              <span className="stat-label">{storagePercent}% of {formatBytes(health.storage_total_bytes)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Node list */}
      <section className="admin-section" aria-label="Nodes">
        <h2>Nodes ({nodes.length})</h2>
        <table className="admin-table" role="table">
          <thead>
            <tr><th>Name</th><th>IP</th><th>Roles</th><th>CPU</th><th>Heap</th><th>Disk</th></tr>
          </thead>
          <tbody>
            {nodes.map(n => (
              <tr key={n.id}>
                <td>{n.name}</td>
                <td><code>{n.ip}</code></td>
                <td>{n.roles.join(', ')}</td>
                <td><meter value={n.cpu_percent} max={100} aria-label={`CPU ${n.cpu_percent}%`} />{n.cpu_percent}%</td>
                <td><meter value={n.heap_percent} max={100} aria-label={`Heap ${n.heap_percent}%`} />{n.heap_percent}%</td>
                <td>{n.disk_used_percent}% of {formatBytes(n.disk_total_bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Shard allocation */}
      <section className="admin-section" aria-label="Shard allocation">
        <h2>Shard Allocation ({shards.length})</h2>
        <table className="admin-table" role="table">
          <thead>
            <tr><th>Index</th><th>Shard</th><th>Type</th><th>State</th><th>Node</th><th>Docs</th><th>Size</th></tr>
          </thead>
          <tbody>
            {shards.slice(0, 100).map((s, i) => (
              <tr key={`${s.index}-${s.shard}-${i}`}>
                <td>{s.index}</td>
                <td>{s.shard}</td>
                <td>{s.primary ? 'Primary' : 'Replica'}</td>
                <td><span className={`shard-state shard-${s.state.toLowerCase()}`}>{s.state}</span></td>
                <td>{s.node || '—'}</td>
                <td>{s.docs.toLocaleString()}</td>
                <td>{formatBytes(s.store_bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shards.length > 100 && <p className="table-note">Showing first 100 of {shards.length} shards</p>}
      </section>
    </div>
  );
};

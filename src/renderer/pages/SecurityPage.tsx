import React, { useState, useEffect } from 'react';
import type { SecurityRole, SecurityUser, SecurityTenant } from '../../core/types';

type Tab = 'roles' | 'users' | 'tenants';
type Dialog = null | 'role' | 'user' | 'tenant';

export const SecurityPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('roles');
  const [roles, setRoles] = useState<SecurityRole[]>([]);
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [tenants, setTenants] = useState<SecurityTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);

  // Role form
  const [roleName, setRoleName] = useState('');
  const [roleClusterPerms, setRoleClusterPerms] = useState('');
  const [roleIndexPatterns, setRoleIndexPatterns] = useState('');
  const [roleIndexActions, setRoleIndexActions] = useState('');

  // User form
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoles, setUserRoles] = useState('');
  const [userBackendRoles, setUserBackendRoles] = useState('');

  // Tenant form
  const [tenantName, setTenantName] = useState('');
  const [tenantDesc, setTenantDesc] = useState('');

  const [editing, setEditing] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [r, u, t] = await Promise.all([
        window.osd.security.roles.list(),
        window.osd.security.users.list(),
        window.osd.security.tenants.list(),
      ]);
      setRoles(r); setUsers(u); setTenants(t);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForms = () => {
    setRoleName(''); setRoleClusterPerms(''); setRoleIndexPatterns(''); setRoleIndexActions('');
    setUserName(''); setUserPassword(''); setUserRoles(''); setUserBackendRoles('');
    setTenantName(''); setTenantDesc('');
    setEditing(false);
  };

  const openEditRole = (r: SecurityRole) => {
    setRoleName(r.name);
    setRoleClusterPerms(r.cluster_permissions.join(', '));
    setRoleIndexPatterns(r.index_permissions.map(p => p.index_patterns.join(', ')).join('; '));
    setRoleIndexActions(r.index_permissions.map(p => p.allowed_actions.join(', ')).join('; '));
    setEditing(true); setDialog('role');
  };

  const openEditUser = (u: SecurityUser) => {
    setUserName(u.username);
    setUserRoles(u.roles.join(', '));
    setUserBackendRoles(u.backend_roles.join(', '));
    setUserPassword('');
    setEditing(true); setDialog('user');
  };

  const openEditTenant = (t: SecurityTenant) => {
    setTenantName(t.name); setTenantDesc(t.description);
    setEditing(true); setDialog('tenant');
  };

  const saveRole = async () => {
    try {
      await window.osd.security.roles.save(roleName, {
        cluster_permissions: roleClusterPerms.split(',').map(s => s.trim()).filter(Boolean),
        index_permissions: roleIndexPatterns ? [{
          index_patterns: roleIndexPatterns.split(',').map(s => s.trim()),
          allowed_actions: roleIndexActions.split(',').map(s => s.trim()),
        }] : [],
      });
      setDialog(null); resetForms(); load();
    } catch (e: any) { setError(e.message); }
  };

  const saveUser = async () => {
    try {
      const body: any = {
        backend_roles: userBackendRoles.split(',').map(s => s.trim()).filter(Boolean),
        opendistro_security_roles: userRoles.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (userPassword) body.password = userPassword;
      await window.osd.security.users.save(userName, body);
      setDialog(null); resetForms(); load();
    } catch (e: any) { setError(e.message); }
  };

  const saveTenant = async () => {
    try {
      await window.osd.security.tenants.save(tenantName, { description: tenantDesc });
      setDialog(null); resetForms(); load();
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div className="page-loading" role="status">Loading security configuration…</div>;

  return (
    <div className="admin-page" role="region" aria-label="Security configuration">
      <header className="admin-header">
        <h1>Security</h1>
        <button className="btn-sm" onClick={load} aria-label="Refresh">↻</button>
      </header>

      {error && <div className="admin-error" role="alert">{error} <button className="btn-link" onClick={() => setError('')}>Dismiss</button></div>}

      {/* Tabs */}
      <div className="admin-tabs" role="tablist">
        {(['roles', 'users', 'tenants'] as Tab[]).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'roles' ? roles.length : t === 'users' ? users.length : tenants.length})
          </button>
        ))}
      </div>

      {/* Roles tab */}
      {tab === 'roles' && (
        <section role="tabpanel" aria-label="Roles">
          <div className="admin-toolbar"><button className="btn-primary btn-sm" onClick={() => { resetForms(); setDialog('role'); }}>+ Create Role</button></div>
          <table className="admin-table" role="table">
            <thead><tr><th>Name</th><th>Cluster Permissions</th><th>Index Permissions</th><th>Actions</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.name}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.cluster_permissions.join(', ') || '—'}</td>
                  <td>{r.index_permissions.map(p => p.index_patterns.join(', ')).join('; ') || '—'}</td>
                  <td className="action-cell">
                    <button className="btn-sm" onClick={() => openEditRole(r)}>Edit</button>
                    <button className="btn-sm btn-danger-sm" onClick={async () => { await window.osd.security.roles.delete(r.name); load(); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <section role="tabpanel" aria-label="Users">
          <div className="admin-toolbar"><button className="btn-primary btn-sm" onClick={() => { resetForms(); setDialog('user'); }}>+ Create User</button></div>
          <table className="admin-table" role="table">
            <thead><tr><th>Username</th><th>Roles</th><th>Backend Roles</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.roles.join(', ') || '—'}</td>
                  <td>{u.backend_roles.join(', ') || '—'}</td>
                  <td className="action-cell">
                    <button className="btn-sm" onClick={() => openEditUser(u)}>Edit</button>
                    <button className="btn-sm btn-danger-sm" onClick={async () => { await window.osd.security.users.delete(u.username); load(); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Tenants tab */}
      {tab === 'tenants' && (
        <section role="tabpanel" aria-label="Tenants">
          <div className="admin-toolbar"><button className="btn-primary btn-sm" onClick={() => { resetForms(); setDialog('tenant'); }}>+ Create Tenant</button></div>
          <table className="admin-table" role="table">
            <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.name}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.description || '—'}</td>
                  <td className="action-cell">
                    <button className="btn-sm" onClick={() => openEditTenant(t)}>Edit</button>
                    <button className="btn-sm btn-danger-sm" onClick={async () => { await window.osd.security.tenants.delete(t.name); load(); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Role Dialog */}
      {dialog === 'role' && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="role-title">
            <h2 id="role-title">{editing ? 'Edit' : 'Create'} Role</h2>
            <div className="form-group">
              <label htmlFor="sec-role-name">Role Name</label>
              <input id="sec-role-name" value={roleName} onChange={e => setRoleName(e.target.value)} disabled={editing} />
            </div>
            <div className="form-group">
              <label htmlFor="sec-role-cluster">Cluster Permissions (comma-separated)</label>
              <input id="sec-role-cluster" value={roleClusterPerms} onChange={e => setRoleClusterPerms(e.target.value)} placeholder="cluster_monitor, cluster_composite_ops" />
            </div>
            <div className="form-group">
              <label htmlFor="sec-role-idx">Index Patterns (comma-separated)</label>
              <input id="sec-role-idx" value={roleIndexPatterns} onChange={e => setRoleIndexPatterns(e.target.value)} placeholder="logs-*, metrics-*" />
            </div>
            <div className="form-group">
              <label htmlFor="sec-role-actions">Index Actions (comma-separated)</label>
              <input id="sec-role-actions" value={roleIndexActions} onChange={e => setRoleIndexActions(e.target.value)} placeholder="read, search, indices_monitor" />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => { setDialog(null); resetForms(); }}>Cancel</button>
              <button className="btn-primary" onClick={saveRole} disabled={!roleName}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* User Dialog */}
      {dialog === 'user' && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="user-title">
            <h2 id="user-title">{editing ? 'Edit' : 'Create'} User</h2>
            <div className="form-group">
              <label htmlFor="sec-user-name">Username</label>
              <input id="sec-user-name" value={userName} onChange={e => setUserName(e.target.value)} disabled={editing} />
            </div>
            <div className="form-group">
              <label htmlFor="sec-user-pass">Password{editing ? ' (leave blank to keep)' : ''}</label>
              <input id="sec-user-pass" type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="sec-user-roles">Roles (comma-separated)</label>
              <input id="sec-user-roles" value={userRoles} onChange={e => setUserRoles(e.target.value)} placeholder="admin, readall" />
            </div>
            <div className="form-group">
              <label htmlFor="sec-user-backend">Backend Roles (comma-separated)</label>
              <input id="sec-user-backend" value={userBackendRoles} onChange={e => setUserBackendRoles(e.target.value)} />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => { setDialog(null); resetForms(); }}>Cancel</button>
              <button className="btn-primary" onClick={saveUser} disabled={!userName || (!editing && !userPassword)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Dialog */}
      {dialog === 'tenant' && (
        <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="tenant-title">
            <h2 id="tenant-title">{editing ? 'Edit' : 'Create'} Tenant</h2>
            <div className="form-group">
              <label htmlFor="sec-tenant-name">Tenant Name</label>
              <input id="sec-tenant-name" value={tenantName} onChange={e => setTenantName(e.target.value)} disabled={editing} />
            </div>
            <div className="form-group">
              <label htmlFor="sec-tenant-desc">Description</label>
              <input id="sec-tenant-desc" value={tenantDesc} onChange={e => setTenantDesc(e.target.value)} />
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => { setDialog(null); resetForms(); }}>Cancel</button>
              <button className="btn-primary" onClick={saveTenant} disabled={!tenantName}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

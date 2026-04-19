import React, { useState, useRef, useEffect } from 'react';
import type { Connection, AuthType, ConnectionTestResult } from '@core/types';

interface Props {
  connection: Connection | null; // null = add mode
  workspaceId: string;
  onClose: () => void;
  onSaved: () => void;
}

const AUTH_OPTIONS: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'apikey', label: 'API Key' },
  { value: 'aws-sigv4', label: 'AWS SigV4' },
];

export const ConnectionDialog: React.FC<Props> = ({ connection, workspaceId, onClose, onSaved }) => {
  const isEdit = !!connection;
  const [name, setName] = useState(connection?.name ?? '');
  const [url, setUrl] = useState(connection?.url ?? '');
  const [type, setType] = useState<'opensearch' | 'elasticsearch'>(connection?.type ?? 'opensearch');
  const [authType, setAuthType] = useState<AuthType>(connection?.auth_type ?? 'none');
  const [username, setUsername] = useState(connection?.username ?? '');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState(connection?.region ?? '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, []);

  // Trap focus in dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const buildInput = () => ({
    name, url, type, auth_type: authType, workspace_id: workspaceId,
    ...(authType === 'basic' && { username, password }),
    ...(authType === 'apikey' && { api_key: apiKey }),
    ...(authType === 'aws-sigv4' && { region }),
  });

  const testConnection = async () => {
    setTesting(true); setTestResult(null); setError('');
    try {
      const result = await window.osd?.connection?.test(buildInput());
      setTestResult(result ?? { success: false, error: 'IPC unavailable' });
    } catch (e: any) { setTestResult({ success: false, error: e.message }); }
    setTesting(false);
  };

  const save = async () => {
    if (!testResult?.success) { setError('Please test the connection before saving.'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await window.osd?.connection?.update(connection!.id, buildInput());
      else await window.osd?.connection?.add(buildInput());
      onSaved();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!connection) return;
    await window.osd?.connection?.delete(connection.id);
    onSaved();
  };

  return (
    <div className="dialog-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="conn-dialog-title">
        <h2 id="conn-dialog-title" ref={headingRef} tabIndex={-1}>
          {isEdit ? 'Edit Connection' : 'Add Connection'}
        </h2>

        {error && <div className="dialog-error" role="alert">{error}</div>}

        <div className="form-group">
          <label htmlFor="cd-name">Name</label>
          <input id="cd-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. prod-opensearch" required />
        </div>

        <div className="form-group">
          <label htmlFor="cd-url">URL</label>
          <input id="cd-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cd-type">Type</label>
            <select id="cd-type" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="opensearch">OpenSearch</option>
              <option value="elasticsearch">Elasticsearch</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="cd-auth">Authentication</label>
            <select id="cd-auth" value={authType} onChange={e => { setAuthType(e.target.value as AuthType); setTestResult(null); }}>
              {AUTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Auth-specific fields */}
        {authType === 'basic' && (
          <>
            <div className="form-group">
              <label htmlFor="cd-user">Username</label>
              <input id="cd-user" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="cd-pass">Password</label>
              <input id="cd-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </>
        )}
        {authType === 'apikey' && (
          <div className="form-group">
            <label htmlFor="cd-apikey">API Key</label>
            <input id="cd-apikey" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        )}
        {authType === 'aws-sigv4' && (
          <div className="form-group">
            <label htmlFor="cd-region">AWS Region</label>
            <input id="cd-region" value={region} onChange={e => setRegion(e.target.value)} placeholder="us-east-1" />
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'test-result-pass' : 'test-result-fail'}`} role="status">
            {testResult.success ? (
              <span>✓ Connected — {testResult.cluster_name} (v{testResult.version})</span>
            ) : (
              <div>
                <span>✕ Connection failed: {testResult.error}</span>
                <details className="troubleshoot">
                  <summary>Troubleshoot</summary>
                  <ul>
                    <li>Verify the URL is reachable from this machine</li>
                    <li>Check that credentials are correct</li>
                    <li>Ensure the cluster is running and accepting connections</li>
                    {authType === 'aws-sigv4' && <li>Verify your AWS credentials and region</li>}
                  </ul>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="dialog-actions">
          {isEdit && <button className="btn-danger" onClick={handleDelete} aria-label="Delete connection">Delete</button>}
          <div className="dialog-actions-right">
            <button className="btn-secondary" onClick={testConnection} disabled={!url || testing}>
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!testResult?.success || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

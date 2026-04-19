import React, { useState, useRef, useEffect } from 'react';
import type { AuthType } from '../../core/types';

interface Props {
  onComplete: () => void;
}

const STEPS = ['Welcome', 'Connection', 'Workspace', 'Ready'] as const;

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [connName, setConnName] = useState('');
  const [connUrl, setConnUrl] = useState('');
  const [connType, setConnType] = useState<'opensearch' | 'elasticsearch'>('opensearch');
  const [authType, setAuthType] = useState<AuthType>('none');
  const [wsName, setWsName] = useState('Default');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.osd.connections.test({
        name: connName,
        url: connUrl,
        type: connType,
        auth_type: authType,
        workspace_id: 'default',
      });
      setTestResult(result ?? { success: false, error: 'IPC unavailable' });
    } catch (e: unknown) {
      setTestResult({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
    setTesting(false);
  };

  const saveConnection = async () => {
    if (connName && connUrl) {
      await window.osd.connections.add({
        name: connName,
        url: connUrl,
        type: connType,
        auth_type: authType,
        workspace_id: 'default',
      });
    }
    next();
  };

  const saveWorkspace = async () => {
    if (wsName.trim()) await window.osd.workspaces.create(wsName.trim());
    next();
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : onComplete());
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div className="onboarding" role="dialog" aria-label="Setup wizard" aria-modal="true">
      {/* Progress */}
      <nav className="onboarding-progress" aria-label="Setup progress">
        <ol>
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={i === step ? 'active' : i < step ? 'done' : ''}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="step-num">{i + 1}</span> {s}
            </li>
          ))}
        </ol>
      </nav>

      <div className="onboarding-content">
        {/* Step 1: Welcome */}
        {step === 0 && (
          <section aria-labelledby="welcome-heading">
            <h2 id="welcome-heading" ref={headingRef} tabIndex={-1}>
              Welcome to OpenSearch Dashboards Desktop
            </h2>
            <p>
              An agent-first, local-first desktop app for managing OpenSearch and Elasticsearch
              clusters.
            </p>
            <p>Let&apos;s get you set up in a few quick steps.</p>
            <button className="btn-primary" onClick={next}>
              Get Started
            </button>
          </section>
        )}

        {/* Step 2: Connection */}
        {step === 1 && (
          <section aria-labelledby="conn-heading">
            <h2 id="conn-heading" ref={headingRef} tabIndex={-1}>
              Add a Data Source
            </h2>
            <p>
              Connect to an OpenSearch or Elasticsearch cluster. You can skip this and add one
              later.
            </p>
            <div className="form-group">
              <label htmlFor="ob-conn-name">Connection Name</label>
              <input
                id="ob-conn-name"
                value={connName}
                onChange={(e) => setConnName(e.target.value)}
                placeholder="e.g. prod-opensearch"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ob-conn-url">URL</label>
              <input
                id="ob-conn-url"
                value={connUrl}
                onChange={(e) => setConnUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ob-conn-type">Type</label>
                <select
                  id="ob-conn-type"
                  value={connType}
                  onChange={(e) => setConnType(e.target.value as 'opensearch' | 'elasticsearch')}
                >
                  <option value="opensearch">OpenSearch</option>
                  <option value="elasticsearch">Elasticsearch</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ob-auth-type">Auth</label>
                <select
                  id="ob-auth-type"
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as AuthType)}
                >
                  <option value="none">None</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key</option>
                  <option value="aws-sigv4">AWS SigV4</option>
                </select>
              </div>
            </div>
            {connUrl && (
              <div className="form-actions-inline">
                <button className="btn-secondary" onClick={testConnection} disabled={testing}>
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>
                {testResult && (
                  <span className={testResult.success ? 'test-pass' : 'test-fail'} role="status">
                    {testResult.success ? '✓ Connected' : `✕ ${testResult.error}`}
                  </span>
                )}
              </div>
            )}
            <div className="form-actions">
              <button className="btn-secondary" onClick={next}>
                Skip
              </button>
              <button
                className="btn-primary"
                onClick={saveConnection}
                disabled={!connName || !connUrl}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Workspace */}
        {step === 2 && (
          <section aria-labelledby="ws-heading">
            <h2 id="ws-heading" ref={headingRef} tabIndex={-1}>
              Create a Workspace
            </h2>
            <p>Workspaces group your connections, conversations, and saved objects.</p>
            <div className="form-group">
              <label htmlFor="ob-ws-name">Workspace Name</label>
              <input id="ob-ws-name" value={wsName} onChange={(e) => setWsName(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={back}>
                Back
              </button>
              <button className="btn-primary" onClick={saveWorkspace}>
                Create &amp; Continue
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Ready */}
        {step === 3 && (
          <section aria-labelledby="ready-heading">
            <h2 id="ready-heading" ref={headingRef} tabIndex={-1}>
              You&apos;re All Set!
            </h2>
            <p>Try one of these to get started:</p>
            <ul className="prompt-suggestions" role="list">
              <li>
                <button className="suggestion-btn" onClick={onComplete}>
                  Show me cluster health
                </button>
              </li>
              <li>
                <button className="suggestion-btn" onClick={onComplete}>
                  What can you do?
                </button>
              </li>
              <li>
                <button className="suggestion-btn" onClick={onComplete}>
                  List my indices
                </button>
              </li>
            </ul>
            <button className="btn-primary" onClick={onComplete}>
              Go to Homepage
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

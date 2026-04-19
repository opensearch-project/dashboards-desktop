import React from 'react';
import type { OsdApi } from '../preload/index';

declare global {
  interface Window {
    osd: OsdApi;
  }
}

export function App(): React.ReactElement {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        🏠 OpenSearch Dashboards Desktop
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        M1 Foundation — Shell &amp; Storage
      </p>
      <div
        style={{
          background: '#16213e',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          margin: '0 auto',
        }}
      >
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          💬 Connect a model to start chatting
        </p>
        <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '1rem' }}>
          Chat panel shell — agent runtime ships in M2
        </p>
      </div>
    </div>
  );
}

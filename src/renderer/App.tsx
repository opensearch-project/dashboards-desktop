import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, type Page } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { ClusterPage } from './pages/ClusterPage';
import { IndicesPage } from './pages/IndicesPage';
import { SecurityPage } from './pages/SecurityPage';
import { ChatPanel } from './components/ChatPanel';
import { Onboarding } from './components/Onboarding';
import { ConnectionDialog } from './components/ConnectionDialog';
import type { Workspace, Connection } from '../core/types';

export function App(): React.ReactElement {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFullScreen, setChatFullScreen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);

  useEffect(() => {
    (async () => {
      const val = await window.osd.settings.get('onboarded');
      setOnboarded(val === '1');
    })();
  }, []);

  const refresh = useCallback(async () => {
    const ws = await window.osd.workspaces.list();
    setWorkspaces(ws);
    if (!activeWorkspace && ws.length) setActiveWorkspace(ws.find(w => w.is_default) ?? ws[0]);
    const conns = await window.osd.connections.list(activeWorkspace?.id);
    setConnections(conns);
    if (!activeConnection && conns.length) setActiveConnection(conns[0]);
  }, [activeWorkspace, activeConnection]);

  useEffect(() => { if (onboarded) refresh(); }, [onboarded, refresh]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') { e.preventDefault(); setChatOpen(true); setPage('chat'); }
      if (mod && e.shiftKey && e.key === 'Enter') { e.preventDefault(); setChatFullScreen(f => !f); setChatOpen(true); }
      if (e.key === 'Escape' && chatFullScreen) setChatFullScreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [chatFullScreen]);

  const handleOnboardingComplete = useCallback(async () => {
    await window.osd.settings.set('onboarded', '1');
    setOnboarded(true);
    refresh();
  }, [refresh]);

  const handleNavigate = useCallback((p: Page) => {
    if (p === 'chat') { setChatOpen(true); }
    setPage(p);
  }, []);

  if (onboarded === null) return <div className="app-loading" role="status" aria-label="Loading">Loading…</div>;
  if (!onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  const renderPage = () => {
    switch (page) {
      case 'cluster': return <ClusterPage />;
      case 'indices': return <IndicesPage />;
      case 'security': return <SecurityPage />;
      case 'settings': return <div className="page-placeholder"><h1>Settings</h1><p>Coming in M4.</p></div>;
      default: return (
        <HomePage
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          connections={connections}
          onSwitchWorkspace={setActiveWorkspace}
          onCreateWorkspace={async (name) => { await window.osd.workspaces.create(name); refresh(); }}
          onOpenChat={() => { setChatOpen(true); setPage('chat'); }}
          onAddConnection={() => { setEditingConnection(null); setConnectionDialogOpen(true); }}
          onEditConnection={(conn) => { setEditingConnection(conn); setConnectionDialogOpen(true); }}
          onRefresh={refresh}
        />
      );
    }
  };

  return (
    <div className={`app-shell ${chatOpen ? 'chat-open' : ''} ${chatFullScreen ? 'chat-fullscreen' : ''}`}>
      <Sidebar
        activePage={page}
        onNavigate={handleNavigate}
        activeConnection={activeConnection}
        connections={connections}
        onSwitchConnection={setActiveConnection}
      />

      <main className="app-main" role="main">
        {renderPage()}
      </main>

      {chatOpen && (
        <ChatPanel
          fullScreen={chatFullScreen}
          onClose={() => { setChatOpen(false); setChatFullScreen(false); }}
          onToggleFullScreen={() => setChatFullScreen(f => !f)}
          workspaceId={activeWorkspace?.id}
        />
      )}

      {connectionDialogOpen && (
        <ConnectionDialog
          connection={editingConnection}
          workspaceId={activeWorkspace?.id ?? ''}
          onClose={() => { setConnectionDialogOpen(false); setEditingConnection(null); }}
          onSaved={() => { setConnectionDialogOpen(false); setEditingConnection(null); refresh(); }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPanel } from './components/ChatPanel';
import { CommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/theme.css';

const ChatOverlay: React.FC = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();

  useEffect(() => {
    window.osd.workspaces.list().then(ws => {
      const def = ws.find((w: { is_default?: boolean }) => w.is_default) ?? ws[0];
      if (def) setWorkspaceId(def.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') { e.preventDefault(); setPaletteOpen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleClose = useCallback(() => {
    window.osd.agent.send('__close_overlay__').catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ChatPanel
        fullScreen={true}
        onClose={handleClose}
        onToggleFullScreen={() => {}}
        workspaceId={workspaceId}
      />
      {paletteOpen && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={async (id) => { await window.osd.models.switch(id); }} />}
    </ErrorBoundary>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<ChatOverlay />);

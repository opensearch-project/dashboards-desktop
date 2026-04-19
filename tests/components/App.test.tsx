import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock all child components
vi.mock('../../src/renderer/components/Sidebar', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));
vi.mock('../../src/renderer/pages/HomePage', () => ({
  HomePage: () => <div data-testid="homepage">Homepage</div>,
}));
vi.mock('../../src/renderer/pages/ClusterPage', () => ({
  ClusterPage: () => <div>Cluster</div>,
}));
vi.mock('../../src/renderer/pages/IndicesPage', () => ({
  IndicesPage: () => <div>Indices</div>,
}));
vi.mock('../../src/renderer/pages/SecurityPage', () => ({
  SecurityPage: () => <div>Security</div>,
}));
vi.mock('../../src/renderer/components/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat</div>,
}));
vi.mock('../../src/renderer/components/Onboarding', () => ({
  Onboarding: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="onboarding">
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}));
vi.mock('../../src/renderer/components/ConnectionDialog', () => ({
  ConnectionDialog: () => <div>ConnectionDialog</div>,
}));

import { App } from '../../src/renderer/App';

// Mock window.osd API
const mockOsd = {
  settings: { get: vi.fn(), set: vi.fn() },
  workspaces: { list: vi.fn(), create: vi.fn() },
  connections: { list: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn(), test: vi.fn() },
  credentials: { save: vi.fn(), load: vi.fn() },
  storage: { init: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).window = { ...globalThis.window, osd: mockOsd };
  Object.defineProperty(globalThis, 'window', {
    value: { ...globalThis.window, osd: mockOsd },
    writable: true,
  });
});

describe('App', () => {
  it('shows loading state initially', () => {
    mockOsd.settings.get.mockReturnValue(new Promise(() => {})); // never resolves
    render(<App />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('shows onboarding when not onboarded', async () => {
    mockOsd.settings.get.mockResolvedValue(null);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('onboarding')).toBeTruthy();
    });
  });

  it('shows homepage when onboarded', async () => {
    mockOsd.settings.get.mockResolvedValue('1');
    mockOsd.workspaces.list.mockResolvedValue([{ id: 'ws-1', name: 'Default', is_default: 1 }]);
    mockOsd.connections.list.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('homepage')).toBeTruthy();
      expect(screen.getByTestId('sidebar')).toBeTruthy();
    });
  });
});

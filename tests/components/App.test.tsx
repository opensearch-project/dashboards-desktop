/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all child components to avoid deep dependency chains
vi.mock('../../src/renderer/components/Sidebar', () => ({ Sidebar: () => <nav data-testid="sidebar">Sidebar</nav> }));
vi.mock('../../src/renderer/pages/HomePage', () => ({ HomePage: () => <div data-testid="homepage">Home</div> }));
vi.mock('../../src/renderer/pages/ClusterPage', () => ({ ClusterPage: () => <div>Cluster</div> }));
vi.mock('../../src/renderer/pages/IndicesPage', () => ({ IndicesPage: () => <div>Indices</div> }));
vi.mock('../../src/renderer/pages/SecurityPage', () => ({ SecurityPage: () => <div>Security</div> }));
vi.mock('../../src/renderer/components/ChatPanel', () => ({ ChatPanel: () => <div data-testid="chat-panel">Chat</div> }));
vi.mock('../../src/renderer/components/Onboarding', () => ({
  Onboarding: ({ onComplete }: { onComplete: () => void }) => <div data-testid="onboarding"><button onClick={onComplete}>Done</button></div>,
}));
vi.mock('../../src/renderer/components/ConnectionDialog', () => ({ ConnectionDialog: () => <div>Dialog</div> }));

// Mock window.osd before importing App
const mockOsd = {
  settings: { get: vi.fn(), set: vi.fn() },
  workspaces: { list: vi.fn().mockResolvedValue([]), create: vi.fn() },
  connections: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn(), test: vi.fn() },
  credentials: { save: vi.fn(), load: vi.fn() },
  storage: { init: vi.fn() },
};

Object.defineProperty(window, 'osd', { value: mockOsd, writable: true });

import { App } from '../../src/renderer/App';

beforeEach(() => {
  vi.clearAllMocks();
  mockOsd.settings.get.mockReset();
  mockOsd.workspaces.list.mockResolvedValue([]);
  mockOsd.connections.list.mockResolvedValue([]);
});

describe('App', () => {
  it('shows loading state initially', () => {
    mockOsd.settings.get.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<App />);
    expect(container.textContent).toContain('Loading');
  });

  it('shows onboarding when not onboarded', async () => {
    mockOsd.settings.get.mockResolvedValue(null);
    render(<App />);
    const onboarding = await screen.findByTestId('onboarding');
    expect(onboarding).toBeTruthy();
  });

  it('shows homepage when onboarded', async () => {
    mockOsd.settings.get.mockResolvedValue('1');
    mockOsd.workspaces.list.mockResolvedValue([{ id: 'ws-1', name: 'Default', is_default: 1 }]);
    render(<App />);
    const homepage = await screen.findByTestId('homepage');
    expect(homepage).toBeTruthy();
  });
});

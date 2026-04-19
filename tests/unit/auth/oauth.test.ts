import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron BrowserWindow
const mockLoadURL = vi.fn();
const mockClose = vi.fn();
const mockOn = vi.fn();
const mockWebContentsOn = vi.fn();

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(() => ({
    loadURL: mockLoadURL,
    close: mockClose,
    on: mockOn,
    webContents: { on: mockWebContentsOn },
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { loginGithub } from '../../../src/core/auth/github';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GitHub OAuth PKCE', () => {
  it('opens auth window with correct URL params', async () => {
    // Simulate the redirect with code
    mockWebContentsOn.mockImplementation((event: string, cb: Function) => {
      if (event === 'will-redirect') {
        setTimeout(() => cb({}, 'http://localhost/callback?code=test-code&state=mock-state'), 10);
      }
    });
    mockOn.mockImplementation(() => {});

    // Mock token exchange
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ access_token: 'gh-token-123' }),
    });
    // Mock user info
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ login: 'testuser', name: 'Test User', avatar_url: 'https://avatar', email: 'test@example.com' }),
    });

    // The actual loginGithub will fail because state won't match the random one generated,
    // but we can verify the BrowserWindow was created and loadURL was called
    try {
      await loginGithub('client-id', 'http://localhost/callback');
    } catch {
      // Expected — state mismatch in test env
    }

    expect(mockLoadURL).toHaveBeenCalled();
    const url = mockLoadURL.mock.calls[0][0] as string;
    expect(url).toContain('github.com/login/oauth/authorize');
    expect(url).toContain('client_id=client-id');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('includes PKCE challenge in auth URL', async () => {
    mockWebContentsOn.mockImplementation(() => {});
    mockOn.mockImplementation((event: string, cb: Function) => {
      if (event === 'closed') setTimeout(cb, 50);
    });

    try {
      await loginGithub('client-id', 'http://localhost/callback');
    } catch {
      // Window closed
    }

    const url = mockLoadURL.mock.calls[0][0] as string;
    const parsed = new URL(url);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy();
    expect(parsed.searchParams.get('state')).toBeTruthy();
  });

  it('rejects when auth window is closed without completing', async () => {
    mockWebContentsOn.mockImplementation(() => {});
    mockOn.mockImplementation((event: string, cb: Function) => {
      if (event === 'closed') setTimeout(cb, 10);
    });

    await expect(loginGithub('client-id', 'http://localhost/callback')).rejects.toThrow(/closed/);
  });
});

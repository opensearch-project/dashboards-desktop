/**
 * Auth manager — token storage via safeStorage, current user, logout.
 * Provides IPC handlers for renderer.
 */

import { ipcMain, safeStorage } from 'electron';
import { loginGithub } from './github';
import { loginGoogle } from './google';
import * as fs from 'fs';
import * as path from 'path';

interface AuthUser {
  provider: 'github' | 'google';
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

let currentUser: AuthUser | null = null;
const tokenStore = new Map<string, Buffer>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const GITHUB_TOKEN_REFRESH_MS = 7 * 60 * 60 * 1000; // 7h (tokens expire at 8h)
const TOKEN_DIR = path.join(process.env.HOME ?? '~', '.osd', 'auth');
const USER_FILE = path.join(TOKEN_DIR, 'user.json');

function ensureTokenDir(): void {
  fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
}

function storeToken(key: string, token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    tokenStore.set(key, encrypted);
    ensureTokenDir();
    fs.writeFileSync(path.join(TOKEN_DIR, `${key}.enc`), encrypted, { mode: 0o600 });
  }
}

function loadToken(key: string): string | null {
  const buf = tokenStore.get(key);
  if (buf) return safeStorage.decryptString(buf);
  // Try loading from disk
  const filePath = path.join(TOKEN_DIR, `${key}.enc`);
  if (!fs.existsSync(filePath)) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  const diskBuf = fs.readFileSync(filePath);
  tokenStore.set(key, diskBuf);
  return safeStorage.decryptString(diskBuf);
}

function loadPersistedUser(): void {
  try {
    if (fs.existsSync(USER_FILE)) {
      currentUser = JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
    }
  } catch { /* corrupt file, ignore */ }
}

function persistUser(user: AuthUser | null): void {
  ensureTokenDir();
  if (user) {
    fs.writeFileSync(USER_FILE, JSON.stringify(user), { mode: 0o600 });
  } else if (fs.existsSync(USER_FILE)) {
    fs.unlinkSync(USER_FILE);
  }
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function registerAuthIPC(config: {
  githubClientId: string;
  googleClientId: string;
  redirectUri: string;
}): void {
  // Load persisted session on startup
  loadPersistedUser();
  if (currentUser?.provider === 'github' && loadToken('github')) {
    scheduleGithubRefresh(config);
  }

  ipcMain.handle('auth:loginGithub', async () => {
    const result = await loginGithub(config.githubClientId, config.redirectUri);
    storeToken('github', result.accessToken);
    scheduleGithubRefresh(config);
    currentUser = {
      provider: 'github',
      id: result.user.login,
      name: result.user.name,
      email: result.user.email,
      avatar: result.user.avatar_url,
    };
    persistUser(currentUser);
    return currentUser;
  });

  ipcMain.handle('auth:loginGoogle', async () => {
    const result = await loginGoogle(config.googleClientId, config.redirectUri);
    storeToken('google', result.accessToken);
    currentUser = {
      provider: 'google',
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      avatar: result.user.picture,
    };
    persistUser(currentUser);
    return currentUser;
  });

  ipcMain.handle('auth:logout', () => {
    currentUser = null;
    tokenStore.clear();
    persistUser(null);
    // Remove encrypted token files
    for (const f of ['github.enc', 'google.enc']) {
      const p = path.join(TOKEN_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    return true;
  });

  ipcMain.handle('auth:currentUser', () => {
    return currentUser;
  });
}

function scheduleGithubRefresh(config: { githubClientId: string; redirectUri: string }): void {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    try {
      const result = await loginGithub(config.githubClientId, config.redirectUri);
      storeToken('github', result.accessToken);
    } catch {
      // Silent fail — user will be prompted on next action requiring auth
    }
  }, GITHUB_TOKEN_REFRESH_MS);
}

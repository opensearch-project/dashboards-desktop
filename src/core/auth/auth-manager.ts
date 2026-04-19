/**
 * Auth manager — token storage via safeStorage, current user, logout.
 * Provides IPC handlers for renderer.
 */

import { ipcMain, safeStorage } from 'electron';
import { loginGithub } from './github';
import { loginGoogle } from './google';

interface AuthUser {
  provider: 'github' | 'google';
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

let currentUser: AuthUser | null = null;
const tokenStore = new Map<string, Buffer>();

function storeToken(key: string, token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    tokenStore.set(key, safeStorage.encryptString(token));
  }
}

function loadToken(key: string): string | null {
  const buf = tokenStore.get(key);
  if (!buf) return null;
  return safeStorage.decryptString(buf);
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function registerAuthIPC(config: { githubClientId: string; googleClientId: string; redirectUri: string }): void {
  ipcMain.handle('auth:loginGithub', async () => {
    const result = await loginGithub(config.githubClientId, config.redirectUri);
    storeToken('github', result.accessToken);
    currentUser = {
      provider: 'github',
      id: result.user.login,
      name: result.user.name,
      email: result.user.email,
      avatar: result.user.avatar_url,
    };
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
    return currentUser;
  });

  ipcMain.handle('auth:logout', () => {
    currentUser = null;
    tokenStore.clear();
    return true;
  });

  ipcMain.handle('auth:currentUser', () => {
    return currentUser;
  });
}

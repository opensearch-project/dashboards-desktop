/**
 * GitHub OAuth PKCE flow via Electron BrowserWindow.
 */

import { BrowserWindow } from 'electron';
import * as crypto from 'crypto';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

interface GitHubAuthResult {
  accessToken: string;
  user: { login: string; name: string; avatar_url: string; email: string };
}

export async function loginGithub(
  clientId: string,
  redirectUri: string,
): Promise<GitHubAuthResult> {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = `${GITHUB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

  const code = await openAuthWindow(authUrl, redirectUri, state);

  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token: string };
  if (!tokenData.access_token) throw new Error('GitHub OAuth failed: no access token');

  const userRes = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = (await userRes.json()) as GitHubAuthResult['user'];

  return { accessToken: tokenData.access_token, user };
}

function openAuthWindow(url: string, redirectUri: string, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const win = new BrowserWindow({
      width: 600,
      height: 700,
      show: true,
      webPreferences: { nodeIntegration: false },
    });

    win.webContents.on('will-redirect', (_e, navUrl) => {
      if (resolved || !navUrl.startsWith(redirectUri)) return;
      const params = new URL(navUrl).searchParams;
      const code = params.get('code');
      const state = params.get('state');
      if (state !== expectedState) {
        resolved = true;
        win.close();
        reject(new Error('State mismatch'));
        return;
      }
      if (!code) {
        resolved = true;
        win.close();
        reject(new Error('No code in redirect'));
        return;
      }
      resolved = true;
      win.close();
      resolve(code);
    });

    win.on('closed', () => {
      if (!resolved) reject(new Error('Auth window closed'));
    });
    win.loadURL(url);
  });
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

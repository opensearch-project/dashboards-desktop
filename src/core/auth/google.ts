/**
 * Google OAuth PKCE flow via Electron BrowserWindow.
 */

import { BrowserWindow } from 'electron';
import * as crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface GoogleAuthResult {
  accessToken: string;
  user: { id: string; name: string; email: string; picture: string };
}

export async function loginGoogle(
  clientId: string,
  redirectUri: string,
): Promise<GoogleAuthResult> {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = `${GOOGLE_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

  const code = await openAuthWindow(authUrl, redirectUri, state);

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token: string };
  if (!tokenData.access_token) throw new Error('Google OAuth failed: no access token');

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = (await userRes.json()) as GoogleAuthResult['user'];

  return { accessToken: tokenData.access_token, user };
}

function openAuthWindow(url: string, redirectUri: string, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 600,
      height: 700,
      show: true,
      webPreferences: { nodeIntegration: false },
    });

    win.webContents.on('will-redirect', (_e, navUrl) => {
      if (!navUrl.startsWith(redirectUri)) return;
      const params = new URL(navUrl).searchParams;
      const code = params.get('code');
      const state = params.get('state');
      if (state !== expectedState) {
        win.close();
        reject(new Error('State mismatch'));
        return;
      }
      if (!code) {
        win.close();
        reject(new Error('No code in redirect'));
        return;
      }
      win.close();
      resolve(code);
    });

    win.on('closed', () => reject(new Error('Auth window closed')));
    win.loadURL(url);
  });
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

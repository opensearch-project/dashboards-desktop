/**
 * SSO support — SAML/OIDC for enterprise identity providers.
 * Handles redirect flow via Electron BrowserWindow.
 */

import type { BrowserWindow } from 'electron';

export interface SSOConfig {
  type: 'saml' | 'oidc';
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

export interface SSOResult {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  user: { id: string; email: string; name: string; groups?: string[] };
}

export async function loginSSO(config: SSOConfig, _win: BrowserWindow): Promise<SSOResult> {
  if (config.type === 'oidc') return loginOIDC(config, _win);
  if (config.type === 'saml') return loginSAML(config, _win);
  throw new Error(`Unsupported SSO type: ${config.type}`);
}

async function loginOIDC(config: SSOConfig, _win: BrowserWindow): Promise<SSOResult> {
  // TODO: Implement OIDC authorization code flow with PKCE
  // 1. Open BrowserWindow to issuerUrl/.well-known/openid-configuration
  // 2. Redirect to authorization endpoint with code_challenge
  // 3. Capture redirect with authorization code
  // 4. Exchange code for tokens at token endpoint
  throw new Error(`OIDC login not yet configured. Set issuer URL: ${config.issuerUrl}`);
}

async function loginSAML(config: SSOConfig, _win: BrowserWindow): Promise<SSOResult> {
  // TODO: Implement SAML SP-initiated flow
  // 1. Generate AuthnRequest
  // 2. Open BrowserWindow to IdP SSO URL
  // 3. Capture SAML Response at ACS URL
  // 4. Parse assertion, extract attributes
  throw new Error(`SAML login not yet configured. Set issuer URL: ${config.issuerUrl}`);
}

export async function refreshSSOToken(config: SSOConfig, refreshToken: string): Promise<SSOResult> {
  if (config.type !== 'oidc') throw new Error('Token refresh only supported for OIDC');
  // TODO: POST to token endpoint with grant_type=refresh_token
  throw new Error('SSO token refresh not yet implemented');
}

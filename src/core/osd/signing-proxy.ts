/**
 * Signing Proxy — intercepts Electron requests and injects auth headers.
 * Sits between the OSD BrowserWindow and the OpenSearch cluster.
 */

import { session } from 'electron';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';

export interface ProxyAuth {
  type: 'none' | 'basic' | 'apikey' | 'sigv4';
  username?: string;
  password?: string;
  apiKey?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

/**
 * Registers a request interceptor on the default session.
 * All requests to the target cluster URL get auth headers injected.
 */
export function registerSigningProxy(clusterUrl: string, auth: ProxyAuth): void {
  const filter = { urls: [`${clusterUrl}/*`] };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, async (details, callback) => {
    const headers = { ...details.requestHeaders };

    switch (auth.type) {
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
        break;

      case 'apikey':
        headers['Authorization'] = `ApiKey ${auth.apiKey}`;
        break;

      case 'sigv4':
        if (auth.accessKeyId && auth.secretAccessKey && auth.region) {
          const signed = await signRequest(details.url, details.method, auth);
          Object.assign(headers, signed);
        }
        break;
    }

    callback({ requestHeaders: headers });
  });
}

export function clearSigningProxy(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(null);
}

async function signRequest(
  url: string,
  method: string,
  auth: ProxyAuth,
): Promise<Record<string, string>> {
  const parsed = new URL(url);
  const signer = new SignatureV4({
    service: 'es',
    region: auth.region!,
    credentials: {
      accessKeyId: auth.accessKeyId!,
      secretAccessKey: auth.secretAccessKey!,
      sessionToken: auth.sessionToken,
    },
    sha256: Sha256,
  });

  const request = new HttpRequest({
    method,
    hostname: parsed.hostname,
    port: Number(parsed.port) || 443,
    path: parsed.pathname + parsed.search,
    headers: { host: parsed.host },
  });

  const signed = await signer.sign(request);
  return signed.headers as Record<string, string>;
}

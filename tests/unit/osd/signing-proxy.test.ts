/**
 * Request signing proxy tests.
 * Tests SigV4 injection, auth header passthrough, multi-cluster switching.
 *
 * STUB: Blocked on sde M3 — signing proxy implementation.
 * Expected source: src/core/proxy/signing-proxy.ts (or similar)
 *
 * Test plan:
 * - SigV4: intercepts requests to cluster, adds AWS SigV4 headers
 * - Basic auth: passes username/password to upstream
 * - API key: passes apikey header to upstream
 * - Multi-cluster: switches target URL when active connection changes
 * - Error handling: returns meaningful error when signing fails
 * - Passthrough: non-cluster requests pass through unmodified
 */
import { describe, it, expect, vi } from 'vitest';

describe('Signing Proxy: SigV4', () => {
  it.skip('adds Authorization and x-amz-* headers to requests', async () => {
    // TODO: import SigningProxy from src/core/proxy/signing-proxy
  });

  it.skip('refreshes credentials when expired', async () => {});

  it.skip('includes x-amz-security-token for session credentials', async () => {});
});

describe('Signing Proxy: auth passthrough', () => {
  it.skip('passes basic auth credentials', async () => {});

  it.skip('passes API key in Authorization header', async () => {});

  it.skip('passes no auth for connections with auth_type=none', async () => {});
});

describe('Signing Proxy: multi-cluster', () => {
  it.skip('routes to active connection URL', async () => {});

  it.skip('switches target when active connection changes', async () => {});

  it.skip('rejects requests when no active connection', async () => {});
});

describe('Signing Proxy: error handling', () => {
  it.skip('returns 502 when upstream is unreachable', async () => {});

  it.skip('returns 401 when credential resolution fails', async () => {});

  it.skip('logs proxy errors without crashing', async () => {});
});

/**
 * OSD lifecycle manager tests.
 * Tests spawn, health check, stop, crash recovery for the local OSD instance.
 *
 * STUB: Blocked on sde M3 — OSD lifecycle manager implementation.
 * Expected source: src/core/osd/lifecycle.ts (or similar)
 *
 * Test plan:
 * - spawn: starts OSD process, emits 'ready' when health check passes
 * - health: polls localhost:5601/api/status until green
 * - stop: sends SIGTERM, waits for exit, cleans up
 * - crash recovery: detects unexpected exit, restarts up to N times
 * - port conflict: fails gracefully if 5601 is occupied
 * - timeout: emits error if OSD doesn't become healthy within timeout
 */
import { describe, it, expect, vi } from 'vitest';

describe('OSD Lifecycle: spawn', () => {
  it.skip('starts OSD process and resolves when healthy', async () => {
    // TODO: import OsdLifecycle from src/core/osd/lifecycle
  });

  it.skip('emits ready event with OSD version', async () => {});

  it.skip('rejects if OSD binary not found', async () => {});

  it.skip('rejects if port 5601 is already in use', async () => {});
});

describe('OSD Lifecycle: health check', () => {
  it.skip('polls /api/status until green', async () => {});

  it.skip('times out after configurable duration', async () => {});

  it.skip('retries on connection refused', async () => {});
});

describe('OSD Lifecycle: stop', () => {
  it.skip('sends SIGTERM and waits for exit', async () => {});

  it.skip('force kills after timeout', async () => {});

  it.skip('cleans up PID file on stop', async () => {});
});

describe('OSD Lifecycle: crash recovery', () => {
  it.skip('restarts on unexpected exit', async () => {});

  it.skip('emits max-restarts after exceeding limit', async () => {});

  it.skip('does not restart on intentional stop', async () => {});
});

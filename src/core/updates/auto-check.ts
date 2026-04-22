/**
 * Auto-update notification — checks for new app version on launch + daily.
 * Shows notification in sidebar, does NOT auto-install.
 */

import { checkForUpdate, type ReleaseInfo, type Channel } from './update-checker.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATE_FILE = join(homedir(), '.osd-desktop', 'update-state.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

interface UpdateState {
  lastCheck: number;
  availableVersion: string | null;
  dismissed: string | null; // version user dismissed
}

function loadState(): UpdateState {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastCheck: 0, availableVersion: null, dismissed: null };
  }
}

function saveState(state: UpdateState): void {
  mkdirSync(join(homedir(), '.osd-desktop'), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

export async function checkOnLaunch(
  currentVersion: string,
  channel: Channel = 'stable',
): Promise<ReleaseInfo | null> {
  const state = loadState();
  const now = Date.now();

  if (now - state.lastCheck < CHECK_INTERVAL_MS) {
    // Already checked recently — return cached result
    if (state.availableVersion && state.availableVersion !== state.dismissed) {
      return { version: state.availableVersion } as ReleaseInfo;
    }
    return null;
  }

  const release = await checkForUpdate(currentVersion, channel);
  state.lastCheck = now;
  state.availableVersion = release?.version ?? null;
  saveState(state);

  if (release && release.version === state.dismissed) return null;
  return release;
}

export function dismissUpdate(version: string): void {
  const state = loadState();
  state.dismissed = version;
  saveState(state);
}

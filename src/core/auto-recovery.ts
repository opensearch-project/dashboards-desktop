/**
 * Auto-recovery — detect OSD crash, auto-restart with backoff, notify user.
 */

import { Notification } from 'electron';
import type { OsdLifecycle } from './osd/lifecycle.js';

const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

export function setupAutoRecovery(osd: OsdLifecycle): void {
  let retries = 0;

  osd.on('status', (status: string) => {
    if (status === 'running') retries = 0;
    if (status !== 'error') return;

    if (retries >= MAX_RETRIES) {
      new Notification({ title: 'OSD Crashed', body: `Failed to restart after ${MAX_RETRIES} attempts. Use Bounce to retry manually.` }).show();
      return;
    }

    retries++;
    const delay = BASE_DELAY * Math.pow(2, retries - 1);
    new Notification({ title: 'OSD Crashed', body: `Restarting in ${delay / 1000}s (attempt ${retries}/${MAX_RETRIES})...` }).show();

    setTimeout(async () => {
      try { await osd.start(); } catch { /* next crash will trigger again */ }
    }, delay);
  });
}

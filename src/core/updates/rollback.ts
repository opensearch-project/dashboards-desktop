import * as fs from 'fs';
import * as path from 'path';

const OSD_DIR = path.join(process.env.HOME ?? '~', '.osd');
const BUNDLE_DIR = path.join(OSD_DIR, 'bundle');
const BACKUP_DIR = path.join(OSD_DIR, 'bundle.prev');
const LAUNCH_LOG = path.join(OSD_DIR, 'launch.log');

const CRASH_WINDOW_MS = 30_000; // 30 seconds
const MAX_RAPID_CRASHES = 3;

/** Record a successful launch — resets crash counter */
export function recordLaunchSuccess(): void {
  writeLaunchLog({ lastSuccess: Date.now(), rapidCrashes: 0 });
}

/** Record a launch attempt — increments crash counter if within crash window */
export function recordLaunchAttempt(): { shouldRollback: boolean } {
  const log = readLaunchLog();
  const now = Date.now();

  if (log.lastAttempt && now - log.lastAttempt < CRASH_WINDOW_MS) {
    log.rapidCrashes = (log.rapidCrashes ?? 0) + 1;
  } else {
    log.rapidCrashes = 1;
  }
  log.lastAttempt = now;
  writeLaunchLog(log);

  return { shouldRollback: log.rapidCrashes >= MAX_RAPID_CRASHES };
}

/** Revert to previous bundle version */
export function rollback(): { success: boolean; error?: string } {
  if (!fs.existsSync(BACKUP_DIR)) {
    return { success: false, error: 'No previous version available for rollback' };
  }

  try {
    if (fs.existsSync(BUNDLE_DIR)) {
      fs.rmSync(BUNDLE_DIR, { recursive: true });
    }
    fs.renameSync(BACKUP_DIR, BUNDLE_DIR);
    writeLaunchLog({ lastSuccess: 0, rapidCrashes: 0 });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Rollback failed: ${err instanceof Error ? err.message : err}`,
    };
  }
}

/** Check if a rollback is available */
export function hasBackup(): boolean {
  return fs.existsSync(BACKUP_DIR);
}

interface LaunchLog {
  lastSuccess?: number;
  lastAttempt?: number;
  rapidCrashes?: number;
}

function readLaunchLog(): LaunchLog {
  try {
    return JSON.parse(fs.readFileSync(LAUNCH_LOG, 'utf8'));
  } catch {
    return {};
  }
}

function writeLaunchLog(log: LaunchLog): void {
  fs.mkdirSync(OSD_DIR, { recursive: true });
  fs.writeFileSync(LAUNCH_LOG, JSON.stringify(log));
}

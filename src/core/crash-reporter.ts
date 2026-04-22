/**
 * Crash reporting — Electron crashReporter → S3 bucket.
 * Collects minidumps + metadata, uploads on next launch.
 */

import { crashReporter, app } from 'electron';
import { readFileSync, readdirSync, unlinkSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir, platform, arch, release } from 'os';

const CRASH_DIR = join(homedir(), '.osd-desktop', 'crashes');
const S3_ENDPOINT = 'https://osd-desktop-crashes.s3.amazonaws.com/reports';

interface CrashMeta {
  version: string;
  platform: string;
  arch: string;
  osRelease: string;
  timestamp: string;
  electronVersion: string;
}

/** Initialize crash reporter — call in main process before app.ready */
export function initCrashReporter(): void {
  mkdirSync(CRASH_DIR, { recursive: true });

  crashReporter.start({
    submitURL: '', // We upload manually to S3
    uploadToServer: false,
    compress: true,
    extra: {
      version: app.getVersion(),
      platform: platform(),
      arch: arch(),
    },
  });
}

/** Upload pending crash reports from previous sessions */
export async function uploadPendingCrashes(s3Endpoint?: string): Promise<number> {
  const endpoint = s3Endpoint ?? S3_ENDPOINT;
  const crashPath = crashReporter.getCrashesDirectory?.() ?? CRASH_DIR;
  if (!existsSync(crashPath)) return 0;

  const files = readdirSync(crashPath).filter(f => f.endsWith('.dmp'));
  let uploaded = 0;

  for (const file of files) {
    const filePath = join(crashPath, file);
    try {
      const dump = readFileSync(filePath);
      const meta: CrashMeta = {
        version: app.getVersion(),
        platform: platform(),
        arch: arch(),
        osRelease: release(),
        timestamp: new Date().toISOString(),
        electronVersion: process.versions.electron ?? 'unknown',
      };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Crash-Meta': JSON.stringify(meta),
        },
        body: dump,
      });

      if (res.ok) {
        unlinkSync(filePath);
        uploaded++;
      }
    } catch {
      // Retry next launch
    }
  }

  return uploaded;
}

/** Write a crash breadcrumb (last known state before crash) */
export function writeBreadcrumb(action: string): void {
  const file = join(CRASH_DIR, 'breadcrumb.json');
  const data = { action, timestamp: Date.now(), pid: process.pid };
  writeFileSync(file, JSON.stringify(data));
}

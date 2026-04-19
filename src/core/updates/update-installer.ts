import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import type { DownloadResult } from './update-downloader';

const OSD_DIR = path.join(process.env.HOME ?? '~', '.osd');
const BUNDLE_DIR = path.join(OSD_DIR, 'bundle');
const BACKUP_DIR = path.join(OSD_DIR, 'bundle.prev');
const COMPAT_PATH = path.join(OSD_DIR, 'compat.json');

interface CompatManifest {
  shellVersion: string;
  minBundleVersion: string;
  maxBundleVersion: string;
}

/** Install an OSD bundle update — backs up current, extracts new, validates compat */
export async function installBundleUpdate(
  download: DownloadResult,
  bundleVersion: string,
): Promise<{ success: boolean; error?: string }> {
  // Check semver compatibility
  const compat = loadCompat();
  if (compat && !isCompatible(bundleVersion, compat)) {
    return {
      success: false,
      error: `Bundle ${bundleVersion} incompatible with shell ${compat.shellVersion} (requires ${compat.minBundleVersion}–${compat.maxBundleVersion})`,
    };
  }

  // Backup current bundle
  if (fs.existsSync(BUNDLE_DIR)) {
    if (fs.existsSync(BACKUP_DIR)) fs.rmSync(BACKUP_DIR, { recursive: true });
    fs.renameSync(BUNDLE_DIR, BACKUP_DIR);
  }

  // Extract new bundle
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  try {
    extractTarball(download.filePath, BUNDLE_DIR);
    return { success: true };
  } catch (err) {
    // Rollback on extraction failure
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
      fs.renameSync(BACKUP_DIR, BUNDLE_DIR);
    }
    return {
      success: false,
      error: `Extraction failed: ${err instanceof Error ? err.message : err}`,
    };
  }
}

/** Trigger electron-updater for shell updates (called from main process) */
export function triggerShellUpdate(): void {
  // electron-updater handles shell updates via autoUpdater
  // This is a no-op stub — actual integration requires importing electron-updater
  // in the Electron main process, which is wired in src/main/index.ts
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdatesAndNotify();
  } catch {
    // electron-updater not available (dev mode or CLI)
  }
}

function loadCompat(): CompatManifest | null {
  try {
    return JSON.parse(fs.readFileSync(COMPAT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function isCompatible(version: string, compat: CompatManifest): boolean {
  return semverGte(version, compat.minBundleVersion) && semverLte(version, compat.maxBundleVersion);
}

function semverGte(a: string, b: string): boolean {
  const [aM, am, ap] = a.replace(/^v/, '').split('.').map(Number);
  const [bM, bm, bp] = b.replace(/^v/, '').split('.').map(Number);
  return aM > bM || (aM === bM && (am > bm || (am === bm && (ap ?? 0) >= (bp ?? 0))));
}

function semverLte(a: string, b: string): boolean {
  return semverGte(b, a);
}

function extractTarball(tarPath: string, dest: string): void {
  execFileSync('tar', ['xzf', tarPath, '-C', dest, '--strip-components=1'], { stdio: 'pipe' });
}

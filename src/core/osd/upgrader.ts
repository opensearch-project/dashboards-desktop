/**
 * OSD Upgrade Flow:
 * 1. Detect new OSD version available (compare manifest vs installed)
 * 2. Download new version
 * 3. Re-generate opensearch_dashboards.yml from persisted settings
 * 4. Re-install tracked plugins
 * 5. Restart OSD
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { OSD_DIR, downloadAndInstall, type ProgressCallback } from './downloader.js';
import { OSD_VERSION } from './manifest.js';
import { writeConfig, type OsdSettings } from './config-generator.js';
import { reinstallPlugins } from './plugin-installer.js';

export interface UpgradeResult {
  previousVersion: string | null;
  newVersion: string;
  configApplied: boolean;
  plugins: { installed: string[]; failed: { name: string; error: string }[] };
}

/** Get currently installed OSD version from package.json */
export function getInstalledVersion(): string | null {
  const pkgPath = join(OSD_DIR, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

/** Check if an upgrade is available */
export function isUpgradeAvailable(): { available: boolean; current: string | null; latest: string } {
  const current = getInstalledVersion();
  return {
    available: current !== OSD_VERSION,
    current,
    latest: OSD_VERSION,
  };
}

/** Execute full upgrade flow */
export async function upgradeOsd(
  settings: OsdSettings,
  trackedPlugins: string[],
  onProgress?: ProgressCallback,
): Promise<UpgradeResult> {
  const previousVersion = getInstalledVersion();

  // 1. Download and extract new OSD (replaces ~/.osd-desktop/osd/)
  await downloadAndInstall(onProgress);

  // 2. Re-generate config from persisted settings
  let configApplied = false;
  try {
    writeConfig(settings, trackedPlugins);
    configApplied = true;
  } catch {
    configApplied = false;
  }

  // 3. Re-install tracked plugins
  const plugins = reinstallPlugins(trackedPlugins);

  return {
    previousVersion,
    newVersion: OSD_VERSION,
    configApplied,
    plugins,
  };
}

/**
 * Manages OSD plugins via bin/opensearch-dashboards-plugin CLI.
 * Tracks installed plugins in the caller's persistence layer (SQLite).
 */

import { execFileSync } from 'child_process';
import { join, basename } from 'path';
import { existsSync, readdirSync } from 'fs';
import { OSD_DIR } from './downloader.js';

function pluginBin(): string {
  const bin = join(OSD_DIR, 'bin', 'opensearch-dashboards-plugin');
  if (!existsSync(bin)) throw new Error(`OSD plugin CLI not found: ${bin}`);
  return bin;
}

export function installPlugin(nameOrUrl: string): { success: boolean; output: string } {
  try {
    const output = execFileSync(pluginBin(), ['install', nameOrUrl], {
      cwd: OSD_DIR,
      encoding: 'utf8',
      timeout: 300_000, // 5 min
    });
    return { success: true, output };
  } catch (err) {
    const msg = err instanceof Error ? (err as { stderr?: string }).stderr ?? err.message : String(err);
    return { success: false, output: msg };
  }
}

export function removePlugin(name: string): { success: boolean; output: string } {
  try {
    const output = execFileSync(pluginBin(), ['remove', name], {
      cwd: OSD_DIR,
      encoding: 'utf8',
      timeout: 60_000,
    });
    return { success: true, output };
  } catch (err) {
    const msg = err instanceof Error ? (err as { stderr?: string }).stderr ?? err.message : String(err);
    return { success: false, output: msg };
  }
}

export function listInstalledPlugins(): string[] {
  const pluginsDir = join(OSD_DIR, 'plugins');
  if (!existsSync(pluginsDir)) return [];
  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

/** Re-install a list of plugins (used after OSD upgrade) */
export function reinstallPlugins(
  plugins: string[],
  onProgress?: (plugin: string, index: number, total: number) => void,
): { installed: string[]; failed: { name: string; error: string }[] } {
  const installed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < plugins.length; i++) {
    onProgress?.(plugins[i], i, plugins.length);
    const result = installPlugin(plugins[i]);
    if (result.success) {
      installed.push(plugins[i]);
    } else {
      failed.push({ name: plugins[i], error: result.output });
    }
  }

  return { installed, failed };
}

/**
 * OSD upgrade handler — detects version changes and re-applies settings.
 * On upgrade: regenerate yml, re-install tracked plugins, restart OSD.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SettingsPersistence } from './settings-persistence';

export interface UpgradeResult {
  upgraded: boolean;
  previousVersion?: string;
  currentVersion: string;
  configApplied: boolean;
  pluginsInstalled: string[];
  pluginsFailed: string[];
}

export async function handleUpgrade(
  persistence: SettingsPersistence,
  osdPath: string,
  currentVersion: string,
): Promise<UpgradeResult> {
  const isUpgrade = persistence.isUpgrade(currentVersion);
  const result: UpgradeResult = {
    upgraded: isUpgrade,
    previousVersion: persistence.getLastVersion()?.version,
    currentVersion,
    configApplied: false,
    pluginsInstalled: [],
    pluginsFailed: [],
  };

  if (!isUpgrade) {
    persistence.recordVersion(currentVersion, osdPath);
    return result;
  }

  // 1. Regenerate opensearch_dashboards.yml
  const ymlPath = path.join(path.dirname(osdPath), '..', 'config', 'opensearch_dashboards.yml');
  const yml = persistence.generateYml();
  if (yml.trim()) {
    fs.writeFileSync(ymlPath, yml);
    result.configApplied = true;
  }

  // 2. Re-install tracked plugins
  const plugins = persistence.listPlugins();
  const pluginBin = path.join(path.dirname(osdPath), 'opensearch-dashboards-plugin');

  for (const plugin of plugins) {
    try {
      execSync(`"${pluginBin}" install ${plugin.source}`, {
        timeout: 120_000,
        stdio: 'pipe',
      });
      result.pluginsInstalled.push(plugin.name);
    } catch {
      result.pluginsFailed.push(plugin.name);
    }
  }

  // 3. Record new version
  persistence.recordVersion(currentVersion, osdPath);

  return result;
}

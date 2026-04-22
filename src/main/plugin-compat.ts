/**
 * Plugin compatibility checker — verify plugin version matches OSD version before install.
 */

import { ipcMain } from 'electron';
import { execFile } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function registerPluginCompatIPC(osdBinPath: string): void {
  const osdDir = join(osdBinPath, '..', '..');
  const pkgPath = join(osdDir, 'package.json');

  ipcMain.handle('plugin:check-compat', (_e, pluginName: string) => {
    let osdVersion = 'unknown';
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      osdVersion = pkg.version ?? 'unknown';
    } catch { /* ignore */ }

    // Check installed plugin's package.json
    const pluginPkg = join(osdDir, 'plugins', pluginName, 'opensearch_dashboards.json');
    if (!existsSync(pluginPkg)) {
      return { compatible: false, reason: `Plugin "${pluginName}" not found`, osdVersion };
    }

    try {
      const meta = JSON.parse(readFileSync(pluginPkg, 'utf-8'));
      const pluginVersion = meta.version ?? 'unknown';
      const compatible = pluginVersion === osdVersion;
      return { compatible, osdVersion, pluginVersion, reason: compatible ? 'Version match' : `Version mismatch: plugin ${pluginVersion} vs OSD ${osdVersion}` };
    } catch {
      return { compatible: false, reason: 'Cannot read plugin metadata', osdVersion };
    }
  });
}

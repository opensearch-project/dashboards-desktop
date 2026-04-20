/**
 * IPC handlers for OSD upgrade flow — triggered from sidebar "Update OSD" button.
 */

import { ipcMain } from 'electron';
import { isUpgradeAvailable, upgradeOsd, getInstalledVersion } from '../../core/osd/upgrader.js';
import type { OsdSettings } from '../../core/osd/config-generator.js';

export function registerOsdUpgradeIPC(deps: {
  getSettings: () => OsdSettings;
  getTrackedPlugins: () => string[];
  restartOsd: () => Promise<void>;
}): void {
  ipcMain.handle('osd:check-upgrade', () => {
    return isUpgradeAvailable();
  });

  ipcMain.handle('osd:get-version', () => {
    return getInstalledVersion();
  });

  ipcMain.handle('osd:upgrade', async (event) => {
    const settings = deps.getSettings();
    const plugins = deps.getTrackedPlugins();

    // Send progress to renderer
    const onProgress = (p: { percent: number }) => {
      event.sender.send('osd:upgrade-progress', p);
    };

    const result = await upgradeOsd(settings, plugins, onProgress);

    // Restart OSD with new version
    await deps.restartOsd();

    return result;
  });
}

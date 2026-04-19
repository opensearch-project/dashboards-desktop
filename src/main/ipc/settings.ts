/**
 * Settings IPC bridge — settings CRUD, model config, update channel, auto-routing.
 */

import { ipcMain } from 'electron';
import { IPC } from '../../core/types';
import { getStorageProxy } from '../../core/storage';

export function registerSettingsIPC(): void {
  ipcMain.handle(IPC.SETTINGS_GET, async (_e, key: string) => {
    return getStorageProxy().getSettingAsync(key);
  });

  ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: string) => {
    await getStorageProxy().setSettingAsync(key, value);
    return true;
  });

  ipcMain.handle(IPC.SETTINGS_GET_ALL, async () => {
    // Return all settings as key-value object
    // StorageProxy doesn't have getAllSettings yet — use known keys
    const db = getStorageProxy();
    const keys = [
      'activeModel', 'autoRouting', 'updateChannel', 'theme',
      'modelConfig.ollama.baseUrl', 'modelConfig.openai.apiKey',
      'modelConfig.anthropic.apiKey', 'modelConfig.bedrock.region',
    ];
    const result: Record<string, string | null> = {};
    for (const k of keys) {
      result[k] = (await db.getSettingAsync(k)) ?? null;
    }
    return result;
  });
}

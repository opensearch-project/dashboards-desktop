/**
 * Update IPC bridge — check, install, channel management.
 */

import { ipcMain } from 'electron';
import { IPC } from '../../core/types';
import { getStorageProxy } from '../../core/storage';

interface UpdateManager {
  check(): Promise<{ available: boolean; version?: string; releaseNotes?: string }>;
  install(): Promise<void>;
}

let updateManager: UpdateManager | null = null;

export function setUpdateManager(um: UpdateManager): void {
  updateManager = um;
}

function um(): UpdateManager {
  if (!updateManager) throw new Error('Update manager not initialized');
  return updateManager;
}

export function registerUpdateIPC(): void {
  ipcMain.handle(IPC.UPDATE_CHECK, () => um().check());
  ipcMain.handle(IPC.UPDATE_INSTALL, () => um().install());

  ipcMain.handle(IPC.UPDATE_CHANNEL, async () => {
    return (await getStorageProxy().getSettingAsync('updateChannel')) ?? 'stable';
  });

  ipcMain.handle(IPC.UPDATE_SET_CHANNEL, async (_e, channel: string) => {
    await getStorageProxy().setSettingAsync('updateChannel', channel);
    return true;
  });
}

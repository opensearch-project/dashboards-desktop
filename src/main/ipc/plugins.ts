/**
 * Plugin IPC bridge — wires plugin manager backend to renderer UI.
 */

import { ipcMain } from 'electron';
import { IPC } from '../../core/types';

// Plugin manager interface (implemented by devops in src/core/plugins/)
interface PluginManager {
  list(): Promise<Array<{ name: string; version: string; enabled: boolean; description: string }>>;
  install(nameOrPath: string): Promise<{ name: string; version: string }>;
  uninstall(name: string): Promise<void>;
  enable(name: string): Promise<void>;
  disable(name: string): Promise<void>;
}

let pluginManager: PluginManager | null = null;

export function setPluginManager(pm: PluginManager): void {
  pluginManager = pm;
}

function pm(): PluginManager {
  if (!pluginManager) throw new Error('Plugin manager not initialized');
  return pluginManager;
}

export function registerPluginIPC(): void {
  ipcMain.handle(IPC.PLUGIN_LIST, () => pm().list());
  ipcMain.handle(IPC.PLUGIN_INSTALL, (_e, nameOrPath: string) => pm().install(nameOrPath));
  ipcMain.handle(IPC.PLUGIN_UNINSTALL, (_e, name: string) => pm().uninstall(name));
  ipcMain.handle(IPC.PLUGIN_ENABLE, (_e, name: string) => pm().enable(name));
  ipcMain.handle(IPC.PLUGIN_DISABLE, (_e, name: string) => pm().disable(name));
}

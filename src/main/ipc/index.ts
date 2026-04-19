/**
 * IPC registration — call once from main/index.ts to wire all M4 IPC handlers.
 */

import { registerPluginIPC } from './plugins';
import { registerSkillIPC } from './skills';
import { registerMcpIPC } from './mcp';
import { registerSettingsIPC } from './settings';
import { registerUpdateIPC } from './updates';

export { setPluginManager } from './plugins';
export { setSkillManager } from './skills';
export { setMcpSupervisor } from './mcp';
export { registerSettingsIPC } from './settings';
export { setUpdateManager } from './updates';

export function registerAllM4IPC(): void {
  registerPluginIPC();
  registerSkillIPC();
  registerMcpIPC();
  registerSettingsIPC();
  registerUpdateIPC();
}

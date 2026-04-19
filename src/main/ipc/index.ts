/**
 * IPC registration — call once from main/index.ts to wire all M4 IPC handlers.
 */

import { registerPluginIPC } from './plugins';
import { registerSkillIPC } from './skills';
import { registerMcpIPC } from './mcp';
import { registerSettingsIPC } from './settings';
import { registerUpdateIPC } from './updates';

export { registerPluginIPC, setPluginManager } from './plugins';
export { registerSkillIPC, setSkillManager } from './skills';
export { registerMcpIPC, setMcpSupervisor } from './mcp';
export { registerSettingsIPC } from './settings';
export { registerUpdateIPC, setUpdateManager } from './updates';

export function registerAllM4IPC(): void {
  registerPluginIPC();
  registerSkillIPC();
  registerMcpIPC();
  registerSettingsIPC();
  registerUpdateIPC();
}

/**
 * IPC registration — call once from main/index.ts to wire all M4 IPC handlers.
 */

import { registerPluginIPC, setPluginManager } from './plugins';
import { registerSkillIPC, setSkillManager } from './skills';
import { registerMcpIPC, setMcpSupervisor } from './mcp';
import { registerSettingsIPC } from './settings';
import { registerUpdateIPC, setUpdateManager } from './updates';

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

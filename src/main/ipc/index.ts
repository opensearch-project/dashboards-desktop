/**
 * IPC registration — call once from main/index.ts to wire all M4 IPC handlers.
 */

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

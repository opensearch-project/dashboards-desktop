/**
 * Skills IPC bridge — wires skill loader backend to renderer UI.
 */

import { ipcMain } from 'electron';
import { IPC } from '../../core/types';

interface SkillManager {
  list(): Promise<Array<{ name: string; description: string; active: boolean }>>;
  install(nameOrPath: string): Promise<{ name: string }>;
  remove(name: string): Promise<void>;
  activate(name: string): Promise<void>;
}

let skillManager: SkillManager | null = null;

export function setSkillManager(sm: SkillManager): void {
  skillManager = sm;
}

function sm(): SkillManager {
  if (!skillManager) throw new Error('Skill manager not initialized');
  return skillManager;
}

export function registerSkillIPC(): void {
  ipcMain.handle(IPC.SKILL_LIST, () => sm().list());
  ipcMain.handle(IPC.SKILL_INSTALL, (_e, nameOrPath: string) => sm().install(nameOrPath));
  ipcMain.handle(IPC.SKILL_REMOVE, (_e, name: string) => sm().remove(name));
  ipcMain.handle(IPC.SKILL_ACTIVATE, (_e, name: string) => sm().activate(name));
}

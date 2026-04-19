/**
 * MCP IPC bridge — wires MCP supervisor/config to renderer UI.
 */

import { ipcMain } from 'electron';
import { IPC } from '../../core/types';

interface McpServerInfo {
  name: string;
  status: 'running' | 'stopped' | 'unhealthy' | 'restarting';
  tools: Array<{ name: string; description: string }>;
}

interface McpSupervisor {
  list(): McpServerInfo[];
  install(
    name: string,
    config: { command: string; args: string[]; env?: Record<string, string> },
  ): Promise<void>;
  start(name: string): Promise<void>;
  stop(name: string): Promise<void>;
  restart(name: string): Promise<void>;
  getConfig(name: string): Record<string, unknown> | undefined;
  setConfig(name: string, config: Record<string, unknown>): void;
  listTools(name: string): Array<{ name: string; description: string }>;
}

let supervisor: McpSupervisor | null = null;

export function setMcpSupervisor(s: McpSupervisor): void {
  supervisor = s;
}

function mcp(): McpSupervisor {
  if (!supervisor) throw new Error('MCP supervisor not initialized');
  return supervisor;
}

export function registerMcpIPC(): void {
  ipcMain.handle(IPC.MCP_LIST, () => mcp().list());
  ipcMain.handle(
    IPC.MCP_INSTALL,
    (_e, name: string, config: { command: string; args: string[]; env?: Record<string, string> }) =>
      mcp().install(name, config),
  );
  ipcMain.handle(IPC.MCP_START, (_e, name: string) => mcp().start(name));
  ipcMain.handle(IPC.MCP_STOP, (_e, name: string) => mcp().stop(name));
  ipcMain.handle(IPC.MCP_RESTART, (_e, name: string) => mcp().restart(name));
  ipcMain.handle(IPC.MCP_CONFIG_GET, (_e, name: string) => mcp().getConfig(name));
  ipcMain.handle(IPC.MCP_CONFIG_SET, (_e, name: string, config: Record<string, unknown>) =>
    mcp().setConfig(name, config),
  );
  ipcMain.handle(IPC.MCP_TOOLS, (_e, name: string) => mcp().listTools(name));
}

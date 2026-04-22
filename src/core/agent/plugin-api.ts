/**
 * Agent plugin API — lets MCP servers register custom UI panels in the sidebar.
 */

export interface PluginPanel {
  id: string;
  name: string;
  icon: string;
  source: string; // MCP server name
  htmlUrl?: string; // URL to load in panel
  ipcChannel?: string; // custom IPC channel for communication
}

const panels = new Map<string, PluginPanel>();

export function registerPanel(panel: PluginPanel): void {
  panels.set(panel.id, panel);
}

export function unregisterPanel(id: string): void {
  panels.delete(id);
}

export function listPanels(): PluginPanel[] {
  return Array.from(panels.values());
}

export function getPanel(id: string): PluginPanel | undefined {
  return panels.get(id);
}

/** Unregister all panels from a specific MCP server (on server stop) */
export function unregisterBySource(source: string): void {
  for (const [id, panel] of panels) {
    if (panel.source === source) panels.delete(id);
  }
}

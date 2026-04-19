import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

const OSD_DIR = path.join(process.env.HOME ?? '~', '.osd');
const MCP_DIR = path.join(OSD_DIR, 'mcp');
const CONFIG_PATH = path.join(MCP_DIR, 'config.json');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Load MCP config from disk, creating defaults if missing */
export function loadConfig(): McpConfig {
  ensureDir(MCP_DIR);
  if (!fs.existsSync(CONFIG_PATH)) {
    const empty: McpConfig = { mcpServers: {} };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as McpConfig;
}

/** Save MCP config to disk */
export function saveConfig(config: McpConfig): void {
  ensureDir(MCP_DIR);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/** Add or update an MCP server config */
export function addServer(name: string, serverConfig: McpServerConfig): McpConfig {
  const config = loadConfig();
  config.mcpServers[name] = { enabled: true, ...serverConfig };
  saveConfig(config);
  return config;
}

/** Remove an MCP server config */
export function removeServer(name: string): McpConfig {
  const config = loadConfig();
  delete config.mcpServers[name];
  saveConfig(config);
  return config;
}

/** List all configured servers */
export function listServers(): Record<string, McpServerConfig> {
  return loadConfig().mcpServers;
}

/** Get a single server config */
export function getServer(name: string): McpServerConfig | undefined {
  return loadConfig().mcpServers[name];
}

/** Set a config key on an existing server */
export function setServerOption(
  name: string,
  key: string,
  value: string,
): McpConfig {
  const config = loadConfig();
  const server = config.mcpServers[name];
  if (!server) throw new Error(`MCP server '${name}' not found`);

  if (key === 'command') {
    server.command = value;
  } else if (key === 'enabled') {
    server.enabled = value === 'true';
  } else {
    // Treat as env var
    server.env = server.env ?? {};
    server.env[key] = value;
  }

  saveConfig(config);
  return config;
}

/** Validate that a server's command is executable */
export function validateCommand(config: McpServerConfig): { valid: boolean; error?: string } {
  const cmd = config.command;
  try {
    // Check if command exists on PATH
    const which = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(which, [cmd], { stdio: 'pipe' });
    return { valid: true };
  } catch {
    return { valid: false, error: `Command not found: ${cmd}` };
  }
}

/** Get the MCP node_modules install path */
export function getMcpModulesDir(): string {
  const dir = path.join(MCP_DIR, 'node_modules');
  ensureDir(MCP_DIR);
  return dir;
}

/** Get config file path (for display) */
export function getConfigPath(): string {
  return CONFIG_PATH;
}

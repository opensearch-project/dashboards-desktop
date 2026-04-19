import { execFileSync } from 'child_process';
import * as path from 'path';
import {
  addServer,
  getServer,
  listServers,
  removeServer,
  setServerOption,
  validateCommand,
  getMcpModulesDir,
  getConfigPath,
} from '../core/mcp/config';
import { McpSupervisor } from '../core/mcp/supervisor';

const supervisor = new McpSupervisor();

/** Parse `osd mcp <subcommand> [args]` */
export async function handleMcpCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'install':
      return mcpInstall(args.slice(1));
    case 'remove':
      return mcpRemove(args.slice(1));
    case 'config':
      return mcpConfig(args.slice(1));
    case 'list':
      return mcpList();
    case 'restart':
      return mcpRestart(args.slice(1));
    case 'start':
      return mcpStart(args.slice(1));
    case 'stop':
      return mcpStop(args.slice(1));
    default:
      printUsage();
  }
}

/** osd mcp install <package> — npm install into ~/.osd/mcp/ */
function mcpInstall(args: string[]): void {
  const pkg = args[0];
  if (!pkg) {
    console.error('Usage: osd mcp install <package>');
    process.exit(1);
  }

  const mcpDir = path.dirname(getMcpModulesDir());
  console.log(`Installing ${pkg} into ${mcpDir}...`);

  // Ensure package.json exists for npm
  const pkgJsonPath = path.join(mcpDir, 'package.json');
  const fs = require('fs');
  if (!fs.existsSync(pkgJsonPath)) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify({ private: true }, null, 2));
  }

  try {
    execFileSync('npm', ['install', pkg], { cwd: mcpDir, stdio: 'inherit' });
  } catch {
    console.error(`Failed to install ${pkg}`);
    process.exit(1);
  }

  // Derive server name from package
  const name = pkg.replace(/^@[^/]+\//, '').replace(/^server-/, '');

  // Auto-register with npx as command
  addServer(name, { command: 'npx', args: [pkg], enabled: true });
  console.log(`✅ Installed and registered MCP server: ${name}`);
  console.log(`   Config: ${getConfigPath()}`);
}

/** osd mcp remove <name> */
function mcpRemove(args: string[]): void {
  const name = args[0];
  if (!name) {
    console.error('Usage: osd mcp remove <name>');
    process.exit(1);
  }
  removeServer(name);
  console.log(`Removed MCP server: ${name}`);
}

/** osd mcp config <server> --key value */
function mcpConfig(args: string[]): void {
  const name = args[0];
  if (!name || args.length < 2) {
    console.error('Usage: osd mcp config <server> --<key> <value>');
    process.exit(1);
  }

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (!key || value === undefined) {
      console.error(`Invalid option at position ${i}`);
      process.exit(1);
    }
    setServerOption(name, key, value);
    console.log(`Set ${name}.${key} = ${value}`);
  }
}

/** osd mcp list — show installed servers + running status */
function mcpList(): void {
  const servers = listServers();
  const running = supervisor.list();
  const names = Object.keys(servers);

  if (names.length === 0) {
    console.log('No MCP servers configured.');
    console.log('Install one: osd mcp install @modelcontextprotocol/server-filesystem');
    return;
  }

  console.log('MCP Servers:\n');
  for (const name of names) {
    const cfg = servers[name];
    const state = running.get(name);
    const status = state?.status ?? 'stopped';
    const enabled = cfg.enabled !== false ? '✅' : '⏸️';
    const mem = state?.memoryMB ? ` (${state.memoryMB.toFixed(0)}MB)` : '';
    console.log(`  ${enabled} ${name} [${status}]${mem}`);
    console.log(`     ${cfg.command} ${(cfg.args ?? []).join(' ')}`);
  }
}

/** osd mcp start <name> */
async function mcpStart(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) {
    console.error('Usage: osd mcp start <name>');
    process.exit(1);
  }
  const config = getServer(name);
  if (!config) {
    console.error(`MCP server '${name}' not found. Run: osd mcp list`);
    process.exit(1);
  }
  const check = validateCommand(config);
  if (!check.valid) {
    console.error(check.error);
    process.exit(1);
  }
  await supervisor.start(name, config);
  console.log(`Started MCP server: ${name}`);
}

/** osd mcp stop <name> */
async function mcpStop(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) {
    console.error('Usage: osd mcp stop <name>');
    process.exit(1);
  }
  await supervisor.stop(name);
  console.log(`Stopped MCP server: ${name}`);
}

/** osd mcp restart <name> */
async function mcpRestart(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) {
    console.error('Usage: osd mcp restart <name>');
    process.exit(1);
  }
  await supervisor.restart(name);
  console.log(`Restarted MCP server: ${name}`);
}

function printUsage(): void {
  console.log(`Usage: osd mcp <command>

Commands:
  install <package>              Install an MCP server package
  remove <name>                  Remove an MCP server
  config <name> --key value      Set server configuration
  list                           List installed servers
  start <name>                   Start a server
  stop <name>                    Stop a server
  restart <name>                 Restart a server`);
}

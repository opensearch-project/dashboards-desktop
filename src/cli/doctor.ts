/**
 * osd doctor — checks all subsystems and reports health with actionable fixes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../core/mcp/config';

const OSD_DIR = path.join(process.env.HOME ?? '~', '.osd');
const DB_PATH = path.join(OSD_DIR, 'osd.db');

type Status = 'ok' | 'warn' | 'fail';
interface Check { name: string; status: Status; message: string; fix?: string }

export async function handleDoctorCommand(): Promise<void> {
  console.log('🩺 osd doctor — checking subsystems...\n');

  const checks: Check[] = [
    checkDataDir(),
    checkSQLite(),
    ...checkMcpServers(),
    await checkOllama(),
    ...await checkCloudProviders(),
    ...await checkConnections(),
  ];

  for (const c of checks) {
    const icon = c.status === 'ok' ? '🟢' : c.status === 'warn' ? '🟡' : '🔴';
    console.log(`  ${icon} ${c.name}: ${c.message}`);
    if (c.fix) console.log(`     → Fix: ${c.fix}`);
  }

  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  console.log(`\n${checks.length} checks: ${checks.length - fails - warns} passed, ${warns} warnings, ${fails} failures`);
  process.exit(fails > 0 ? 1 : 0);
}

function checkDataDir(): Check {
  if (fs.existsSync(OSD_DIR)) return { name: 'Data directory', status: 'ok', message: OSD_DIR };
  return { name: 'Data directory', status: 'fail', message: `${OSD_DIR} not found`, fix: 'Run osd once to auto-create it' };
}

function checkSQLite(): Check {
  if (!fs.existsSync(DB_PATH)) {
    return { name: 'SQLite database', status: 'fail', message: 'osd.db not found', fix: 'Run osd to initialize the database' };
  }
  try {
    const stats = fs.statSync(DB_PATH);
    if (stats.size === 0) return { name: 'SQLite database', status: 'fail', message: 'osd.db is empty', fix: 'Delete and re-run osd' };
    return { name: 'SQLite database', status: 'ok', message: `${(stats.size / 1024).toFixed(0)} KB` };
  } catch (err: unknown) {
    return { name: 'SQLite database', status: 'fail', message: `${err instanceof Error ? err.message : err}` };
  }
}

function checkMcpServers(): Check[] {
  const config = loadConfig();
  const servers = Object.entries(config.mcpServers);
  if (servers.length === 0) return [{ name: 'MCP servers', status: 'ok', message: 'None configured' }];

  return servers.map(([name, cfg]) => {
    const enabled = cfg.enabled !== false;
    if (!enabled) return { name: `MCP: ${name}`, status: 'ok', message: 'Disabled' };

    try {
      const { execFileSync } = require('child_process');
      const which = process.platform === 'win32' ? 'where' : 'which';
      execFileSync(which, [cfg.command], { stdio: 'pipe' });
      return { name: `MCP: ${name}`, status: 'ok' as Status, message: `${cfg.command} found` };
    } catch {
      return { name: `MCP: ${name}`, status: 'fail' as Status, message: `Command not found: ${cfg.command}`, fix: `Install ${cfg.command} or disable this server` };
    }
  });
}

async function checkOllama(): Promise<Check> {
  try {
    const _res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { name: 'Ollama', status: 'fail', message: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: unknown[] };
    const count = data.models?.length ?? 0;
    if (count === 0) return { name: 'Ollama', status: 'warn', message: 'Running but no models installed', fix: 'Run: ollama pull llama3' };
    return { name: 'Ollama', status: 'ok', message: `${count} model(s) available` };
  } catch {
    return { name: 'Ollama', status: 'warn', message: 'Not running or unreachable', fix: 'Start with: ollama serve' };
  }
}

async function checkCloudProviders(): Promise<Check[]> {
  const checks: Check[] = [];

  // Check for API keys in settings DB
  if (!fs.existsSync(DB_PATH)) return checks;

  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH, { readonly: true });
    const openaiKey = db.prepare("SELECT value FROM settings WHERE key = 'openai_api_key'").get();
    const anthropicKey = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get();
    db.close();

    if (openaiKey) {
      checks.push({ name: 'OpenAI API key', status: 'ok', message: 'Configured' });
    }
    if (anthropicKey) {
      checks.push({ name: 'Anthropic API key', status: 'ok', message: 'Configured' });
    }
    if (!openaiKey && !anthropicKey) {
      checks.push({ name: 'Cloud providers', status: 'ok', message: 'None configured (using local models only)' });
    }
  } catch {
    // DB may not have settings table yet
  }

  return checks;
}

async function checkConnections(): Promise<Check[]> {
  if (!fs.existsSync(DB_PATH)) return [];

  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH, { readonly: true });
    const conns = db.prepare('SELECT name, url, type FROM connections').all() as Array<{ name: string; url: string; type: string }>;
    db.close();

    if (conns.length === 0) return [{ name: 'Connections', status: 'ok', message: 'None saved' }];

    const checks: Check[] = [];
    for (const conn of conns) {
      try {
        await fetch(conn.url, { signal: AbortSignal.timeout(5000) });
        checks.push({ name: `Connection: ${conn.name}`, status: 'ok', message: `${conn.type} — reachable` });
      } catch {
        checks.push({ name: `Connection: ${conn.name}`, status: 'fail', message: `${conn.url} unreachable`, fix: 'Check URL and network connectivity' });
      }
    }
    return checks;
  } catch {
    return [];
  }
}

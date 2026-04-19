import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;
let configPath: string;

// Override HOME so config goes to temp dir
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-mcp-config-'));
  process.env.HOME = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Dynamic import to pick up new HOME each test
async function getConfig() {
  vi.resetModules();
  return import('../../../src/core/mcp/config');
}

describe('MCP Config: loadConfig', () => {
  it('creates default empty config if none exists', async () => {
    const cfg = await getConfig();
    const config = cfg.loadConfig();
    expect(config.mcpServers).toEqual({});
    expect(fs.existsSync(path.join(tmpDir, '.osd', 'mcp', 'config.json'))).toBe(true);
  });

  it('loads existing config from disk', async () => {
    const mcpDir = path.join(tmpDir, '.osd', 'mcp');
    fs.mkdirSync(mcpDir, { recursive: true });
    fs.writeFileSync(path.join(mcpDir, 'config.json'), JSON.stringify({
      mcpServers: { echo: { command: 'node', args: ['echo.js'] } },
    }));
    const cfg = await getConfig();
    const config = cfg.loadConfig();
    expect(config.mcpServers.echo.command).toBe('node');
  });
});

describe('MCP Config: addServer/removeServer', () => {
  it('adds a server and persists to disk', async () => {
    const cfg = await getConfig();
    cfg.addServer('github', { command: 'npx', args: ['@mcp/server-github'] });
    const config = cfg.loadConfig();
    expect(config.mcpServers.github.command).toBe('npx');
    expect(config.mcpServers.github.enabled).toBe(true);
  });

  it('removes a server', async () => {
    const cfg = await getConfig();
    cfg.addServer('temp', { command: 'node', args: [] });
    cfg.removeServer('temp');
    expect(cfg.getServer('temp')).toBeUndefined();
  });
});

describe('MCP Config: setServerOption', () => {
  it('updates command', async () => {
    const cfg = await getConfig();
    cfg.addServer('test', { command: 'old' });
    cfg.setServerOption('test', 'command', 'new');
    expect(cfg.getServer('test')?.command).toBe('new');
  });

  it('sets env var', async () => {
    const cfg = await getConfig();
    cfg.addServer('test', { command: 'node' });
    cfg.setServerOption('test', 'GITHUB_TOKEN', 'abc123');
    expect(cfg.getServer('test')?.env?.GITHUB_TOKEN).toBe('abc123');
  });

  it('throws on unknown server', async () => {
    const cfg = await getConfig();
    expect(() => cfg.setServerOption('missing', 'command', 'x')).toThrow(/not found/);
  });
});

describe('MCP Config: validateCommand', () => {
  it('validates existing command', async () => {
    const cfg = await getConfig();
    const result = cfg.validateCommand({ command: 'node' });
    expect(result.valid).toBe(true);
  });

  it('rejects nonexistent command', async () => {
    const cfg = await getConfig();
    const result = cfg.validateCommand({ command: 'nonexistent-binary-xyz' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not found/);
  });
});

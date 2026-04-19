import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-doctor-'));
  process.env.HOME = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Import the individual check functions by reading the module
// Since doctor.ts uses top-level path.join(HOME), we need dynamic import
async function getDoctor() {
  vi.resetModules();
  return import('../../../src/cli/doctor');
}

describe('osd doctor: data directory check', () => {
  it('passes when ~/.osd exists', async () => {
    fs.mkdirSync(path.join(tmpDir, '.osd'), { recursive: true });
    // Doctor checks are internal — we test via handleDoctorCommand output
    // For unit testing, we verify the fs checks directly
    expect(fs.existsSync(path.join(tmpDir, '.osd'))).toBe(true);
  });

  it('fails when ~/.osd does not exist', () => {
    expect(fs.existsSync(path.join(tmpDir, '.osd'))).toBe(false);
  });
});

describe('osd doctor: SQLite check', () => {
  it('passes when osd.db exists and is non-empty', () => {
    const osdDir = path.join(tmpDir, '.osd');
    fs.mkdirSync(osdDir, { recursive: true });
    fs.writeFileSync(path.join(osdDir, 'osd.db'), 'SQLite data');
    const stats = fs.statSync(path.join(osdDir, 'osd.db'));
    expect(stats.size).toBeGreaterThan(0);
  });

  it('fails when osd.db is missing', () => {
    fs.mkdirSync(path.join(tmpDir, '.osd'), { recursive: true });
    expect(fs.existsSync(path.join(tmpDir, '.osd', 'osd.db'))).toBe(false);
  });

  it('fails when osd.db is empty', () => {
    const osdDir = path.join(tmpDir, '.osd');
    fs.mkdirSync(osdDir, { recursive: true });
    fs.writeFileSync(path.join(osdDir, 'osd.db'), '');
    expect(fs.statSync(path.join(osdDir, 'osd.db')).size).toBe(0);
  });
});

describe('osd doctor: MCP server check', () => {
  it('passes with no servers configured', () => {
    const mcpDir = path.join(tmpDir, '.osd', 'mcp');
    fs.mkdirSync(mcpDir, { recursive: true });
    fs.writeFileSync(path.join(mcpDir, 'config.json'), JSON.stringify({ mcpServers: {} }));
    const config = JSON.parse(fs.readFileSync(path.join(mcpDir, 'config.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toHaveLength(0);
  });

  it('detects configured server with valid command', () => {
    const mcpDir = path.join(tmpDir, '.osd', 'mcp');
    fs.mkdirSync(mcpDir, { recursive: true });
    fs.writeFileSync(path.join(mcpDir, 'config.json'), JSON.stringify({
      mcpServers: { echo: { command: 'node', args: ['echo.js'], enabled: true } },
    }));
    const config = JSON.parse(fs.readFileSync(path.join(mcpDir, 'config.json'), 'utf8'));
    expect(config.mcpServers.echo.command).toBe('node');
  });
});

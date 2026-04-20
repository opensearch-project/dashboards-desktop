/**
 * v0.4 feature tests: Bounce, S3 credentials, Update panel, Config editor, Plugin lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- S3 Credentials Tool ---
import { s3CredentialsTool } from '../../../src/core/agent/tools/s3-credentials';
import type { ToolContext } from '../../../src/core/agent/types';

const ctx: ToolContext = {
  workspaceId: 'ws-1',
  activeConnection: { id: 'c1', url: 'https://cluster:9200', type: 'opensearch', auth_type: 'basic' },
  signal: new AbortController().signal,
};

describe('S3 Credentials Tool: dispatch', () => {
  it('returns error when no active connection', async () => {
    const result = await s3CredentialsTool.execute({ action: 'set' }, { ...ctx, activeConnection: null });
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/No active connection/);
  });

  it('set requires accessKeyId and secretAccessKey', async () => {
    const result = await s3CredentialsTool.execute({ action: 'set' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/Missing/);
  });

  it('set with valid credentials returns success', async () => {
    const result = await s3CredentialsTool.execute(
      { action: 'set', accessKeyId: 'AKIA...', secretAccessKey: 'secret', region: 'us-west-2' }, ctx
    );
    expect(result.isError).toBe(false);
    expect(result.content).toContain('us-west-2');
  });

  it('set defaults region to us-east-1', async () => {
    const result = await s3CredentialsTool.execute(
      { action: 'set', accessKeyId: 'AK', secretAccessKey: 'SK' }, ctx
    );
    expect(result.content).toContain('us-east-1');
  });

  it('get returns status message', async () => {
    const result = await s3CredentialsTool.execute({ action: 'get' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toContain('keystore');
  });

  it('clear returns success', async () => {
    const result = await s3CredentialsTool.execute({ action: 'clear' }, ctx);
    expect(result.isError).toBe(false);
  });

  it('unknown action returns error', async () => {
    const result = await s3CredentialsTool.execute({ action: 'invalid' }, ctx);
    expect(result.isError).toBe(true);
  });

  it('has correct definition', () => {
    expect(s3CredentialsTool.definition.name).toBe('s3-credentials');
    expect(s3CredentialsTool.definition.requiresApproval).toBe(true);
  });
});

// --- Plugin Installer ---
const { mockExecFileSync, mockExistsSync, mockReaddirSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn().mockReturnValue('Installed successfully'),
  mockExistsSync: vi.fn().mockReturnValue(true),
  mockReaddirSync: vi.fn().mockReturnValue([]),
}));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, default: actual, execFileSync: (...args: any[]) => mockExecFileSync(...args) };
});
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, default: actual, existsSync: (...args: any[]) => mockExistsSync(...args), readdirSync: (...args: any[]) => mockReaddirSync(...args) };
});
vi.mock('../../../src/core/osd/downloader.js', () => ({ OSD_DIR: '/tmp/osd' }));

import { installPlugin, removePlugin, listInstalledPlugins, reinstallPlugins } from '../../../src/core/osd/plugin-installer';

beforeEach(() => { mockExecFileSync.mockReset().mockReturnValue('OK'); mockExistsSync.mockReturnValue(true); });

describe('Plugin Installer: install', () => {
  it('calls plugin CLI with install command', () => {
    const result = installPlugin('alerting');
    expect(result.success).toBe(true);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      expect.stringContaining('opensearch-dashboards-plugin'),
      ['install', 'alerting'],
      expect.objectContaining({ timeout: 300_000 })
    );
  });

  it('returns failure on CLI error', () => {
    mockExecFileSync.mockImplementation(() => { const e = new Error('fail'); (e as any).stderr = 'plugin exists'; throw e; });
    const result = installPlugin('bad');
    expect(result.success).toBe(false);
    expect(result.output).toContain('plugin exists');
  });
});

describe('Plugin Installer: remove', () => {
  it('calls plugin CLI with remove command', () => {
    const result = removePlugin('alerting');
    expect(result.success).toBe(true);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      expect.stringContaining('opensearch-dashboards-plugin'),
      ['remove', 'alerting'],
      expect.any(Object)
    );
  });
});

describe('Plugin Installer: list', () => {
  it('returns directory names from plugins/', () => {
    mockReaddirSync.mockReturnValue([
      { name: 'alerting', isDirectory: () => true },
      { name: 'ml', isDirectory: () => true },
      { name: '.DS_Store', isDirectory: () => false },
    ]);
    expect(listInstalledPlugins()).toEqual(['alerting', 'ml']);
  });

  it('returns empty when plugins dir missing', () => {
    mockExistsSync.mockReturnValue(false);
    expect(listInstalledPlugins()).toEqual([]);
  });
});

describe('Plugin Installer: reinstall', () => {
  it('installs all tracked plugins', () => {
    const result = reinstallPlugins(['alerting', 'ml']);
    expect(result.installed).toEqual(['alerting', 'ml']);
    expect(result.failed).toHaveLength(0);
  });

  it('reports failures without stopping', () => {
    mockExecFileSync.mockImplementationOnce(() => 'OK').mockImplementationOnce(() => { throw new Error('fail'); });
    const result = reinstallPlugins(['good', 'bad']);
    expect(result.installed).toEqual(['good']);
    expect(result.failed[0].name).toBe('bad');
  });

  it('calls progress callback', () => {
    const onProgress = vi.fn();
    reinstallPlugins(['a', 'b'], onProgress);
    expect(onProgress).toHaveBeenCalledWith('a', 0, 2);
    expect(onProgress).toHaveBeenCalledWith('b', 1, 2);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, default: actual, writeFileSync: vi.fn() };
});

const mockExecSync = vi.fn();
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, default: actual, execSync: (...args: any[]) => mockExecSync(...args) };
});

import { handleUpgrade } from '../../../src/core/osd/upgrade-handler';
import { writeFileSync } from 'fs';

function mockPersistence(opts: { lastVersion?: string; config?: Record<string, string>; plugins?: Array<{ name: string; source: string }> }) {
  return {
    isUpgrade: vi.fn((v: string) => !!opts.lastVersion && opts.lastVersion !== v),
    getLastVersion: vi.fn(() => opts.lastVersion ? { version: opts.lastVersion, path: '/opt/osd/bin/osd' } : undefined),
    generateYml: vi.fn(() => Object.entries(opts.config ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n'),
    listPlugins: vi.fn(() => (opts.plugins ?? []).map(p => ({ ...p, installed_at: '' }))),
    recordVersion: vi.fn(),
  } as any;
}

beforeEach(() => { mockExecSync.mockReset(); (writeFileSync as any).mockReset?.(); });

describe('Upgrade Handler: no upgrade', () => {
  it('returns upgraded=false on first run', async () => {
    const p = mockPersistence({});
    const result = await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(result.upgraded).toBe(false);
    expect(result.currentVersion).toBe('2.12.0');
    expect(p.recordVersion).toHaveBeenCalledWith('2.12.0', '/opt/osd/bin/osd');
  });

  it('returns upgraded=false when version matches', async () => {
    const p = mockPersistence({ lastVersion: '2.12.0' });
    const result = await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(result.upgraded).toBe(false);
  });
});

describe('Upgrade Handler: upgrade detected', () => {
  it('regenerates yml on upgrade', async () => {
    const p = mockPersistence({ lastVersion: '2.11.0', config: { 'server.port': '5601' } });
    const result = await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(result.upgraded).toBe(true);
    expect(result.previousVersion).toBe('2.11.0');
    expect(result.configApplied).toBe(true);
    expect(writeFileSync).toHaveBeenCalled();
  });

  it('re-installs tracked plugins', async () => {
    mockExecSync.mockReturnValue('');
    const p = mockPersistence({ lastVersion: '2.11.0', config: { 'x': 'y' }, plugins: [{ name: 'alerting', source: 'https://url/alerting.zip' }] });
    const result = await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(result.pluginsInstalled).toContain('alerting');
    expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('alerting.zip'), expect.any(Object));
  });

  it('records failed plugins', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('install failed'); });
    const p = mockPersistence({ lastVersion: '2.11.0', config: { 'x': 'y' }, plugins: [{ name: 'bad-plugin', source: 'url' }] });
    const result = await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(result.pluginsFailed).toContain('bad-plugin');
    expect(result.pluginsInstalled).toHaveLength(0);
  });

  it('records new version after upgrade', async () => {
    const p = mockPersistence({ lastVersion: '2.11.0', config: { 'x': 'y' } });
    await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(p.recordVersion).toHaveBeenCalledWith('2.12.0', '/opt/osd/bin/osd');
  });

  it('skips yml write when config is empty', async () => {
    const p = mockPersistence({ lastVersion: '2.11.0', config: {} });
    p.generateYml.mockReturnValue('\n');
    const result = await handleUpgrade(p, '/opt/osd/bin/osd', '2.12.0');
    expect(result.configApplied).toBe(false);
  });
});

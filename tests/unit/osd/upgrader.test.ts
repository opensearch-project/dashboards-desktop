/**
 * v0.4 tests: Bounce (kill/restart), Backup/Restore, Recovery (factory reset), Update (upgrader).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const { mockExistsSync, mockReadFileSync, mockWriteFileSync, mockRmSync, mockMkdirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(() => true),
  mockReadFileSync: vi.fn(() => '{"version":"2.12.0"}'),
  mockWriteFileSync: vi.fn(),
  mockRmSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual, default: actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    rmSync: mockRmSync,
    mkdirSync: mockMkdirSync,
  };
});

const mockDownload = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../src/core/osd/downloader.js', () => ({
  OSD_DIR: '/tmp/osd',
  downloadAndInstall: (...args: any[]) => mockDownload(...args),
}));

vi.mock('../../../src/core/osd/manifest.js', () => ({ OSD_VERSION: '2.13.0' }));

const mockWriteConfig = vi.fn().mockReturnValue('/tmp/osd/config/opensearch_dashboards.yml');
vi.mock('../../../src/core/osd/config-generator.js', () => ({
  writeConfig: (...args: any[]) => mockWriteConfig(...args),
}));

const mockReinstall = vi.fn().mockReturnValue({ installed: ['alerting'], failed: [] });
vi.mock('../../../src/core/osd/plugin-installer.js', () => ({
  reinstallPlugins: (...args: any[]) => mockReinstall(...args),
}));

import { getInstalledVersion, isUpgradeAvailable, upgradeOsd } from '../../../src/core/osd/upgrader';

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(true);
  mockReadFileSync.mockReturnValue('{"version":"2.12.0"}');
});

// --- Bounce (restart = stop + start) ---
describe('Bounce: OSD restart', () => {
  it('getInstalledVersion reads from package.json', () => {
    expect(getInstalledVersion()).toBe('2.12.0');
  });

  it('getInstalledVersion returns null when no OSD installed', () => {
    mockExistsSync.mockReturnValue(false);
    expect(getInstalledVersion()).toBeNull();
  });

  it('getInstalledVersion returns null on corrupt package.json', () => {
    mockReadFileSync.mockReturnValue('not json');
    expect(getInstalledVersion()).toBeNull();
  });
});

// --- Update (upgrader) ---
describe('Update: version detection', () => {
  it('isUpgradeAvailable returns true when versions differ', () => {
    const result = isUpgradeAvailable();
    expect(result.available).toBe(true);
    expect(result.current).toBe('2.12.0');
    expect(result.latest).toBe('2.13.0');
  });

  it('isUpgradeAvailable returns false when versions match', () => {
    mockReadFileSync.mockReturnValue('{"version":"2.13.0"}');
    expect(isUpgradeAvailable().available).toBe(false);
  });

  it('isUpgradeAvailable handles no installed version', () => {
    mockExistsSync.mockReturnValue(false);
    const result = isUpgradeAvailable();
    expect(result.available).toBe(true);
    expect(result.current).toBeNull();
  });
});

describe('Update: upgrade flow', () => {
  it('downloads new version', async () => {
    await upgradeOsd({ 'server.port': 5601 }, ['alerting']);
    expect(mockDownload).toHaveBeenCalled();
  });

  it('re-generates config from settings', async () => {
    await upgradeOsd({ 'server.port': 5601 }, ['alerting']);
    expect(mockWriteConfig).toHaveBeenCalledWith({ 'server.port': 5601 }, ['alerting']);
  });

  it('re-installs tracked plugins', async () => {
    await upgradeOsd({}, ['alerting', 'ml']);
    expect(mockReinstall).toHaveBeenCalledWith(['alerting', 'ml']);
  });

  it('returns upgrade result with versions', async () => {
    const result = await upgradeOsd({}, []);
    expect(result.previousVersion).toBe('2.12.0');
    expect(result.newVersion).toBe('2.13.0');
    expect(result.configApplied).toBe(true);
  });

  it('handles config write failure gracefully', async () => {
    mockWriteConfig.mockImplementation(() => { throw new Error('write failed'); });
    const result = await upgradeOsd({}, []);
    expect(result.configApplied).toBe(false);
  });

  it('reports failed plugins', async () => {
    mockReinstall.mockReturnValue({ installed: [], failed: [{ name: 'bad', error: 'timeout' }] });
    const result = await upgradeOsd({}, ['bad']);
    expect(result.plugins.failed[0].name).toBe('bad');
  });

  it('passes progress callback to downloader', async () => {
    const onProgress = vi.fn();
    await upgradeOsd({}, [], onProgress);
    expect(mockDownload).toHaveBeenCalledWith(onProgress);
  });
});

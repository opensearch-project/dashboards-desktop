import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-update-'));
  process.env.HOME = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function getRollback() {
  vi.resetModules();
  return import('../../../src/core/updates/rollback');
}

async function getChecker() {
  vi.resetModules();
  return import('../../../src/core/updates/update-checker');
}

describe('Update checker: channel matching', () => {
  it('exports checkForUpdate function', async () => {
    const checker = await getChecker();
    expect(typeof checker.checkForUpdate).toBe('function');
  });
});

describe('Rollback: recordLaunchSuccess', () => {
  it('writes launch log with success timestamp', async () => {
    const rb = await getRollback();
    fs.mkdirSync(path.join(tmpDir, '.osd'), { recursive: true });
    rb.recordLaunchSuccess();
    const logPath = path.join(tmpDir, '.osd', 'launch.log');
    expect(fs.existsSync(logPath)).toBe(true);
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    expect(log.lastSuccess).toBeGreaterThan(0);
    expect(log.rapidCrashes).toBe(0);
  });
});

describe('Rollback: recordLaunchAttempt', () => {
  it('does not trigger rollback on first attempt', async () => {
    const rb = await getRollback();
    fs.mkdirSync(path.join(tmpDir, '.osd'), { recursive: true });
    const result = rb.recordLaunchAttempt();
    expect(result.shouldRollback).toBe(false);
  });

  it('triggers rollback after 3 rapid crashes', async () => {
    const rb = await getRollback();
    fs.mkdirSync(path.join(tmpDir, '.osd'), { recursive: true });
    rb.recordLaunchAttempt();
    rb.recordLaunchAttempt();
    const result = rb.recordLaunchAttempt();
    expect(result.shouldRollback).toBe(true);
  });
});

describe('Rollback: rollback', () => {
  it('fails when no backup exists', async () => {
    const rb = await getRollback();
    const result = rb.rollback();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No previous version/);
  });

  it('restores backup when available', async () => {
    const rb = await getRollback();
    const bundleDir = path.join(tmpDir, '.osd', 'bundle');
    const backupDir = path.join(tmpDir, '.osd', 'bundle.prev');
    fs.mkdirSync(bundleDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'app.js'), 'old version');

    const result = rb.rollback();
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'app.js'))).toBe(true);
    expect(fs.existsSync(backupDir)).toBe(false);
  });
});

describe('Rollback: hasBackup', () => {
  it('returns false when no backup', async () => {
    const rb = await getRollback();
    expect(rb.hasBackup()).toBe(false);
  });

  it('returns true when backup exists', async () => {
    const rb = await getRollback();
    fs.mkdirSync(path.join(tmpDir, '.osd', 'bundle.prev'), { recursive: true });
    expect(rb.hasBackup()).toBe(true);
  });
});

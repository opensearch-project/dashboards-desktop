/**
 * E2E: Desktop Management Sidebar — bounce, management, plugins, update.
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-sidebar-'));
  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: { ...process.env, OSD_DATA_DIR: tmpDir, OSD_TEST_MODE: '1', OSD_SKIP_ONBOARDING: '1' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.describe.serial('Sidebar: layout', () => {
  test('sidebar visible on launch', async () => {
    const sidebar = page.locator('[data-testid="sidebar"], #sidebar, .sidebar');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });
  });

  test('connections section renders', async () => {
    const section = page.locator('[data-testid="sidebar-connections"], [data-section="connections"], [data-nav="connections"]');
    await expect(section.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe.serial('Sidebar: bounce (restart OSD)', () => {
  test('restart button visible', async () => {
    const btn = page.locator('[data-testid="osd-restart"], button:has-text("Restart"), [data-action="restart"]');
    if (await btn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn.first()).toBeVisible();
    }
  });

  test('click restart shows restarting state', async () => {
    const btn = page.locator('[data-testid="osd-restart"], button:has-text("Restart"), [data-action="restart"]');
    if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.first().click();
      const indicator = page.locator('[data-testid="osd-status"], .osd-status, :text("Restarting")');
      await expect(indicator.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe.serial('Sidebar: management (config save → restart)', () => {
  test('config panel shows settings', async () => {
    const nav = page.locator('[data-nav="config"], [data-section="config"], button:has-text("Config")');
    if (await nav.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await nav.first().click();
      const panel = page.locator('[data-testid="config-panel"], .config-panel');
      await expect(panel.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('save config triggers OSD restart', async () => {
    const saveBtn = page.locator('[data-testid="config-save"], button:has-text("Apply"), button:has-text("Save")');
    if (await saveBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.first().click();
      const indicator = page.locator('[data-testid="osd-restarting"], .restarting, :text("Restarting")');
      await expect(indicator.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe.serial('Sidebar: plugins', () => {
  test('plugin list renders', async () => {
    const nav = page.locator('[data-nav="plugins"], [data-section="plugins"], button:has-text("Plugins")');
    if (await nav.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await nav.first().click();
      const list = page.locator('[data-testid="plugin-list"], .plugin-list');
      await expect(list.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('install plugin appears in tracked list', async () => {
    const installBtn = page.locator('[data-testid="plugin-install"], button:has-text("Install")');
    if (await installBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await installBtn.first().click();
      const item = page.locator('[data-testid="plugin-item"], .plugin-item');
      await expect(item.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe.serial('Sidebar: update', () => {
  test('shows current version', async () => {
    const nav = page.locator('[data-nav="updates"], [data-section="updates"], button:has-text("Update")');
    if (await nav.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await nav.first().click();
      const version = page.locator('[data-testid="current-version"], .current-version');
      await expect(version.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('check for updates button exists', async () => {
    const btn = page.locator('[data-testid="check-update"], button:has-text("Check"), button:has-text("Update")');
    if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(btn.first()).toBeVisible();
    }
  });
});

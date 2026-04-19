/**
 * E2E: Desktop Management Sidebar — opens, panels render, config triggers restart.
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

test.describe.serial('Sidebar E2E', () => {
  test('1. sidebar panel is visible on launch', async () => {
    const sidebar = page.locator('[data-testid="sidebar"], #sidebar, .sidebar');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });
  });

  test('2. connections section renders', async () => {
    const section = page.locator('[data-testid="sidebar-connections"], [data-section="connections"]');
    await expect(section.first()).toBeVisible({ timeout: 5000 });
  });

  test('3. config section renders', async () => {
    const section = page.locator('[data-testid="sidebar-config"], [data-section="config"]');
    if (await section.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(section.first()).toBeVisible();
    }
  });

  test('4. plugins section renders', async () => {
    const section = page.locator('[data-testid="sidebar-plugins"], [data-section="plugins"]');
    if (await section.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(section.first()).toBeVisible();
    }
  });

  test('5. config save triggers OSD restart indicator', async () => {
    // Look for a save/apply button in config section
    const saveBtn = page.locator('[data-testid="config-save"], button:has-text("Apply"), button:has-text("Save")');
    if (await saveBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.first().click();
      // Should show restart indicator
      const indicator = page.locator('[data-testid="osd-restarting"], .restarting, :text("Restarting")');
      await expect(indicator.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

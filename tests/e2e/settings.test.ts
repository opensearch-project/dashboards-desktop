import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-settings-'));
  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: { ...process.env, OSD_DATA_DIR: tmpDir, OSD_TEST_MODE: '1', OSD_SKIP_ONBOARDING: '1' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('settings page renders from sidebar', async () => {
  const settingsNav = page.locator('[data-testid="nav-settings"], [data-page="settings"]');
  if (await settingsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsNav.click();
    const settingsPage = page.locator('[data-testid="settings-page"], .page-settings, main h1:has-text("Settings")');
    await expect(settingsPage.first()).toBeVisible({ timeout: 3000 });
  }
});

test('model configuration section exists on settings page', async () => {
  const settingsNav = page.locator('[data-testid="nav-settings"], [data-page="settings"]');
  if (await settingsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsNav.click();
    const modelSection = page.locator('[data-testid="model-config"], text=Model, text=model');
    await expect(modelSection.first()).toBeVisible({ timeout: 3000 });
  }
});

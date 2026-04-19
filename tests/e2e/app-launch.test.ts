import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeEach(async () => {
  // Use temp dir for user data so each test starts fresh
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-'));

  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: { ...process.env, OSD_DATA_DIR: tmpDir },
  });
  page = await app.firstWindow();
});

test.afterEach(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('app launches without crash', async () => {
  expect(app).toBeTruthy();
  const windows = app.windows();
  expect(windows.length).toBeGreaterThanOrEqual(1);
});

test('homepage renders', async () => {
  await page.waitForLoadState('domcontentloaded');
  // Homepage should have the app title or main heading
  const title = await page.title();
  expect(title).toBeTruthy();
});

test('first-run onboarding appears on fresh DB', async () => {
  await page.waitForLoadState('domcontentloaded');
  // On a fresh data dir with no existing DB, onboarding should show
  const onboarding = page.locator('[data-testid="onboarding"], [role="dialog"]');
  await expect(onboarding).toBeVisible({ timeout: 5000 });
});

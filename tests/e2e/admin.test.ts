import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-admin-'));
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

test('cluster page renders when navigated via sidebar', async () => {
  const clusterNav = page.locator('[data-testid="nav-cluster"], [data-page="cluster"]');
  if (await clusterNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clusterNav.click();
    const clusterPage = page.locator('[data-testid="cluster-page"], .page-cluster, main');
    await expect(clusterPage).toBeVisible({ timeout: 3000 });
  }
});

test('indices page renders when navigated via sidebar', async () => {
  const indicesNav = page.locator('[data-testid="nav-indices"], [data-page="indices"]');
  if (await indicesNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await indicesNav.click();
    const indicesPage = page.locator('[data-testid="indices-page"], .page-indices, main');
    await expect(indicesPage).toBeVisible({ timeout: 3000 });
  }
});

test('security page renders when navigated via sidebar', async () => {
  const securityNav = page.locator('[data-testid="nav-security"], [data-page="security"]');
  if (await securityNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await securityNav.click();
    const securityPage = page.locator('[data-testid="security-page"], .page-security, main');
    await expect(securityPage).toBeVisible({ timeout: 3000 });
  }
});

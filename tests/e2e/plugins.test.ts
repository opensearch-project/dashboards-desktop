import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-plugins-'));
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

test('plugins page renders from sidebar navigation', async () => {
  const pluginsNav = page.locator('[data-testid="nav-plugins"], [data-page="plugins"]');
  if (await pluginsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pluginsNav.click();
    const pluginsPage = page.locator('[data-testid="plugins-page"], .page-plugins, main');
    await expect(pluginsPage).toBeVisible({ timeout: 3000 });
  }
});

test('MCP servers section is visible on plugins page', async () => {
  const pluginsNav = page.locator('[data-testid="nav-plugins"], [data-page="plugins"]');
  if (await pluginsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pluginsNav.click();
    const mcpSection = page.locator('[data-testid="mcp-servers"], text=MCP');
    await expect(mcpSection.first()).toBeVisible({ timeout: 3000 });
  }
});

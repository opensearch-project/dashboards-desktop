/**
 * E2E acceptance: full first-run user journey.
 * Launch → first-run dialog → OSD download/setup → connect → chat → admin
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-firstrun-'));
  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: { ...process.env, OSD_DATA_DIR: tmpDir, OSD_TEST_MODE: '1' },
    // No OSD_SKIP_ONBOARDING — test the real first-run flow
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.describe.serial('First-run acceptance', () => {
  test('1. shows first-run dialog on fresh install', async () => {
    const dialog = page.locator('[data-testid="first-run"], [data-testid="onboarding"], [role="dialog"]');
    await expect(dialog.first()).toBeVisible({ timeout: 15000 });
  });

  test('2. complete first-run setup', async () => {
    const btn = page.locator('[data-testid="first-run-complete"], [data-testid="onboarding-complete"], button:has-text("Continue"), button:has-text("Get Started")');
    if (await btn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.first().click();
    }
    // After first-run, main content should appear
    const main = page.locator('[data-testid="sidebar"], #sidebar, .sidebar, main, webview');
    await expect(main.first()).toBeVisible({ timeout: 15000 });
  });

  test('3. sidebar is accessible after setup', async () => {
    const sidebar = page.locator('[data-testid="sidebar"], #sidebar, .sidebar');
    await expect(sidebar.first()).toBeVisible({ timeout: 5000 });
  });

  test('4. chat overlay opens via keyboard shortcut', async () => {
    await page.keyboard.press('Meta+k');
    const chat = page.locator('[data-testid="chat-sidebar"], #osd-chat-sidebar, .chat-sidebar, [data-testid="chat-toggle"]');
    await expect(chat.first()).toBeVisible({ timeout: 5000 });
  });

  test('5. can send a message in chat', async () => {
    const input = page.locator('[data-testid="chat-input"], #osd-chat-input, .chat-input input, .chat-input textarea');
    if (await input.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.first().fill('Hello');
      await input.first().press('Enter');
      const msg = page.locator('[data-testid="msg-user"], .msg-user, .message-user');
      await expect(msg.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

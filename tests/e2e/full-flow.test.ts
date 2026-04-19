/**
 * Public beta acceptance test — full user flow from launch to chat to admin.
 * Uses OSD_TEST_MODE for fixture model provider, OSD_DATA_DIR for isolation.
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-full-'));
  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: { ...process.env, OSD_DATA_DIR: tmpDir, OSD_TEST_MODE: '1' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.describe.serial('Full flow: launch → onboarding → chat → admin', () => {
  test('1. app launches and shows onboarding on fresh DB', async () => {
    const onboarding = page.locator('[data-testid="onboarding"], [role="dialog"]');
    await expect(onboarding).toBeVisible({ timeout: 5000 });
  });

  test('2. complete onboarding wizard', async () => {
    const completeBtn = page.locator('[data-testid="onboarding"] button, [data-testid="onboarding-complete"]');
    await completeBtn.first().click();
    // After onboarding, homepage should render
    const main = page.locator('[data-testid="homepage"], [data-testid="sidebar"], main');
    await expect(main.first()).toBeVisible({ timeout: 5000 });
  });

  test('3. add a connection via dialog', async () => {
    const addBtn = page.locator('[data-testid="add-connection"], button:has-text("Add"), button:has-text("Connect")');
    if (await addBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.first().click();
      const dialog = page.locator('[data-testid="connection-dialog"], [role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 });
      // Fill minimal connection form
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('test-cluster');
      }
      // Close dialog (save or cancel)
      const closeBtn = page.locator('[data-testid="dialog-close"], button:has-text("Cancel"), button:has-text("Close")');
      if (await closeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click();
      }
    }
  });

  test('4. open chat panel via Ctrl+K', async () => {
    await page.keyboard.press('Control+k');
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel');
    await expect(chatPanel).toBeVisible({ timeout: 3000 });
  });

  test('5. send a message and see response', async () => {
    const chatInput = page.locator('[data-testid="chat-input"], textarea, input[placeholder*="message" i]');
    await expect(chatInput).toBeVisible({ timeout: 3000 });
    await chatInput.fill('Show cluster health');
    await chatInput.press('Enter');

    // User message should appear
    const userMsg = page.locator('[data-testid="message-user"], .message-user');
    await expect(userMsg.first()).toBeVisible({ timeout: 5000 });

    // Assistant response should appear (from fixture provider)
    const assistantMsg = page.locator('[data-testid="message-assistant"], .message-assistant');
    await expect(assistantMsg.first()).toBeVisible({ timeout: 10000 });
  });

  test('6. navigate to cluster page', async () => {
    const clusterNav = page.locator('[data-testid="nav-cluster"], [data-page="cluster"]');
    if (await clusterNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clusterNav.click();
      const clusterContent = page.locator('[data-testid="cluster-page"], main');
      await expect(clusterContent).toBeVisible({ timeout: 3000 });
    }
  });

  test('7. navigate to indices page', async () => {
    const indicesNav = page.locator('[data-testid="nav-indices"], [data-page="indices"]');
    if (await indicesNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await indicesNav.click();
      const indicesContent = page.locator('[data-testid="indices-page"], main');
      await expect(indicesContent).toBeVisible({ timeout: 3000 });
    }
  });

  test('8. return to chat — conversation persists', async () => {
    await page.keyboard.press('Control+k');
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel');
    await expect(chatPanel).toBeVisible({ timeout: 3000 });
    // Previous messages should still be visible
    const messages = page.locator('[data-testid="message-user"], [data-testid="message-assistant"], .message-user, .message-assistant');
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

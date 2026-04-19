/**
 * E2E acceptance test — OSD-wrapping architecture with chat overlay.
 * Launch → OSD loads → chat button → sidebar → send message → Cmd+K toggle
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-overlay-'));
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

test.describe.serial('Chat overlay E2E', () => {
  test('1. app launches and chat button is visible', async () => {
    const chatBtn = page.locator('[data-testid="chat-toggle"], #osd-chat-toggle, button.chat-toggle');
    await expect(chatBtn.first()).toBeVisible({ timeout: 15000 });
  });

  test('2. clicking chat button opens sidebar', async () => {
    const chatBtn = page.locator('[data-testid="chat-toggle"], #osd-chat-toggle, button.chat-toggle');
    await chatBtn.first().click();
    const sidebar = page.locator('[data-testid="chat-sidebar"], #osd-chat-sidebar, .chat-sidebar');
    await expect(sidebar.first()).toBeVisible({ timeout: 3000 });
  });

  test('3. send message and get response', async () => {
    const input = page.locator('[data-testid="chat-input"], #osd-chat-input, .chat-input input, .chat-input textarea');
    await expect(input.first()).toBeVisible({ timeout: 3000 });
    await input.first().fill('Hello agent');
    await input.first().press('Enter');

    // User message appears
    const userMsg = page.locator('[data-testid="msg-user"], .msg-user, .message-user');
    await expect(userMsg.first()).toBeVisible({ timeout: 5000 });

    // Agent response appears (from fixture/mock provider)
    const agentMsg = page.locator('[data-testid="msg-assistant"], .msg-assistant, .message-assistant');
    await expect(agentMsg.first()).toBeVisible({ timeout: 10000 });
  });

  test('4. Cmd+K toggles overlay closed', async () => {
    const sidebar = page.locator('[data-testid="chat-sidebar"], #osd-chat-sidebar, .chat-sidebar');
    await expect(sidebar.first()).toBeVisible();
    await page.keyboard.press('Meta+k');
    await expect(sidebar.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('5. Cmd+K toggles overlay open again', async () => {
    await page.keyboard.press('Meta+k');
    const sidebar = page.locator('[data-testid="chat-sidebar"], #osd-chat-sidebar, .chat-sidebar');
    await expect(sidebar.first()).toBeVisible({ timeout: 3000 });
  });

  test('6. previous messages persist after toggle', async () => {
    const messages = page.locator('[data-testid="msg-user"], [data-testid="msg-assistant"], .msg-user, .msg-assistant');
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

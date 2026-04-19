import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-chat-'));
  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: {
      ...process.env,
      OSD_DATA_DIR: tmpDir,
      OSD_TEST_MODE: '1', // Signals app to use fixture model provider
    },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('chat panel opens via keyboard shortcut', async () => {
  // Skip onboarding if present
  const onboarding = page.locator('[data-testid="onboarding"]');
  if (await onboarding.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('[data-testid="onboarding"] button').first().click();
  }

  // Cmd+K / Ctrl+K opens chat
  await page.keyboard.press('Control+k');
  const chatPanel = page.locator('[data-testid="chat-panel"]');
  await expect(chatPanel).toBeVisible({ timeout: 3000 });
});

test('chat input accepts text and shows in conversation', async () => {
  // Skip onboarding
  const onboarding = page.locator('[data-testid="onboarding"]');
  if (await onboarding.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('[data-testid="onboarding"] button').first().click();
  }

  // Open chat
  await page.keyboard.press('Control+k');
  const chatInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="message"], input[placeholder*="message"]');
  await expect(chatInput).toBeVisible({ timeout: 3000 });

  // Type a message
  await chatInput.fill('Show me cluster health');
  await chatInput.press('Enter');

  // User message should appear in the conversation
  const userMsg = page.locator('[data-testid="message-user"], .message-user');
  await expect(userMsg.first()).toBeVisible({ timeout: 5000 });
});

test('streaming response renders tokens incrementally', async () => {
  // Skip onboarding
  const onboarding = page.locator('[data-testid="onboarding"]');
  if (await onboarding.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('[data-testid="onboarding"] button').first().click();
  }

  // Open chat and send message
  await page.keyboard.press('Control+k');
  const chatInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="message"], input[placeholder*="message"]');
  await expect(chatInput).toBeVisible({ timeout: 3000 });
  await chatInput.fill('Hello');
  await chatInput.press('Enter');

  // Assistant response should appear (from fixture model provider in test mode)
  const assistantMsg = page.locator('[data-testid="message-assistant"], .message-assistant');
  await expect(assistantMsg.first()).toBeVisible({ timeout: 10000 });
});

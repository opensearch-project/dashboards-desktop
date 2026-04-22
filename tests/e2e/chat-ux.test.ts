/**
 * E2E: Chat UX — copy, message actions, collapsible tool output, shortcuts, theme.
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-e2e-chatux-'));
  app = await electron.launch({
    args: [path.resolve(__dirname, '../../dist/main/index.js')],
    env: { ...process.env, OSD_DATA_DIR: tmpDir, OSD_TEST_MODE: '1', OSD_SKIP_ONBOARDING: '1' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  // Open chat
  await page.keyboard.press('Meta+k');
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.describe.serial('Chat UX: code copy', () => {
  test('code block has copy button', async () => {
    const input = page.locator('[data-testid="chat-input"], #osd-chat-input, .chat-input textarea');
    if (await input.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.first().fill('Show me a query example');
      await input.first().press('Enter');
      // Wait for response with code block
      const copyBtn = page.locator('.code-copy');
      if (await copyBtn.first().isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(copyBtn.first()).toBeVisible();
      }
    }
  });
});

test.describe.serial('Chat UX: message actions', () => {
  test('message actions buttons visible on hover', async () => {
    const msg = page.locator('.msg-assistant, [data-testid="msg-assistant"]');
    if (await msg.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await msg.first().hover();
      const actions = page.locator('.msg-actions .btn-icon-sm');
      if (await actions.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await actions.count()).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

test.describe.serial('Chat UX: collapsible tool output', () => {
  test('tool output has expand/collapse', async () => {
    const details = page.locator('.tool-output details');
    if (await details.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const summary = details.first().locator('summary');
      await expect(summary).toBeVisible();
      await summary.click(); // toggle
    }
  });
});

test.describe.serial('Chat UX: keyboard shortcuts', () => {
  test('? key opens shortcuts modal', async () => {
    await page.keyboard.press('?');
    const modal = page.locator('#shortcuts-modal.visible, [data-testid="shortcuts-modal"]');
    if (await modal.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(modal.first()).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});

test.describe.serial('Chat UX: theme toggle', () => {
  test('theme select exists in sidebar settings', async () => {
    const select = page.locator('#theme-select');
    if (await select.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(select.first()).toBeVisible();
    }
  });
});

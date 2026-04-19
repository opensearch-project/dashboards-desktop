/**
 * E2E acceptance test — full user flow with OSD-wrapping architecture.
 * Launch → OSD loads at localhost:5601 → chat overlay → send message → admin via OSD
 *
 * STUB: Requires sde M3 (OSD lifecycle) + fee M4 (chat overlay) to implement fully.
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

test.describe.serial('Full flow: launch → OSD → chat → admin', () => {
  test('1. app launches and shows onboarding or OSD loading', async () => {
    // First run: onboarding wizard OR OSD loading indicator
    const content = page.locator('[data-testid="onboarding"], [data-testid="osd-loading"], webview, iframe');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('2. OSD web UI loads at localhost:5601', async () => {
    // After onboarding, BrowserWindow should load OSD
    // TODO: implement once sde lands OSD lifecycle (M3)
    test.skip(true, 'Blocked on sde M3: OSD lifecycle');
  });

  test('3. chat overlay is accessible', async () => {
    // Chat overlay injected into OSD page
    // TODO: implement once fee lands chat overlay (M4)
    test.skip(true, 'Blocked on fee M4: chat overlay');
  });

  test('4. send message via chat overlay and get response', async () => {
    // Type message in overlay, get agent response
    // TODO: implement once fee M4 + aieng wiring complete
    test.skip(true, 'Blocked on fee M4 + aieng wiring');
  });

  test('5. navigate OSD admin pages (cluster, indices, security)', async () => {
    // OSD provides admin UI natively — verify navigation works
    // TODO: implement once OSD is running
    test.skip(true, 'Blocked on sde M3: OSD lifecycle');
  });

  test('6. multi-cluster switching via connection manager', async () => {
    // Switch active cluster, OSD reloads with new datasource
    // TODO: implement once signing proxy supports multi-cluster
    test.skip(true, 'Blocked on sde M3: signing proxy');
  });
});

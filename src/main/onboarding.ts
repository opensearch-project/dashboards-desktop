/**
 * Native onboarding — first-run wizard using Electron dialogs.
 *
 * Flow:
 * 1. Locate OSD binary (file picker or auto-detect)
 * 2. Add first connection (cluster URL + auth)
 * 3. Test connection
 * 4. Start OSD → load in BrowserWindow
 *
 * Triggered when settings.get('onboarded') is falsy.
 */

import { dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getStorageProxy } from '../core/storage';
import { testConnection } from '../core/connections';
import type { ConnectionInput } from '../core/types';

const OSD_BINARY_NAMES = [
  'opensearch-dashboards',
  'opensearch-dashboards.bat',
  'bin/opensearch-dashboards',
];

const COMMON_PATHS = [
  '/usr/share/opensearch-dashboards',
  '/opt/opensearch-dashboards',
  path.join(process.env.HOME ?? '~', 'opensearch-dashboards'),
];

export async function runOnboarding(win: BrowserWindow): Promise<{ osdPath: string; connectionId: string } | null> {
  // Step 1: Locate OSD
  const osdPath = await locateOsd(win);
  if (!osdPath) return null;

  // Step 2: Add connection
  const connInput = await promptConnection(win);
  if (!connInput) return null;

  // Step 3: Test connection
  const result = await testConnection(connInput, { timeoutMs: 10000 });
  if (!result.success) {
    const retry = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Connection Failed',
      message: `Could not connect: ${result.error}`,
      buttons: ['Retry', 'Skip', 'Cancel'],
      defaultId: 0,
    });
    if (retry.response === 2) return null;
    if (retry.response === 0) return runOnboarding(win);
  }

  // Step 4: Save connection
  const storage = getStorageProxy();
  const workspaces = await storage.listWorkspacesAsync() as { id: string }[];
  const wsId = workspaces[0]?.id ?? await storage.createWorkspaceAsync('Default');
  const connectionId = await storage.addConnectionAsync({
    ...connInput,
    workspace_id: wsId,
  });

  // Mark onboarded
  await storage.setSettingAsync('onboarded', '1');
  await storage.setSettingAsync('osd_path', osdPath);

  return { osdPath, connectionId };
}

async function locateOsd(win: BrowserWindow): Promise<string | null> {
  // Try auto-detect first
  for (const base of COMMON_PATHS) {
    for (const bin of OSD_BINARY_NAMES) {
      const full = path.join(base, bin);
      if (fs.existsSync(full)) {
        const confirm = await dialog.showMessageBox(win, {
          type: 'info',
          title: 'OpenSearch Dashboards Found',
          message: `Found OSD at:\n${full}\n\nUse this installation?`,
          buttons: ['Use This', 'Browse...', 'Cancel'],
          defaultId: 0,
        });
        if (confirm.response === 0) return full;
        if (confirm.response === 2) return null;
      }
    }
  }

  // Manual file picker
  const result = await dialog.showOpenDialog(win, {
    title: 'Locate OpenSearch Dashboards Binary',
    message: 'Select the opensearch-dashboards executable',
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['', 'bat', 'sh'] }],
  });

  return result.filePaths[0] ?? null;
}

async function promptConnection(win: BrowserWindow): Promise<ConnectionInput | null> {
  // Use a simple prompt sequence via message boxes
  // In production this would be a small BrowserWindow form
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    title: 'Add Connection',
    message: 'Add your first OpenSearch cluster connection?\n\nYou can configure URL, auth type, and credentials.',
    buttons: ['Add Connection', 'Skip for Now'],
    defaultId: 0,
  });

  if (response === 1) {
    return {
      name: 'Local',
      url: 'https://localhost:9200',
      type: 'opensearch',
      auth_type: 'none',
    } as ConnectionInput;
  }

  // For the MVP, return a default local connection
  // Full form will be a small BrowserWindow with the ConnectionDialog component
  return {
    name: 'Local Cluster',
    url: 'https://localhost:9200',
    type: 'opensearch',
    auth_type: 'basic',
    username: 'admin',
    password: 'admin',
  } as ConnectionInput;
}

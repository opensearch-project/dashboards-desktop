/**
 * Feedback — screenshot + metadata → GitHub issue.
 */

import { ipcMain, BrowserWindow, clipboard, nativeImage, shell } from 'electron';
import { platform, arch, release } from 'os';

const REPO_URL = 'https://github.com/opensearch-project/dashboards-desktop/issues/new';
const MAX_ERRORS = 20;
const errorBuffer: string[] = [];

/** Call once to start buffering console errors from OSD */
export function captureOsdErrors(webContents: Electron.WebContents): void {
  webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) { // warning + error
      errorBuffer.push(`[${level === 2 ? 'WARN' : 'ERROR'}] ${message.slice(0, 200)}`);
      if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
    }
  });
}

export function registerFeedbackIPC(): void {
  ipcMain.handle('sidebar:feedback', async () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    // Screenshot → clipboard
    const image = await win.webContents.capturePage();
    clipboard.writeImage(nativeImage.createFromBuffer(image.toPNG()));

    // Metadata
    const meta = [
      `OS: ${platform()} ${arch()} ${release()}`,
      `Electron: ${process.versions.electron}`,
      `Node: ${process.versions.node}`,
      `App: ${require('../../package.json').version}`,
    ].join('\n');

    // Build body
    const errors = errorBuffer.length
      ? `\n\n**Console Errors:**\n\`\`\`\n${errorBuffer.join('\n')}\n\`\`\``
      : '';

    const body = `**Environment:**\n\`\`\`\n${meta}\n\`\`\`\n\n**Description:**\n<!-- Describe the issue -->\n${errors}\n\n**Screenshot:**\n<!-- Paste with Cmd+V / Ctrl+V (already copied to clipboard) -->\n`;

    const url = `${REPO_URL}?title=${encodeURIComponent('[Feedback] ')}&body=${encodeURIComponent(body)}`;
    shell.openExternal(url);
  });
}

/**
 * Feedback — form dialog → screenshot + metadata → GitHub issue.
 */

import { ipcMain, BrowserWindow, clipboard, nativeImage, shell } from 'electron';
import { platform, arch, release } from 'os';

const REPO_URL = 'https://github.com/opensearch-project/dashboards-desktop/issues/new';
const MAX_ERRORS = 20;
const errorBuffer: string[] = [];

export function captureOsdErrors(webContents: Electron.WebContents): void {
  webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) {
      errorBuffer.push(`[${level === 2 ? 'WARN' : 'ERROR'}] ${message.slice(0, 200)}`);
      if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
    }
  });
}

export function registerFeedbackIPC(): void {
  ipcMain.handle('sidebar:feedback', async () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    // Capture screenshot
    const image = await win.webContents.capturePage();
    const screenshotDataUrl = `data:image/png;base64,${image.toPNG().toString('base64')}`;

    // Collect metadata
    let appVersion = '0.0.0';
    try { appVersion = require('../../package.json').version; } catch {}
    const meta = {
      os: `${platform()} ${arch()} ${release()}`,
      electron: process.versions.electron,
      node: process.versions.node,
      app: appVersion,
      errors: errorBuffer.slice(),
    };

    // Open feedback form window
    const formWin = new BrowserWindow({
      width: 520, height: 580, parent: win, modal: true,
      resizable: false, minimizable: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    formWin.loadURL('about:blank');
    formWin.webContents.on('did-finish-load', () => {
      formWin.webContents.executeJavaScript(`
        const meta = ${JSON.stringify(meta)};
        const screenshot = "${screenshotDataUrl}";
        document.body.innerHTML = \`${FORM_HTML}\`;
      `).catch(() => {});
    });

    // Handle submit from form
    ipcMain.removeHandler('feedback:submit');
    ipcMain.handle('feedback:submit', (_e, data: { type: string; title: string; description: string; includeScreenshot: boolean }) => {
      const labelMap: Record<string, string> = { bug: 'bug', feature: 'enhancement', feedback: 'feedback' };
      const prefix = data.type === 'bug' ? '[Bug]' : data.type === 'feature' ? '[Feature]' : '[Feedback]';
      const title = `${prefix} ${data.title}`;

      const metaBlock = [
        '**Environment:**',
        '```',
        `OS: ${meta.os}`,
        `Electron: ${meta.electron}`,
        `App: ${meta.app}`,
        '```',
      ].join('\n');

      const errBlock = meta.errors.length
        ? `\n**Console Errors (${meta.errors.length}):**\n\`\`\`\n${meta.errors.join('\n')}\n\`\`\``
        : '';

      const body = `${data.description}\n\n${metaBlock}${errBlock}\n\n**Screenshot:**\n_Paste with Cmd+V / Ctrl+V (copied to clipboard)_\n`;

      if (data.includeScreenshot) {
        clipboard.writeImage(nativeImage.createFromBuffer(image.toPNG()));
      }

      const url = `${REPO_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${labelMap[data.type] || 'feedback'}`;
      shell.openExternal(url);
      formWin.close();
    });

    ipcMain.removeHandler('feedback:cancel');
    ipcMain.handle('feedback:cancel', () => { formWin.close(); });
  });
}

const FORM_HTML = `
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,system-ui,sans-serif; background:#1a1a2e; color:#e8e8f0; padding:24px; }
  h2 { font-size:18px; margin-bottom:16px; }
  label { display:block; font-size:13px; color:#a0a0c0; margin:12px 0 4px; }
  select, input, textarea { width:100%; padding:8px 10px; border-radius:6px; border:1px solid #333; background:#252540; color:#e8e8f0; font-size:14px; }
  textarea { height:120px; resize:vertical; }
  .meta { font-size:11px; color:#666; background:#1e1e35; padding:8px; border-radius:4px; margin-top:12px; white-space:pre-wrap; max-height:80px; overflow:auto; }
  .screenshot { margin-top:8px; }
  .screenshot img { max-width:100%; max-height:80px; border-radius:4px; border:1px solid #333; }
  .actions { margin-top:16px; display:flex; gap:8px; justify-content:flex-end; }
  button { padding:8px 16px; border-radius:6px; border:none; cursor:pointer; font-size:14px; }
  .submit { background:#4da6ff; color:#fff; }
  .cancel { background:#333; color:#a0a0c0; }
  .checkbox { display:flex; align-items:center; gap:6px; margin-top:8px; }
  .checkbox input { width:auto; }
</style>
<h2>Send Feedback</h2>
<label>Type</label>
<select id="type">
  <option value="feedback">General Feedback</option>
  <option value="bug">Bug Report</option>
  <option value="feature">Feature Request</option>
</select>
<label>Title</label>
<input id="title" placeholder="Brief summary..." />
<label>Description</label>
<textarea id="desc" placeholder="What happened? What did you expect?"></textarea>
<div class="screenshot">
  <label>Screenshot (auto-captured)</label>
  <img src="\${screenshot}" />
  <div class="checkbox"><input type="checkbox" id="incScreenshot" checked /><label for="incScreenshot" style="margin:0;display:inline">Include screenshot</label></div>
</div>
<div class="meta">OS: \${meta.os} | Electron: \${meta.electron} | App: \${meta.app}\nErrors buffered: \${meta.errors.length}</div>
<div class="actions">
  <button class="cancel" onclick="require('electron').ipcRenderer.invoke('feedback:cancel')">Cancel</button>
  <button class="submit" onclick="submit()">Submit</button>
</div>
<script>
  function submit() {
    require('electron').ipcRenderer.invoke('feedback:submit', {
      type: document.getElementById('type').value,
      title: document.getElementById('title').value,
      description: document.getElementById('desc').value,
      includeScreenshot: document.getElementById('incScreenshot').checked,
    });
  }
</script>
`;

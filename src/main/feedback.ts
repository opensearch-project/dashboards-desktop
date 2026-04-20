/**
 * Feedback — form dialog → screenshot + metadata → GitHub issue.
 */

import { ipcMain, BrowserWindow } from 'electron';
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
  let formWin: BrowserWindow | null = null;

  ipcMain.handle('sidebar:feedback', async () => {
    if (formWin && !formWin.isDestroyed()) { formWin.focus(); return; }

    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    const image = await win.webContents.capturePage();
    const screenshotB64 = image.toPNG().toString('base64');

    let appVersion = '0.0.0';
    try { appVersion = require('../../package.json').version; } catch { /* ignore */ }
    const meta = JSON.stringify({
      os: `${platform()} ${arch()} ${release()}`,
      electron: process.versions.electron,
      node: process.versions.node,
      app: appVersion,
      errors: errorBuffer.slice(),
    });

    formWin = new BrowserWindow({
      width: 520, height: 580, parent: win, modal: true,
      resizable: false, minimizable: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    formWin.on('closed', () => { formWin = null; });

    // Build HTML with embedded data — no IPC needed
    const html = FORM_HTML
      .replace('__META__', meta.replace(/'/g, "\\'"))
      .replace('__SCREENSHOT__', screenshotB64)
      .replace('__REPO_URL__', REPO_URL);

    formWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

const FORM_HTML = `<!DOCTYPE html><html><head><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,system-ui,sans-serif; background:#1a1a2e; color:#e8e8f0; padding:24px; }
h2 { font-size:18px; margin-bottom:16px; }
label { display:block; font-size:13px; color:#a0a0c0; margin:12px 0 4px; }
select, input, textarea { width:100%; padding:8px 10px; border-radius:6px; border:1px solid #333; background:#252540; color:#e8e8f0; font-size:14px; }
textarea { height:120px; resize:vertical; }
.meta { font-size:11px; color:#666; background:#1e1e35; padding:8px; border-radius:4px; margin-top:12px; }
.screenshot img { max-width:100%; max-height:80px; border-radius:4px; border:1px solid #333; margin-top:4px; }
.actions { margin-top:16px; display:flex; gap:8px; justify-content:flex-end; }
button { padding:8px 16px; border-radius:6px; border:none; cursor:pointer; font-size:14px; }
.submit { background:#4da6ff; color:#fff; }
.cancel { background:#333; color:#a0a0c0; }
.cb { display:flex; align-items:center; gap:6px; margin-top:8px; }
.cb input { width:auto; }
</style></head><body>
<h2>Send Feedback</h2>
<label>Type</label>
<select id="type"><option value="feedback">General Feedback</option><option value="bug">Bug Report</option><option value="feature">Feature Request</option></select>
<label>Title</label>
<input id="title" placeholder="Brief summary..." />
<label>Description</label>
<textarea id="desc" placeholder="What happened? What did you expect?"></textarea>
<div class="screenshot"><label>Screenshot</label><img src="data:image/png;base64,__SCREENSHOT__" />
<div class="cb"><input type="checkbox" id="inc" checked /><label for="inc" style="margin:0;display:inline">Include screenshot</label></div></div>
<div class="actions">
<button class="cancel" onclick="window.close()">Cancel</button>
<button class="submit" onclick="submitFeedback()">Submit</button>
</div>
<script>
const meta = JSON.parse('__META__');
function submitFeedback() {
  const labels = { bug:'bug', feature:'enhancement', feedback:'feedback' };
  const t = document.getElementById('type').value;
  const prefix = t==='bug'?'[Bug]':t==='feature'?'[Feature]':'[Feedback]';
  const title = prefix + ' ' + document.getElementById('title').value;
  const desc = document.getElementById('desc').value;
  const metaBlock = '**Environment:**\\n\`\`\`\\nOS: '+meta.os+'\\nElectron: '+meta.electron+'\\nApp: '+meta.app+'\\n\`\`\`';
  const errBlock = meta.errors.length ? '\\n**Console Errors:**\\n\`\`\`\\n'+meta.errors.join('\\n')+'\\n\`\`\`' : '';
  const body = desc+'\\n\\n'+metaBlock+errBlock+'\\n\\n**Screenshot:**\\n_Paste with Cmd+V_';
  if (document.getElementById('inc').checked) {
    require('electron').clipboard.writeImage(require('electron').nativeImage.createFromDataURL('data:image/png;base64,__SCREENSHOT__'));
  }
  require('electron').shell.openExternal('__REPO_URL__?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body)+'&labels='+(labels[t]||'feedback'));
  window.close();
}
</script></body></html>`;

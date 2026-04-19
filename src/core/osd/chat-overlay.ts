/**
 * Chat Overlay — injects an agent chat sidebar into the OSD BrowserWindow.
 * Uses webContents.executeJavaScript to add a floating panel.
 */

import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../core/types';

const OVERLAY_CSS = `
#osd-chat-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: var(--euiColorEmptyShade, #1a1a2e);
  border-left: 1px solid var(--euiColorLightShade, #3a3a5a);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--euiTextColor, #e8e8f0);
  box-shadow: -4px 0 20px rgba(0,0,0,0.3);
  transform: translateX(100%);
  transition: transform 0.2s ease;
}
#osd-chat-overlay.open { transform: translateX(0); }
#osd-chat-overlay .chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--euiColorLightShade, #3a3a5a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
#osd-chat-overlay .chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
#osd-chat-overlay .chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid var(--euiColorLightShade, #3a3a5a);
}
#osd-chat-overlay .chat-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--euiColorLightShade, #3a3a5a);
  background: var(--euiColorLightestShade, #232340);
  color: inherit;
  font-size: 14px;
  outline: none;
  resize: none;
}
#osd-chat-overlay .chat-input:focus {
  border-color: var(--euiColorPrimary, #4da6ff);
}
#osd-chat-overlay .msg { margin-bottom: 12px; line-height: 1.5; font-size: 14px; }
#osd-chat-overlay .msg.user { color: var(--euiColorPrimary, #4da6ff); }
#osd-chat-overlay .msg.assistant { color: var(--euiTextColor, #e8e8f0); }
#osd-chat-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--euiColorPrimary, #0073e6);
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  z-index: 99998;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
`;

const OVERLAY_HTML = `
<div id="osd-chat-overlay">
  <div class="chat-header">
    <span>💬 Agent Chat</span>
    <button onclick="document.getElementById('osd-chat-overlay').classList.remove('open')" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px">✕</button>
  </div>
  <div class="chat-messages" id="osd-chat-messages"></div>
  <div class="chat-input-area">
    <textarea class="chat-input" id="osd-chat-input" rows="2" placeholder="Ask anything... (Enter to send)"></textarea>
  </div>
</div>
<button id="osd-chat-toggle" onclick="document.getElementById('osd-chat-overlay').classList.toggle('open')">💬</button>
`;

const OVERLAY_JS = `
(function() {
  if (document.getElementById('osd-chat-overlay')) return;
  const style = document.createElement('style');
  style.textContent = \`${OVERLAY_CSS}\`;
  document.head.appendChild(style);
  const div = document.createElement('div');
  div.innerHTML = \`${OVERLAY_HTML}\`;
  document.body.appendChild(div);

  const input = document.getElementById('osd-chat-input');
  const messages = document.getElementById('osd-chat-messages');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      addMessage('user', text);
      input.value = '';
      window.electronAPI?.sendChat(text);
    }
  });

  window.addChatMessage = (role, content) => addMessage(role, content);

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = (role === 'user' ? '→ ' : '← ') + content;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
})();
`;

export function injectChatOverlay(win: BrowserWindow): void {
  // Inject after page loads
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(OVERLAY_JS).catch(() => {});
  });

  // Also inject on navigation (SPA route changes)
  win.webContents.on('did-navigate-in-page', () => {
    win.webContents.executeJavaScript(OVERLAY_JS).catch(() => {});
  });
}

export function registerChatOverlayIPC(win: BrowserWindow): void {
  // Receive messages from renderer overlay
  ipcMain.on('chat:send', async (_e, message: string) => {
    // Forward to agent runtime — will be wired to AgentRuntime.chat()
    win.webContents.executeJavaScript(
      `window.addChatMessage('assistant', 'Processing...')`
    ).catch(() => {});
  });
}

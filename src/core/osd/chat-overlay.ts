/**
 * Chat Overlay — injects an agent chat sidebar into the OSD BrowserWindow.
 * Uses webContents.executeJavaScript to add a floating panel.
 *
 * Features: streaming tokens, markdown rendering, typing indicator, Cmd+K toggle
 */

import { BrowserWindow, ipcMain, globalShortcut } from 'electron';

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
#osd-chat-overlay .chat-resize {
  position: absolute; left: -4px; top: 0; width: 8px; height: 100%;
  cursor: col-resize; z-index: 1;
}
#osd-chat-overlay .chat-resize:hover { background: var(--euiColorPrimary, #4da6ff); opacity: 0.3; }
#osd-chat-overlay .chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--euiColorLightShade, #3a3a5a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
#osd-chat-overlay .chat-header-actions { display: flex; gap: 8px; }
#osd-chat-overlay .chat-header-actions button {
  background: none; border: none; color: inherit; cursor: pointer; font-size: 16px; opacity: 0.7;
}
#osd-chat-overlay .chat-header-actions button:hover { opacity: 1; }
#osd-chat-overlay .chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
#osd-chat-overlay .chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid var(--euiColorLightShade, #3a3a5a);
  display: flex;
  gap: 8px;
}
#osd-chat-overlay .chat-input {
  flex: 1;
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
#osd-chat-overlay .chat-send {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: var(--euiColorPrimary, #0073e6);
  color: white;
  cursor: pointer;
  font-size: 14px;
}
#osd-chat-overlay .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
#osd-chat-overlay .msg { margin-bottom: 12px; line-height: 1.6; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
#osd-chat-overlay .msg.user { color: var(--euiColorPrimary, #4da6ff); }
#osd-chat-overlay .msg.assistant { color: var(--euiTextColor, #e8e8f0); }
#osd-chat-overlay .msg code { background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 3px; font-size: 13px; }
#osd-chat-overlay .msg pre { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; overflow-x: auto; margin: 8px 0; position: relative; }
#osd-chat-overlay .msg pre code { background: none; padding: 0; }
#osd-chat-overlay .msg pre .copy-btn {
  position: absolute; top: 4px; right: 4px; background: rgba(255,255,255,0.1);
  border: none; color: inherit; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; opacity: 0.6;
}
#osd-chat-overlay .msg pre .copy-btn:hover { opacity: 1; }
#osd-chat-overlay .typing { opacity: 0.6; font-style: italic; }
#osd-chat-overlay .chat-empty { text-align: center; opacity: 0.5; margin-top: 40%; }
#osd-chat-overlay .model-switcher {
  display: flex; align-items: center; gap: 6px; padding: 6px 16px;
  border-bottom: 1px solid var(--euiColorLightShade, #3a3a5a); font-size: 12px;
}
#osd-chat-overlay .model-switcher select {
  flex: 1; background: var(--euiColorLightestShade, #232340); color: inherit;
  border: 1px solid var(--euiColorLightShade, #3a3a5a); border-radius: 4px; padding: 4px 8px; font-size: 12px;
}
#osd-chat-overlay .conv-list {
  max-height: 200px; overflow-y: auto; border-bottom: 1px solid var(--euiColorLightShade, #3a3a5a);
}
#osd-chat-overlay .conv-item {
  padding: 8px 16px; cursor: pointer; font-size: 13px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; border-bottom: 1px solid rgba(255,255,255,0.05);
}
#osd-chat-overlay .conv-item:hover { background: rgba(255,255,255,0.05); }
#osd-chat-overlay .conv-item.active { background: rgba(77,166,255,0.15); }
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
  transition: transform 0.15s ease;
}
#osd-chat-toggle:hover { transform: scale(1.1); }
@media (prefers-reduced-motion: reduce) {
  #osd-chat-overlay, #osd-chat-toggle { transition: none; }
}
`;

const OVERLAY_HTML = `
<div id="osd-chat-overlay" role="complementary" aria-label="Agent Chat">
  <div class="chat-resize" id="osd-chat-resize" title="Drag to resize"></div>
  <div class="chat-header">
    <span>💬 Agent Chat</span>
    <div class="chat-header-actions">
      <button onclick="window.__osdChat.toggleConvs()" title="Conversations" aria-label="Toggle conversations">📋</button>
      <button onclick="window.__osdChat.clear()" title="Clear chat" aria-label="Clear chat">🗑</button>
      <button onclick="window.__osdChat.toggle()" title="Close (⌘K)" aria-label="Close chat">✕</button>
    </div>
  </div>
  <div class="model-switcher">
    <label for="osd-model-select">Model:</label>
    <select id="osd-model-select" aria-label="Select model"></select>
  </div>
  <div class="conv-list" id="osd-conv-list" style="display:none" role="list" aria-label="Conversations"></div>
  <div class="chat-messages" id="osd-chat-messages" role="log" aria-live="polite">
    <div class="chat-empty">Ask anything about your data.<br/>⌘K to toggle.</div>
  </div>
  <div class="chat-input-area">
    <textarea class="chat-input" id="osd-chat-input" rows="2" placeholder="Ask anything… (Enter to send)" aria-label="Message input"></textarea>
    <button class="chat-send" id="osd-chat-send" aria-label="Send message">↑</button>
  </div>
</div>
<button id="osd-chat-toggle" onclick="window.__osdChat.toggle()" aria-label="Open agent chat">💬</button>
`;

const OVERLAY_JS = `
(function() {
  if (document.getElementById('osd-chat-overlay')) return;
  const style = document.createElement('style');
  style.textContent = \`${OVERLAY_CSS}\`;
  document.head.appendChild(style);
  const container = document.createElement('div');
  container.innerHTML = \`${OVERLAY_HTML}\`;
  document.body.appendChild(container);

  const overlay = document.getElementById('osd-chat-overlay');
  const input = document.getElementById('osd-chat-input');
  const messages = document.getElementById('osd-chat-messages');
  const sendBtn = document.getElementById('osd-chat-send');
  const modelSelect = document.getElementById('osd-model-select');
  const convList = document.getElementById('osd-conv-list');
  const resizeHandle = document.getElementById('osd-chat-resize');
  let streaming = false;
  let streamEl = null;
  let convsVisible = false;

  // Resize handle
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = overlay.offsetWidth;
    const onMove = (ev) => {
      const newW = Math.max(300, Math.min(800, startW + (startX - ev.clientX)));
      overlay.style.width = newW + 'px';
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Load models
  if (window.osd?.models?.list) {
    window.osd.models.list().then(models => {
      modelSelect.innerHTML = models.map(m =>
        '<option value="' + m.id + '">' + m.name + (m.provider ? ' (' + m.provider + ')' : '') + '</option>'
      ).join('');
    }).catch(() => {});
  }
  modelSelect.addEventListener('change', () => {
    if (window.osd?.models?.setActive) window.osd.models.setActive(modelSelect.value).catch(() => {});
  });

  window.__osdChat = {
    toggle() {
      overlay.classList.toggle('open');
      if (overlay.classList.contains('open')) input.focus();
    },
    toggleConvs() {
      convsVisible = !convsVisible;
      convList.style.display = convsVisible ? 'block' : 'none';
      if (convsVisible) loadConversations();
    },
    clear() {
      messages.innerHTML = '<div class="chat-empty">Ask anything about your data.<br/>\\u2318K to toggle.</div>';
    },
    addMessage(role, content) { addMessage(role, content); },
    startStream() {
      streaming = true;
      streamEl = document.createElement('div');
      streamEl.className = 'msg assistant';
      messages.appendChild(streamEl);
      messages.scrollTop = messages.scrollHeight;
      input.disabled = true;
      sendBtn.disabled = true;
    },
    appendToken(token) {
      if (streamEl) {
        streamEl.textContent += token;
        messages.scrollTop = messages.scrollHeight;
      }
    },
    endStream() {
      streaming = false;
      if (streamEl) streamEl.innerHTML = renderMarkdown(streamEl.textContent);
      streamEl = null;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    },
    streamError(msg) {
      if (streamEl) streamEl.textContent = '\\u26a0\\ufe0f ' + msg;
      streaming = false;
      streamEl = null;
      input.disabled = false;
      sendBtn.disabled = false;
    },
    loadConversation(id) {
      if (window.osd?.conversations?.messages) {
        window.osd.conversations.messages(id).then(msgs => {
          messages.innerHTML = '';
          msgs.forEach(m => { if (m.role === 'user' || m.role === 'assistant') addMessage(m.role, m.content); });
        }).catch(() => {});
      }
    }
  };

  function loadConversations() {
    if (!window.osd?.conversations?.list) return;
    window.osd.workspaces.list().then(ws => {
      const wsId = (ws.find(w => w.is_default) || ws[0])?.id;
      if (!wsId) return;
      return window.osd.conversations.list(wsId);
    }).then(convs => {
      if (!convs) return;
      convList.innerHTML = convs.slice(0, 20).map(c =>
        '<div class="conv-item" onclick="window.__osdChat.loadConversation(\\'' + c.id + '\\')">' + escapeHtml(c.title || 'Untitled') + '</div>'
      ).join('') || '<div class="conv-item">No conversations yet</div>';
    }).catch(() => {});
  }

  function send() {
    const text = input.value.trim();
    if (!text || streaming) return;
    addMessage('user', text);
    input.value = '';
    window.osd?.agent?.send(text).catch(e => window.__osdChat.streamError(e.message || 'Send failed'));
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') window.__osdChat.toggle();
  });
  sendBtn.addEventListener('click', send);

  function addMessage(role, content) {
    const empty = messages.querySelector('.chat-empty');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = role === 'user' ? '\\u2192 ' + escapeHtml(content) : renderMarkdown(content);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/\\\`\\\`\\\`([\\\\s\\\\S]*?)\\\`\\\`\\\`/g, function(_, code) {
      return '<pre><code>' + code + '</code><button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy</button></pre>';
    });
    html = html.replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>');
    html = html.replace(/\\\\*\\\\*(.+?)\\\\*\\\\*/g, '<strong>$1</strong>');
    html = html.replace(/\\\\*(.+?)\\\\*/g, '<em>$1</em>');
    html = html.replace(/\\\\[([^\\\\]]+)\\\\]\\\\(([^)]+)\\\\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1 \\u2197</a>');
    return html;
  }
})();
`;

export function injectChatOverlay(win: BrowserWindow): void {
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(OVERLAY_JS).catch(() => {});
  });

  win.webContents.on('did-navigate-in-page', () => {
    win.webContents.executeJavaScript(OVERLAY_JS).catch(() => {});
  });

  // Cmd+K global shortcut
  globalShortcut.register('CommandOrControl+K', () => {
    win.webContents.executeJavaScript('window.__osdChat?.toggle()').catch(() => {});
  });

  // Wire streaming events from agent runtime
  ipcMain.on('chat-overlay:stream-start', () => {
    win.webContents.executeJavaScript('window.__osdChat?.startStream()').catch(() => {});
  });

  ipcMain.on('chat-overlay:stream-token', (_e, token: string) => {
    const escaped = token.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    win.webContents.executeJavaScript(`window.__osdChat?.appendToken('${escaped}')`).catch(() => {});
  });

  ipcMain.on('chat-overlay:stream-end', () => {
    win.webContents.executeJavaScript('window.__osdChat?.endStream()').catch(() => {});
  });

  ipcMain.on('chat-overlay:stream-error', (_e, msg: string) => {
    const escaped = msg.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    win.webContents.executeJavaScript(`window.__osdChat?.streamError('${escaped}')`).catch(() => {});
  });
}

export function destroyChatOverlay(): void {
  globalShortcut.unregister('CommandOrControl+K');
}

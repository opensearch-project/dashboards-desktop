'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('osd', {
  credentials: {
    save: (key, value) => ipcRenderer.invoke('credentials:save', key, value),
    load: (key) => ipcRenderer.invoke('credentials:load', key),
  },
  connection: {
    test: (opts) => ipcRenderer.invoke('connection:test', opts),
  },
  agent: {
    chat: (message, model) => ipcRenderer.invoke('agent:chat', { message, model }),
  },
});

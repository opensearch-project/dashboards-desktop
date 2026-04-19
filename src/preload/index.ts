import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../core/types';
import type { ConnectionInput } from '../core/types';

const api = {
  storage: {
    init: () => ipcRenderer.invoke(IPC.STORAGE_INIT),
  },
  credentials: {
    save: (key: string, value: string) => ipcRenderer.invoke(IPC.CREDENTIALS_SAVE, key, value),
    load: (key: string) => ipcRenderer.invoke(IPC.CREDENTIALS_LOAD, key),
  },
  connections: {
    add: (input: ConnectionInput) => ipcRenderer.invoke(IPC.CONNECTION_ADD, input),
    update: (id: string, input: Partial<ConnectionInput>) =>
      ipcRenderer.invoke(IPC.CONNECTION_UPDATE, id, input),
    delete: (id: string) => ipcRenderer.invoke(IPC.CONNECTION_DELETE, id),
    list: (workspaceId?: string) => ipcRenderer.invoke(IPC.CONNECTION_LIST, workspaceId),
    test: (input: ConnectionInput) => ipcRenderer.invoke(IPC.CONNECTION_TEST, input),
  },
  workspaces: {
    list: () => ipcRenderer.invoke(IPC.WORKSPACE_LIST),
    create: (name: string) => ipcRenderer.invoke(IPC.WORKSPACE_CREATE, name),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },
};

contextBridge.exposeInMainWorld('osd', api);

/** Type declaration for renderer access */
export type OsdApi = typeof api;

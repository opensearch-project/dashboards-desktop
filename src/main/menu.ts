/**
 * App menu — File, Edit, View, Window, Help with keyboard shortcuts + About dialog.
 */

import { Menu, BrowserWindow, app, dialog, shell, type MenuItemConstructorOptions } from 'electron';

const isMac = process.platform === 'darwin';

export function buildAppMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Conversation', accelerator: 'CmdOrCtrl+N', click: (_m, win) => (win as BrowserWindow)?.webContents.send('menu:newConversation') },
        { label: 'New Workspace', accelerator: 'CmdOrCtrl+Shift+N', click: (_m, win) => (win as BrowserWindow)?.webContents.send('menu:newWorkspace') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: (_m, win) => (win as BrowserWindow)?.webContents.send('menu:settings') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Focus Chat', accelerator: 'CmdOrCtrl+K', click: (_m, win) => (win as BrowserWindow)?.webContents.send('menu:focusChat') },
        { label: 'Toggle Full Screen Chat', accelerator: 'CmdOrCtrl+Shift+Enter', click: (_m, win) => (win as BrowserWindow)?.webContents.send('menu:toggleFullScreenChat') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/opensearch-project/dashboards-desktop'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/opensearch-project/dashboards-desktop/issues'),
        },
        { type: 'separator' },
        ...(!isMac ? [{
          label: 'About OpenSearch Dashboards Desktop',
          click: () => showAboutDialog(),
        }] : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAboutDialog(): void {
  dialog.showMessageBox({
    type: 'info',
    title: 'About OpenSearch Dashboards Desktop',
    message: 'OpenSearch Dashboards Desktop',
    detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}\n\nAn agent-first, local-first desktop application for OpenSearch and Elasticsearch.`,
  });
}

const { contextBridge } = require('electron');
const { ipcRenderer } = require("electron");
const dashboards = require('./dashboards');

contextBridge.exposeInMainWorld(
    'electron',
    {   
        ipcRenderer: ipcRenderer,
        getConfig: () => dashboards.getConfig(),
        setConfig: (key, value, callback) => dashboards.setConfig(key, value, callback),
        startProxy: () => dashboards.startProxy()
    }
)
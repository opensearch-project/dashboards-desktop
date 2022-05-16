const { contextBridge } = require('electron');
const { ipcRenderer } = require("electron");
const dashboards = require('./dashboards');
const configLibrary = require('./config');

contextBridge.exposeInMainWorld(
    'electron',
    {   
        ipcRenderer: ipcRenderer,
        getConfig: (name) => configLibrary.getConfig(name),
        setConfig: (config, callback) => configLibrary.setConfig(config, callback),
        getOSDStatus: () => dashboards.getOSDStatus(),
        startOSD: (config) => dashboards.startOSD(config),
        startProxy: (config) => dashboards.startProxy(config),
        onRefresh: (fn) => {
            ipcRenderer.on("refresh", (event, ...args) => fn(...args));
        },
        
    }
)
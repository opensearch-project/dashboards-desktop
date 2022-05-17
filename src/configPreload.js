const { contextBridge } = require('electron');
const { ipcRenderer } = require("electron");
const configLibrary = require('./config');

contextBridge.exposeInMainWorld(
    'electron',
    {   
        ipcRenderer: ipcRenderer,
        onName: (fn) => {
            ipcRenderer.on("name", (event, ...args) => fn(...args));
        },
        getConfig: (name) => configLibrary.getConfig(name),
        setConfig: (config, callback) => configLibrary.setConfig(config, callback),
    }
)
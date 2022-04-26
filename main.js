const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 1200,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js')
        }
      })
      
      win.loadFile("./index.html");
      win.webContents.openDevTools();
}

async function viewOSD() {
    app.whenReady().then(() => {
        createWindow();
        
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })

}



viewOSD();
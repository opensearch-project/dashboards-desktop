const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');

let mainWindow = null;
function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 1200,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js')
        }
      })
      
      win.loadFile("./src/index.html");
      win.webContents.openDevTools();
      return win;
}

function createConfigWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 1200,
        webPreferences: {
          preload: path.join(__dirname, 'configPreload.js')
        }
      })
      
      win.loadFile("./src/configManager.html");
      win.webContents.openDevTools();
      return win;
}

async function viewOSD() {
    app.whenReady().then(() => {
        mainWindow = createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })

}

ipcMain.handle('swapURL', async (event, arg) => {
    let win = BrowserWindow.getFocusedWindow();
    win.loadURL(arg);
})

ipcMain.handle('openConfig', async (event, name) => {
    var configWindow = createConfigWindow();
    if (name) {
        configWindow.webContents.send('name', name);
    }
})

ipcMain.handle('closeWindow', async (event, arg) => {
    //handle close window and trigger refresh on main page
    let win = BrowserWindow.getFocusedWindow();
    win.close();
    mainWindow.webContents.send('refresh');
})


viewOSD();
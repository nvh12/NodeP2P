const { app, BrowserWindow } = require('electron');
const path = require('path');

function creatWindow() {
    const window = new BrowserWindow({
        width: 1280,
        heigt: 720,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });
    win.loadURL('http://localhost:5173');
}

app.whenReady().then(creatWindow);
'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var mainWindow = null;

app.on('window-all-closed', function(){
  if (process.playform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function(){
  mainWindow = new BrowserWindow({
    width: 620, 
    height: 580, 
    //resizable: false, 
    icon: 'lib/img/app-icon.png'
  });

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function(){
    mainWindow = null;
  });
});
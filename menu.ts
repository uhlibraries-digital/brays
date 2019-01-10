import { createWindow } from './main';

let menu: any[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open Project...',
        accelerator: 'CmdOrCtrl+O',
        click (item, focusedWindow) {
          createWindow();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Export To',
        submenu: [
          {
            label: 'CONTENTdm Package...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-cdm');
            }
          },
          {
            label: 'Armand Package...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-armand');
            }
          },
          {
            label: 'Avalon Package...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-avalon');
            }
          },
          {
            label: 'Metadata...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-metadata');
            }
          }
        ]
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo'
      },
      {
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        role: 'cut'
      },
      {
        role: 'copy'
      },
      {
        role: 'paste'
      },
      {
        role: 'delete'
      },
      {
        role: 'selectall'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preferences...',
        accelerator: 'CmdOrCtrl+,',
        click(item, focusedWindow) {
          if (!focusedWindow) return;
          focusedWindow.webContents.send('show-preferences');
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'togglefullscreen'
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        }
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'close'
      }
    ]
  }
];

if (process.platform === 'darwin') {
  const name = require('electron').app.getName();
  menu.unshift({
    label: name,
    submenu: [
      {
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preferences...',
        click(item, focusedWindow) {
          if (!focusedWindow) return;
          focusedWindow.webContents.send('show-preferences');
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        role: 'hide'
      },
      {
        role: 'hideothers'
      },
      {
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  });

  // File menu
  menu[1].submenu = menu[1].submenu.slice(0, -2);

  // Edit menu.
  menu[2].submenu = menu[2].submenu.slice(0, -2);
  menu[2].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Speech',
      submenu: [
        {
          role: 'startspeaking'
        },
        {
          role: 'stopspeaking'
        }
      ]
    }
  )
  // Window menu.
  menu[4].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  ]
}

export let menuTemplate = menu;

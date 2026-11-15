const { app, BrowserWindow, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 620,
    height: 380,
    minWidth: 300,
    minHeight: 180,
    backgroundColor: '#111215',
    title: 'WinAMP Retro Player',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register Global Hotkeys (when active)
  try {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow?.webContents.send('media-play-pause');
    });
    globalShortcut.register('MediaNextTrack', () => {
      mainWindow?.webContents.send('media-next');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow?.webContents.send('media-prev');
    });
    globalShortcut.register('MediaStop', () => {
      mainWindow?.webContents.send('media-stop');
    });
  } catch {
    // Ignore shortcut registration errors on headless/CI
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Create System Tray Icon
  try {
    const iconPath = path.join(__dirname, '../public/icon.png');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'WinAMP Retro Player', enabled: false },
      { type: 'separator' },
      { label: 'Oynat / Duraklat', click: () => mainWindow?.webContents.send('media-play-pause') },
      { label: 'Sonraki Parça', click: () => mainWindow?.webContents.send('media-next') },
      { label: 'Önceki Parça', click: () => mainWindow?.webContents.send('media-prev') },
      { type: 'separator' },
      { label: 'Göster', click: () => mainWindow?.show() },
      { label: 'Çıkış', click: () => app.quit() },
    ]);
    tray.setToolTip('WinAMP 2.9x Retro Player');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
      }
    });
  } catch {
    // Tray fallback
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

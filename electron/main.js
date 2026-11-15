const { app, BrowserWindow, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 610,
    height: 380,
    minWidth: 290,
    minHeight: 160,
    backgroundColor: '#111215',
    title: 'WinAMP 2.9x Retro Player',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows loading local audio files via file://
    },
    autoHideMenuBar: true,
  });

  // If a dev server URL is explicitly provided, load it; otherwise load built dist/index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // F12 or Ctrl+Shift+I: Open DevTools for debugging if needed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Register Global Hotkeys
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
    // Ignore global shortcut errors on environments without media keys
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Create System Tray Icon
  try {
    const iconPath = process.platform === 'win32'
      ? path.join(__dirname, '../build/icon.ico')
      : path.join(__dirname, '../build/icon.png');

    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'WinAMP 2.9x Retro Player', enabled: false },
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

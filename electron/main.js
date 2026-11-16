const {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
} = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let trayAvailable = false;
let isQuitting = false;

/**
 * Dev: use the icon from the repository. Packaged: electron-builder copies the
 * icons next to the executable through `extraResources`, so the tray and window
 * icons keep working outside the asar archive.
 */
function getIconPath() {
  const fileName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  if (app.isPackaged) return path.join(process.resourcesPath, fileName);
  return path.join(__dirname, '..', 'build', fileName);
}

function sendMediaCommand(channel) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel);
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    // The three Winamp windows are the entire UI, so the OS frame is removed.
    // Title bars use -webkit-app-region: drag to move the window.
    frame: false,
    width: 275,
    height: 464,
    minWidth: 275,
    minHeight: 160,
    backgroundColor: '#0d0e10',
    title: 'WinAMP 2.9x Retro Player',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // If a dev server URL is explicitly provided, load it; otherwise load built dist/index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // DevTools only in development builds.
  if (!app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  }

  // External windows are not part of this app.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Closing the window hides it to the tray (the tray "Çıkış" item quits).
  mainWindow.on('close', (event) => {
    if (!isQuitting && trayAvailable) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    let icon = nativeImage.createFromPath(getIconPath());
    if (icon.isEmpty()) throw new Error(`icon not found: ${getIconPath()}`);
    if (process.platform === 'darwin') {
      icon = icon.resize({ width: 16, height: 16 });
    }

    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'WinAMP 2.9x Retro Player', enabled: false },
      { type: 'separator' },
      { label: 'Oynat / Duraklat', click: () => sendMediaCommand('media-play-pause') },
      { label: 'Durdur', click: () => sendMediaCommand('media-stop') },
      { label: 'Sonraki Parça', click: () => sendMediaCommand('media-next') },
      { label: 'Önceki Parça', click: () => sendMediaCommand('media-prev') },
      { type: 'separator' },
      { label: 'Göster', click: showWindow },
      {
        label: 'Çıkış',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('WinAMP 2.9x Retro Player');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        showWindow();
      }
    });
    trayAvailable = true;
  } catch (error) {
    trayAvailable = false;
    console.warn('[tray] System tray is unavailable:', error.message);
  }
}

function registerMediaShortcuts() {
  const bindings = [
    ['MediaPlayPause', 'media-play-pause'],
    ['MediaNextTrack', 'media-next'],
    ['MediaPreviousTrack', 'media-prev'],
    ['MediaStop', 'media-stop'],
  ];

  for (const [accelerator, channel] of bindings) {
    try {
      globalShortcut.register(accelerator, () => sendMediaCommand(channel));
    } catch (error) {
      console.warn(`[shortcut] ${accelerator} could not be registered:`, error.message);
    }
  }
}

ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:close', () => {
  if (trayAvailable && mainWindow) {
    mainWindow.hide();
  } else {
    isQuitting = true;
    app.quit();
  }
});

ipcMain.on('window:always-on-top', (_event, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(Boolean(enabled));
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    createWindow();
    createTray();
    registerMediaShortcuts();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        showWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    try {
      globalShortcut.unregisterAll();
    } catch {
      // Ignore cleanup errors during shutdown.
    }
  });

  app.on('window-all-closed', () => {
    // With a working tray the app keeps running in the background.
    if (process.platform !== 'darwin' && !trayAvailable) {
      app.quit();
    }
  });
}

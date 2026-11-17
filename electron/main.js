const {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
} = require('electron');
const path = require('path');

let mainWindow = null;
let playlistWindow = null;
let lastPlaylistState = null;
let playlistVisible = false;
let playlistCloseReason = 'hide';
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
  if (playlistWindow && !playlistWindow.isDestroyed() && playlistVisible) {
    playlistWindow.show();
  }
}

/** Loads the React bundle, optionally into the detached playlist entry point. */
function loadRenderer(win, panel) {
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    if (panel) url.searchParams.set('panel', panel);
    win.loadURL(url.toString());
    return;
  }

  const file = path.join(__dirname, '../dist/index.html');
  if (panel) {
    win.loadFile(file, { query: { panel } });
  } else {
    win.loadFile(file);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    // The three Winamp windows are the entire UI, so the OS frame is removed.
    // Title bars use -webkit-app-region: drag to move the window.
    frame: false,
    width: 275,
    height: 464,
    minWidth: 275,
    minHeight: 14,
    // The renderer locks min/max to the exact panel size, so the window always
    // hugs the Winamp windows instead of showing empty background.
    maximizable: false,
    fullscreenable: false,
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

  loadRenderer(mainWindow, null);

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

  // The detached playlist lives beside the main window, so hide it with it.
  mainWindow.on('hide', () => {
    if (playlistWindow && !playlistWindow.isDestroyed()) playlistWindow.hide();
  });

  // Closing the window hides it to the tray (the tray "Çıkış" item quits).
  mainWindow.on('close', (event) => {
    if (!isQuitting && trayAvailable) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    if (playlistWindow && !playlistWindow.isDestroyed()) playlistWindow.destroy();
    playlistWindow = null;
    mainWindow = null;
  });
}

/** Resizes a window so the Winamp panels fill it completely (no dead space). */
function applyContentSize(win, width, height) {
  if (!win || win.isDestroyed()) return;
  const w = Math.max(200, Math.round(Number(width) || 0));
  const h = Math.max(14, Math.round(Number(height) || 0));

  // No early return on getContentSize() here: that value can lag one resize
  // behind, which would silently drop the "grow back" request after the user
  // leaves 1.5x mode or re-opens a shaded panel.
  //
  // Windows refuses to grow a window whose maximum size is already locked to a
  // smaller value, so release the cap before resizing, then lock to the exact
  // panel size. min == max means the user cannot drag the window into a size
  // that would leave empty background around the Winamp panels.
  win.setMaximumSize(10000, 10000);
  win.setMinimumSize(w, h);
  win.setContentSize(w, h);
  win.setMaximumSize(w, h);
}

/** Opens the playlist as its own frameless, independently placed window. */
function createPlaylistWindow() {
  if (playlistWindow && !playlistWindow.isDestroyed()) {
    playlistWindow.show();
    playlistWindow.focus();
    return;
  }

  const width = 275;
  const height = 232;
  const mainBounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
  let x = mainBounds ? mainBounds.x + mainBounds.width + 6 : 200;
  let y = mainBounds ? mainBounds.y : 200;

  // Keep the detached playlist on the same display as the main window.
  const display = screen.getDisplayNearestPoint({ x, y });
  const area = display.workArea;
  x = Math.min(Math.max(x, area.x), area.x + area.width - width);
  y = Math.min(Math.max(y, area.y), area.y + area.height - height);

  playlistCloseReason = 'hide';
  playlistVisible = true;

  playlistWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: '#0d0e10',
    title: 'WinAMP Playlist',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  loadRenderer(playlistWindow, 'playlist');
  playlistWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  playlistWindow.webContents.on('did-finish-load', () => {
    if (lastPlaylistState) {
      playlistWindow?.webContents.send('playlist:state', lastPlaylistState);
    }
  });

  playlistWindow.on('closed', () => {
    playlistWindow = null;
    playlistVisible = false;
    const reason = playlistCloseReason;
    playlistCloseReason = 'hide';
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playlist:window-closed', reason);
    }
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
  if (playlistWindow && !playlistWindow.isDestroyed()) {
    playlistWindow.setAlwaysOnTop(Boolean(enabled));
  }
});

ipcMain.on('window:fit', (event, size) => {
  if (!size) return;
  applyContentSize(BrowserWindow.fromWebContents(event.sender), size.width, size.height);
});

ipcMain.on('playlist:detach', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  createPlaylistWindow();
});

ipcMain.on('playlist:attach', () => {
  if (!playlistWindow || playlistWindow.isDestroyed()) return;
  playlistCloseReason = 'attach';
  playlistWindow.close();
});

ipcMain.on('playlist:close', () => {
  if (!playlistWindow || playlistWindow.isDestroyed()) return;
  playlistCloseReason = 'hide';
  playlistWindow.close();
});

ipcMain.on('playlist:visibility', (_event, visible) => {
  playlistVisible = Boolean(visible);
  if (!playlistWindow || playlistWindow.isDestroyed()) return;
  if (playlistVisible) {
    playlistWindow.show();
  } else {
    playlistWindow.hide();
  }
});

// State and commands flow through the main process so the two renderer
// processes never need to know about each other.
ipcMain.on('playlist:state', (_event, state) => {
  lastPlaylistState = state;
  if (playlistWindow && !playlistWindow.isDestroyed()) {
    playlistWindow.webContents.send('playlist:state', state);
  }
});

ipcMain.on('playlist:request-state', () => {
  if (lastPlaylistState && playlistWindow && !playlistWindow.isDestroyed()) {
    playlistWindow.webContents.send('playlist:state', lastPlaylistState);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('playlist:request-state');
  }
});

ipcMain.on('playlist:action', (_event, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // The URL dialog lives in the main window, so bring it forward first.
  if (action && action.type === 'add-url') {
    mainWindow.show();
    mainWindow.focus();
  }
  mainWindow.webContents.send('playlist:action', action);
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

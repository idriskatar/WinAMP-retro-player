const { contextBridge, ipcRenderer } = require('electron');

/**
 * Subscribes to a main-process channel and returns an unsubscribe function so
 * React effects can clean up without leaking listeners.
 */
function subscribe(channel, callback) {
  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

/**
 * Subscribes to a main-process media channel and returns an unsubscribe
 * function so React effects can clean up without leaking listeners.
 */
function onMediaCommand(channel, callback) {
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onMediaPlayPause: (callback) => onMediaCommand('media-play-pause', callback),
  onMediaNext: (callback) => onMediaCommand('media-next', callback),
  onMediaPrev: (callback) => onMediaCommand('media-prev', callback),
  onMediaStop: (callback) => onMediaCommand('media-stop', callback),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('window:always-on-top', Boolean(enabled)),

  // Keep the frameless window exactly as large as the Winamp panels.
  fitWindow: (width, height) => ipcRenderer.send('window:fit', { width, height }),

  // Main window <-> main process <-> detached playlist window.
  notifyPlaylistState: (state) => ipcRenderer.send('playlist:state', state),
  requestPlaylistState: () => ipcRenderer.send('playlist:request-state'),
  onPlaylistState: (callback) => subscribe('playlist:state', callback),
  onPlaylistRequestState: (callback) => subscribe('playlist:request-state', callback),
  sendPlaylistAction: (action) => ipcRenderer.send('playlist:action', action),
  onPlaylistAction: (callback) => subscribe('playlist:action', callback),
  onPlaylistWindowClosed: (callback) => subscribe('playlist:window-closed', callback),
  detachPlaylist: () => ipcRenderer.send('playlist:detach'),
  attachPlaylist: () => ipcRenderer.send('playlist:attach'),
  closePlaylistWindow: () => ipcRenderer.send('playlist:close'),
  setPlaylistWindowVisible: (visible) => ipcRenderer.send('playlist:visibility', Boolean(visible)),
});

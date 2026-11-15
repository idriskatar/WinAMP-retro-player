const { contextBridge, ipcRenderer } = require('electron');

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
});

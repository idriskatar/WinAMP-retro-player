const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMediaPlayPause: (callback) => ipcRenderer.on('media-play-pause', callback),
  onMediaNext: (callback) => ipcRenderer.on('media-next', callback),
  onMediaPrev: (callback) => ipcRenderer.on('media-prev', callback),
  onMediaStop: (callback) => ipcRenderer.on('media-stop', callback),
});

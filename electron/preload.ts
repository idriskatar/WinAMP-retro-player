import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onMediaPlayPause: (callback: () => void) => ipcRenderer.on('media-play-pause', callback),
  onMediaNext: (callback: () => void) => ipcRenderer.on('media-next', callback),
  onMediaPrev: (callback: () => void) => ipcRenderer.on('media-prev', callback),
  onMediaStop: (callback: () => void) => ipcRenderer.on('media-stop', callback),
});

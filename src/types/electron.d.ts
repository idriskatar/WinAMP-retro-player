import type { PlaylistAction, PlaylistSyncState } from './winamp';

export {};

type Unsubscribe = () => void;
type PlaylistCloseReason = 'attach' | 'hide';

declare global {
  interface Window {
    /** Injected by electron/preload.js when running inside the desktop app. */
    electronAPI?: {
      isElectron: boolean;
      onMediaPlayPause: (callback: () => void) => Unsubscribe;
      onMediaNext: (callback: () => void) => Unsubscribe;
      onMediaPrev: (callback: () => void) => Unsubscribe;
      onMediaStop: (callback: () => void) => Unsubscribe;
      minimizeWindow: () => void;
      closeWindow: () => void;
      setAlwaysOnTop: (enabled: boolean) => void;

      /** Resizes the sender's BrowserWindow so it hugs the Winamp panels. */
      fitWindow: (width: number, height: number) => void;

      /** Main window -> main process -> detached playlist window. */
      notifyPlaylistState: (state: PlaylistSyncState) => void;
      requestPlaylistState: () => void;
      onPlaylistState: (callback: (state: PlaylistSyncState) => void) => Unsubscribe;
      onPlaylistRequestState: (callback: () => void) => Unsubscribe;

      /** Detached playlist window -> main process -> main window. */
      sendPlaylistAction: (action: PlaylistAction) => void;
      onPlaylistAction: (callback: (action: PlaylistAction) => void) => Unsubscribe;
      onPlaylistWindowClosed: (callback: (reason: PlaylistCloseReason) => void) => Unsubscribe;

      detachPlaylist: () => void;
      attachPlaylist: () => void;
      closePlaylistWindow: () => void;
      setPlaylistWindowVisible: (visible: boolean) => void;
    };
  }
}

export {};

type Unsubscribe = () => void;

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
    };
  }
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url?: string;
  file?: File;
}

/** Track metadata that can cross the IPC boundary (File objects cannot). */
export interface PlaylistTrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url?: string;
  isFile: boolean;
}

/** State broadcast from the main window to the detached playlist window. */
export interface PlaylistSyncState {
  tracks: PlaylistTrackInfo[];
  currentTrackId: string | null;
}

/** Commands sent from the detached playlist window back to the main window. */
export type PlaylistAction =
  | { type: 'select-track'; trackId: string }
  | { type: 'remove-track'; trackId: string }
  | { type: 'add-files'; files: Array<{ name: string; mime: string; data: ArrayBuffer }> }
  | { type: 'add-url' }
  | { type: 'toggle-play' }
  | { type: 'stop' }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'pause' };

export interface EQBand {
  frequency: number;
  gain: number; // -12 to +12 dB
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  shadeMode: boolean; // Windowshade 14px mini bar mode
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 100
  balance: number; // -50 (Left) to +50 (Right)
  shuffle: boolean;
  repeat: boolean;
  bitrate: number;
  sampleRate: number;
  isStereo: boolean;
}

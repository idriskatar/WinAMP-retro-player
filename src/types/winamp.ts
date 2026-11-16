export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url?: string;
  file?: File;
}

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

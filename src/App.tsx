import React, { useEffect, useRef, useState } from 'react';
import { MainWindow } from './components/MainWindow/MainWindow';
import { Equalizer } from './components/Equalizer/Equalizer';
import { Playlist } from './components/Playlist/Playlist';
import { AboutModal } from './components/AboutModal/AboutModal';
import { AddUrlModal } from './components/AddUrlModal/AddUrlModal';
import { Track, PlaybackState, LayoutMode } from './types/winamp';
import { audio } from './audio/AudioEngine';

const INITIAL_TRACKS: Track[] = [
  { id: '1', title: 'Whippin The Badass Retro Beat (Winamp 2.9x Classic)', artist: 'DJ Mike Llama', duration: 252 },
  { id: '2', title: 'Harder Better Faster Stronger', artist: 'Daft Punk', duration: 225 },
  { id: '3', title: 'Breathe (Original 2.9 Mix)', artist: 'The Prodigy', duration: 335 },
  { id: '4', title: 'Sandstorm (Classic 128kbps)', artist: 'Darude', duration: 224 },
  { id: '5', title: '9 PM (Till I Come) Club Mix', artist: 'ATB', duration: 198 },
  { id: '6', title: 'Insomnia (Radio Edit)', artist: 'Faithless', duration: 216 },
];

/** Reads a local file's real duration through a temporary <audio> element. */
const probeDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      probe.onloadedmetadata = null;
      probe.onerror = null;
      probe.removeAttribute('src');
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finish(null), 10000);

    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const duration = probe.duration;
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    probe.onerror = () => finish(null);
    probe.src = url;
  });

const newTrackId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isDemoSource = (track: Track | null | undefined) => !!track && !track.file && !track.url;

export const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('side-by-side');

  // Window visibilities
  const [isEQVisible, setIsEQVisible] = useState(true);
  const [isPLVisible, setIsPLVisible] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  // 1.5x scaling mode (Ctrl+D)
  const [isDoubleSize, setIsDoubleSize] = useState(false);

  // Playlist dynamic dimensions
  const [playlistWidth, setPlaylistWidth] = useState(275);
  const [playlistHeight, setPlaylistHeight] = useState(232);

  const [audioError, setAudioError] = useState<string | null>(null);

  // Playback state
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: INITIAL_TRACKS[0]?.duration ?? 0,
    volume: 75,
    balance: 0,
    shuffle: false,
    repeat: true,
    bitrate: 192,
    sampleRate: 44,
    isStereo: true,
  });

  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  const currentTrack = tracks[currentTrackIndex] || null;
  const demoMode = isDemoSource(currentTrack);

  // Refs keep event listeners (keyboard, media keys, audio events) in sync
  // with the latest render without re-subscribing on every state change.
  const tracksRef = useRef(tracks);
  const currentIndexRef = useRef(currentTrackIndex);
  const playbackRef = useRef(playback);
  const currentTrackRef = useRef<Track | null>(currentTrack);

  tracksRef.current = tracks;
  currentIndexRef.current = currentTrackIndex;
  playbackRef.current = playback;
  currentTrackRef.current = currentTrack;

  const loadSource = (track: Track) => {
    if (track.file) {
      audio.loadTrack(track.file);
    } else if (track.url) {
      audio.loadTrack(track.url);
    } else {
      // Bundled demo track: no media file, use the built-in synth.
      audio.loadTrack(null);
    }
  };

  const startTrack = (index: number, autoplay = true) => {
    const track = tracksRef.current[index];
    if (!track) return;

    currentIndexRef.current = index;
    setCurrentTrackIndex(index);
    setAudioError(null);
    loadSource(track);
    setPlayback((prev) => ({
      ...prev,
      duration: track.duration || 0,
      currentTime: 0,
      isPlaying: autoplay,
      isPaused: false,
    }));

    if (autoplay) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handlePlay = () => {
    if (!currentTrackRef.current) return;
    setAudioError(null);
    setPlayback((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
    void audio.play();
  };

  const handlePause = () => {
    audio.pause();
    setPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
  };

  const togglePlay = () => {
    if (playbackRef.current.isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleStop = () => {
    audio.stop();
    setPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
  };

  const pickShuffleIndex = (length: number, current: number) => {
    if (length <= 1) return 0;
    let next = current;
    while (next === current) {
      next = Math.floor(Math.random() * length);
    }
    return next;
  };

  const handlePrev = () => {
    const list = tracksRef.current;
    if (!list.length) return;
    const current = currentIndexRef.current;
    const previous = playbackRef.current.shuffle
      ? pickShuffleIndex(list.length, current)
      : (current - 1 + list.length) % list.length;
    startTrack(previous);
  };

  const handleNext = () => {
    const list = tracksRef.current;
    if (!list.length) return;
    const current = currentIndexRef.current;
    const next = playbackRef.current.shuffle
      ? pickShuffleIndex(list.length, current)
      : (current + 1) % list.length;
    startTrack(next);
  };

  // Called when a track finishes (real audio `ended` event or demo timer).
  const handleTrackEnd = () => {
    const list = tracksRef.current;
    if (!list.length) return;

    const current = currentIndexRef.current;
    const { shuffle, repeat } = playbackRef.current;

    let next: number | null = null;
    if (shuffle && list.length > 1) {
      next = pickShuffleIndex(list.length, current);
    } else if (current + 1 < list.length) {
      next = current + 1;
    } else if (repeat) {
      next = 0;
    }

    if (next === null) {
      audio.stop();
      setPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
      return;
    }

    startTrack(next);
  };

  const handleTrackEndRef = useRef<() => void>(() => {});
  handleTrackEndRef.current = handleTrackEnd;

  const handleSeek = (seconds: number) => {
    const duration = playbackRef.current.duration;
    if (!duration || duration <= 0) return;
    const clamped = Math.max(0, Math.min(duration, seconds));
    audio.seek(clamped);
    setPlayback((prev) => ({ ...prev, currentTime: clamped }));
  };

  const handleVolumeChange = (vol: number) => {
    audio.setVolume(vol);
    setPlayback((prev) => ({ ...prev, volume: vol }));
  };

  const handleBalanceChange = (bal: number) => {
    audio.setBalance(bal);
    setPlayback((prev) => ({ ...prev, balance: bal }));
  };

  const selectTrack = (track: Track) => {
    const idx = tracksRef.current.findIndex((t) => t.id === track.id);
    if (idx !== -1) startTrack(idx);
  };

  const handleAddFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const newItems: Track[] = files.map((file) => ({
      id: newTrackId(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Yerel Dosya',
      duration: 0,
      file,
    }));

    setTracks((prev) => [...prev, ...newItems]);

    // Fill real durations in the background so the playlist totals are honest.
    newItems.forEach((item) => {
      const file = item.file;
      if (!file) return;
      void probeDuration(file).then((duration) => {
        if (!duration) return;
        setTracks((prev) =>
          prev.map((track) => (track.id === item.id ? { ...track, duration } : track))
        );
      });
    });
  };

  const handleAddUrl = (url: string, title?: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const newTrack: Track = {
      id: newTrackId(),
      title: title?.trim() || trimmed,
      artist: 'İnternet Radyosu',
      duration: 0,
      url: trimmed,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  const handleRemoveTrack = (id: string) => {
    const list = tracksRef.current;
    const removedIndex = list.findIndex((t) => t.id === id);
    if (removedIndex === -1) return;

    const currentIndex = currentIndexRef.current;
    const wasCurrent = removedIndex === currentIndex;
    const wasPlaying = playbackRef.current.isPlaying;
    const remaining = list.filter((t) => t.id !== id);

    tracksRef.current = remaining;
    setTracks(remaining);

    if (!remaining.length) {
      audio.stop();
      audio.loadTrack(null);
      currentIndexRef.current = 0;
      setCurrentTrackIndex(0);
      setPlayback((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
      }));
      return;
    }

    if (wasCurrent) {
      const nextIndex = Math.min(removedIndex, remaining.length - 1);
      const nextTrack = remaining[nextIndex];
      currentIndexRef.current = nextIndex;
      setCurrentTrackIndex(nextIndex);
      loadSource(nextTrack);
      setPlayback((prev) => ({
        ...prev,
        currentTime: 0,
        duration: nextTrack.duration || 0,
        isPlaying: wasPlaying,
        isPaused: false,
      }));
      if (wasPlaying) {
        void audio.play();
      } else {
        audio.pause();
      }
    } else if (removedIndex < currentIndex) {
      const nextIndex = currentIndex - 1;
      currentIndexRef.current = nextIndex;
      setCurrentTrackIndex(nextIndex);
    }
  };

  // Wire the audio engine events to React state.
  useEffect(() => {
    audio.setHandlers({
      onTimeUpdate: (seconds) => {
        setPlayback((prev) =>
          Math.abs(prev.currentTime - seconds) < 0.2 ? prev : { ...prev, currentTime: seconds }
        );
      },
      onDurationChange: (duration) => {
        setPlayback((prev) =>
          Math.abs(prev.duration - duration) < 0.01 ? prev : { ...prev, duration }
        );
        setTracks((prev) => {
          const index = currentIndexRef.current;
          const track = prev[index];
          if (!track || Math.abs(track.duration - duration) < 0.01) return prev;
          const next = [...prev];
          next[index] = { ...track, duration };
          return next;
        });
      },
      onEnded: () => handleTrackEndRef.current(),
      onError: (message) => {
        setAudioError(message);
        setPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: false }));
      },
    });
  }, []);

  // Demo tracks have no real media file: drive their progress with a timer so
  // auto-advance / repeat still work.
  useEffect(() => {
    if (!playback.isPlaying || !demoMode) return;
    const timer = window.setInterval(() => {
      setPlayback((prev) => ({ ...prev, currentTime: prev.currentTime + 1 }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playback.isPlaying, demoMode, currentTrack?.id]);

  useEffect(() => {
    if (!playback.isPlaying || !demoMode) return;
    if (playback.duration > 0 && playback.currentTime >= playback.duration) {
      handleTrackEndRef.current();
    }
  }, [playback.currentTime, playback.duration, playback.isPlaying, demoMode]);

  // Actions used by the global keyboard shortcuts and the Electron media keys.
  const actionsRef = useRef({
    togglePlay,
    next: handleNext,
    prev: handlePrev,
    stop: handleStop,
    pause: handlePause,
  });
  actionsRef.current = {
    togglePlay,
    next: handleNext,
    prev: handlePrev,
    stop: handleStop,
    pause: handlePause,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setIsDoubleSize((prev) => !prev);
        return;
      }

      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        setIsPLVisible((prev) => !prev);
        return;
      }

      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setIsEQVisible((prev) => !prev);
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          actionsRef.current.togglePlay();
          break;
        case 'v':
        case 'V':
          actionsRef.current.stop();
          break;
        case 'z':
        case 'Z':
          actionsRef.current.prev();
          break;
        case 'b':
        case 'B':
          actionsRef.current.next();
          break;
        case 'c':
        case 'C':
          actionsRef.current.pause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Electron global media keys and tray menu commands.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubscribers = [
      api.onMediaPlayPause(() => actionsRef.current.togglePlay()),
      api.onMediaNext(() => actionsRef.current.next()),
      api.onMediaPrev(() => actionsRef.current.prev()),
      api.onMediaStop(() => actionsRef.current.stop()),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, []);

  // Playlist height follows the main+EQ stack in side-by-side mode.
  useEffect(() => {
    if (layoutMode === 'side-by-side') {
      setPlaylistHeight(isEQVisible ? 232 : 116);
    }
  }, [layoutMode, isEQVisible]);

  useEffect(() => {
    if (!audioError) return;
    const timer = window.setTimeout(() => setAudioError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [audioError]);

  return (
    <div
      className="min-h-screen bg-[#111215] text-[#c2c4cb] p-3 flex flex-col items-center select-none font-sans text-xs"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) handleAddFiles(e.dataTransfer.files);
      }}
    >
      {/* Hidden file input */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Top Bar with Branding, Layout Modes & Scaling Toggle */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-2 mb-3 border-b border-[#25272e]">
        <div className="flex items-center gap-2">
          {/* Classic Winamp Lightning Icon */}
          <div
            onClick={() => setIsAboutOpen(true)}
            className="w-7 h-7 bg-[#081233] rounded border border-yellow-500/60 flex items-center justify-center shadow-[0_0_8px_rgba(234,179,8,0.4)] cursor-pointer"
            title="Winamp Hakkında"
          >
            <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              WinAMP 2.9x Retro Player
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/80 px-1.5 py-0.5 rounded font-mono">
                Cross-Platform
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Windows • macOS • Linux | 0px birleşik yerleşim & Web Audio 10-Bant EQ
            </p>
          </div>
        </div>

        {/* Layout & Scaling Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1a1b20] p-0.5 rounded border border-zinc-700 text-xs">
            <button
              onClick={() => setLayoutMode('side-by-side')}
              className={`px-2.5 py-1 rounded font-medium ${
                layoutMode === 'side-by-side' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yan Yana Düzen
            </button>
            <button
              onClick={() => {
                setLayoutMode('vertical-stack');
                setPlaylistWidth(275);
                setPlaylistHeight(140);
              }}
              className={`px-2.5 py-1 rounded font-medium ${
                layoutMode === 'vertical-stack' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Klasik Dikey Düzen
            </button>
          </div>

          {/* Scaling Toggle */}
          <button
            onClick={() => setIsDoubleSize(!isDoubleSize)}
            className={`px-2 py-1 rounded border text-xs font-mono flex items-center gap-1 ${
              isDoubleSize
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
            title="Büyütme Modu (Ctrl+D)"
          >
            <span>{isDoubleSize ? '1.5X AKTİF' : '1X (275px)'}</span>
          </button>

          {/* Quick Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="px-2.5 py-1 rounded bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs flex items-center gap-1 shadow"
          >
            <span>{playback.isPlaying ? '■ Durdur' : '▶ Oynat'}</span>
          </button>
        </div>
      </div>

      {audioError && (
        <div className="w-full max-w-4xl mb-2 px-2 py-1 rounded border border-red-800 bg-red-950/60 text-red-300 text-[11px] font-mono">
          ⚠ {audioError}
        </div>
      )}

      {/* Main Workspace Frame (Applies scaling if active) */}
      <div
        className="p-4 bg-[#141518] rounded-lg border border-[#26282f] overflow-auto shadow-2xl transition-transform origin-top"
        style={{
          transform: isDoubleSize ? 'scale(1.5)' : 'scale(1)',
          marginBottom: isDoubleSize ? '140px' : '0px',
        }}
      >
        {/* Layout Shell: 0px gap throughout */}
        <div
          className={`flex items-start ${layoutMode === 'side-by-side' ? 'flex-row' : 'flex-col'}`}
          style={{ gap: 0 }}
        >
          {/* Left Column (Main Player + EQ) - Fixed 275px */}
          <div className="flex flex-col items-start shrink-0 w-[275px]" style={{ gap: 0 }}>
            {/* 1. Main Window (275x116px) */}
            <MainWindow
              playback={playback}
              currentTrack={currentTrack}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onPrev={handlePrev}
              onNext={handleNext}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onBalanceChange={handleBalanceChange}
              onToggleShuffle={() => setPlayback((p) => ({ ...p, shuffle: !p.shuffle }))}
              onToggleRepeat={() => setPlayback((p) => ({ ...p, repeat: !p.repeat }))}
              isEQVisible={isEQVisible}
              onToggleEQ={() => setIsEQVisible(!isEQVisible)}
              isPLVisible={isPLVisible}
              onTogglePL={() => setIsPLVisible(!isPLVisible)}
              onOpenAbout={() => setIsAboutOpen(true)}
              onOpenFile={() => hiddenFileInputRef.current?.click()}
            />

            {/* 2. Equalizer Window (275x116px) - Sits directly below Main with 0px gap */}
            {isEQVisible && <Equalizer onClose={() => setIsEQVisible(false)} />}

            {/* If in vertical stack mode, Playlist docks right below EQ */}
            {layoutMode === 'vertical-stack' && isPLVisible && (
              <Playlist
                tracks={tracks}
                currentTrackId={currentTrack?.id || null}
                onSelectTrack={selectTrack}
                onAddTracks={handleAddFiles}
                onRequestAddUrl={() => setIsUrlModalOpen(true)}
                onRemoveTrack={handleRemoveTrack}
                onClose={() => setIsPLVisible(false)}
                width={playlistWidth}
                height={playlistHeight}
                onResize={(w, h) => {
                  setPlaylistWidth(w);
                  setPlaylistHeight(h);
                }}
              />
            )}
          </div>

          {/* If in side-by-side mode, Playlist docks immediately to the right */}
          {layoutMode === 'side-by-side' && isPLVisible && (
            <Playlist
              tracks={tracks}
              currentTrackId={currentTrack?.id || null}
              onSelectTrack={selectTrack}
              onAddTracks={handleAddFiles}
              onRequestAddUrl={() => setIsUrlModalOpen(true)}
              onRemoveTrack={handleRemoveTrack}
              onClose={() => setIsPLVisible(false)}
              width={playlistWidth}
              height={playlistHeight}
              onResize={(w, h) => {
                setPlaylistWidth(w);
                setPlaylistHeight(h);
              }}
            />
          )}
        </div>
      </div>

      {/* Footer Info & Shortcuts */}
      <div className="w-full max-w-4xl mt-3 pt-2 border-t border-[#1e2025] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>
          <span>Kısayollar: </span>
          <span className="text-zinc-400 font-bold">Space</span> (Oynat/Duraklat) •{' '}
          <span className="text-zinc-400 font-bold">V</span> (Durdur) •{' '}
          <span className="text-zinc-400 font-bold">Z / B</span> (Önceki/Sonraki) •{' '}
          <span className="text-zinc-400 font-bold">C</span> (Duraklat) •{' '}
          <span className="text-zinc-400 font-bold">Alt+G / Alt+W</span> (EQ/PL) •{' '}
          <span className="text-zinc-400 font-bold">Ctrl+D</span> (1.5x Boyut)
        </div>
        <div>
          <span>WinAMP 2.9x Classic Base Skin Replica</span>
        </div>
      </div>

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <AddUrlModal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onSubmit={(url, title) => {
          handleAddUrl(url, title);
          setIsUrlModalOpen(false);
        }}
      />
    </div>
  );
};

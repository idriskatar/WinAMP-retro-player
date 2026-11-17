import React, { useEffect, useRef, useState } from 'react';
import { MainWindow } from './components/MainWindow/MainWindow';
import { Equalizer } from './components/Equalizer/Equalizer';
import { Playlist } from './components/Playlist/Playlist';
import { AboutModal } from './components/AboutModal/AboutModal';
import { AddUrlModal } from './components/AddUrlModal/AddUrlModal';
import { TrackInfoModal } from './components/TrackInfoModal/TrackInfoModal';
import { Track, PlaybackState, PlaylistAction, PlaylistSyncState } from './types/winamp';
import { audio } from './audio/AudioEngine';
import { useFitElectronWindow } from './hooks/useFitElectronWindow';

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

  // Window visibilities
  const [isEQVisible, setIsEQVisible] = useState(true);
  const [isPLVisible, setIsPLVisible] = useState(true);
  const [isPLDetached, setIsPLDetached] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isTrackInfoOpen, setIsTrackInfoOpen] = useState(false);

  // 1.5x scaling mode (Ctrl+D)
  const [isDoubleSize, setIsDoubleSize] = useState(false);

  const stackRef = useRef<HTMLDivElement | null>(null);
  useFitElectronWindow(stackRef, [isDoubleSize]);

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

  // Keep the detached playlist window in sync with tracks/current track and
  // route its commands back to the real handlers in this window.
  const playlistActionsRef = useRef({
    select: (_trackId: string) => {},
    remove: (_trackId: string) => {},
    addFiles: (_files: File[]) => {},
    addUrl: () => {},
  });
  playlistActionsRef.current = {
    select: (trackId) => {
      const track = tracksRef.current.find((item) => item.id === trackId);
      if (track) selectTrack(track);
    },
    remove: handleRemoveTrack,
    addFiles: handleAddFiles,
    addUrl: () => setIsUrlModalOpen(true),
  };

  const buildPlaylistState = (): PlaylistSyncState => ({
    tracks: tracksRef.current.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      url: track.url,
      isFile: Boolean(track.file),
    })),
    currentTrackId: currentTrackRef.current?.id ?? null,
  });

  useEffect(() => {
    window.electronAPI?.notifyPlaylistState(buildPlaylistState());
  }, [tracks, currentTrack, isPLDetached]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubscribeAction = api.onPlaylistAction((action: PlaylistAction) => {
      const handlers = playlistActionsRef.current;
      switch (action.type) {
        case 'select-track':
          handlers.select(action.trackId);
          break;
        case 'remove-track':
          handlers.remove(action.trackId);
          break;
        case 'add-files': {
          const files = action.files.map(
            (file) => new File([file.data], file.name, { type: file.mime })
          );
          handlers.addFiles(files);
          break;
        }
        case 'add-url':
          handlers.addUrl();
          break;
        case 'toggle-play':
          actionsRef.current.togglePlay();
          break;
        case 'stop':
          actionsRef.current.stop();
          break;
        case 'prev':
          actionsRef.current.prev();
          break;
        case 'next':
          actionsRef.current.next();
          break;
        case 'pause':
          actionsRef.current.pause();
          break;
      }
    });

    const unsubscribeClosed = api.onPlaylistWindowClosed((reason) => {
      setIsPLDetached(false);
      setIsPLVisible(reason === 'attach');
      if (reason === 'attach') setPlaylistWidth(275);
    });

    const unsubscribeRequest = api.onPlaylistRequestState(() => {
      api.notifyPlaylistState(buildPlaylistState());
    });

    return () => {
      unsubscribeAction();
      unsubscribeClosed();
      unsubscribeRequest();
    };
  }, []);

  // While detached, the playlist toggle shows/hides the separate window.
  useEffect(() => {
    if (!isPLDetached) return;
    window.electronAPI?.setPlaylistWindowVisible(isPLVisible);
  }, [isPLDetached, isPLVisible]);

  const handleDetachPlaylist = () => {
    if (!window.electronAPI?.detachPlaylist) return;
    setIsPLVisible(true);
    setIsPLDetached(true);
    window.electronAPI.detachPlaylist();
  };

  useEffect(() => {
    if (!audioError) return;
    const timer = window.setTimeout(() => setAudioError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [audioError]);

  return (
    <div
      className={`min-h-screen w-full bg-[#0d0e10] flex items-start select-none font-sans text-xs ${
        window.electronAPI ? 'overflow-hidden' : 'overflow-auto'
      }`}
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

      {audioError && (
        <div className="fixed top-1 left-1/2 -translate-x-1/2 z-[60] max-w-[275px] px-2 py-1 border border-red-800 bg-red-950/90 text-red-300 text-[10px] font-mono">
          ⚠ {audioError}
        </div>
      )}

      {/* The player IS the app: main / EQ / playlist stacked with no chrome. */}
      <div
        id="playerStack"
        ref={stackRef}
        className="flex flex-col items-start mx-auto"
        style={{
          transform: isDoubleSize ? 'scale(1.5)' : 'scale(1)',
          transformOrigin: 'top center',
        }}
      >
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
          isDoubleSize={isDoubleSize}
          onToggleDoubleSize={() => setIsDoubleSize((prev) => !prev)}
          onOpenTrackInfo={() => setIsTrackInfoOpen(true)}
        />

        {isEQVisible && <Equalizer onClose={() => setIsEQVisible(false)} />}

        {isPLVisible && !isPLDetached && (
          <Playlist
            tracks={tracks}
            currentTrackId={currentTrack?.id || null}
            onSelectTrack={selectTrack}
            onAddTracks={handleAddFiles}
            onRequestAddUrl={() => setIsUrlModalOpen(true)}
            onRemoveTrack={handleRemoveTrack}
            onClose={() => setIsPLVisible(false)}
            onDetach={window.electronAPI ? handleDetachPlaylist : undefined}
            maxWidth={275}
            width={playlistWidth}
            height={playlistHeight}
            onResize={(w, h) => {
              setPlaylistWidth(w);
              setPlaylistHeight(h);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <TrackInfoModal
        isOpen={isTrackInfoOpen}
        onClose={() => setIsTrackInfoOpen(false)}
        track={currentTrack}
        duration={playback.duration}
      />
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

import React, { useEffect, useState, useRef } from 'react';
import { MainWindow } from './components/MainWindow/MainWindow';
import { Equalizer } from './components/Equalizer/Equalizer';
import { Playlist } from './components/Playlist/Playlist';
import { AboutModal } from './components/AboutModal/AboutModal';
import { Track, PlaybackState, LayoutMode } from './types/winamp';
import { audio } from './audio/AudioEngine';

const INITIAL_TRACKS: Track[] = [
  { id: '1', title: "Whippin The Badass Retro Beat (Winamp 2.9x Classic)", artist: 'DJ Mike Llama', duration: 252 },
  { id: '2', title: 'Harder Better Faster Stronger', artist: 'Daft Punk', duration: 225 },
  { id: '3', title: 'Breathe (Original 2.9 Mix)', artist: 'The Prodigy', duration: 335 },
  { id: '4', title: 'Sandstorm (Classic 128kbps)', artist: 'Darude', duration: 224 },
  { id: '5', title: '9 PM (Till I Come) Club Mix', artist: 'ATB', duration: 198 },
  { id: '6', title: 'Insomnia (Radio Edit)', artist: 'Faithless', duration: 216 },
];

export const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('side-by-side');

  // Window visibilities
  const [isEQVisible, setIsEQVisible] = useState(true);
  const [isPLVisible, setIsPLVisible] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // 2x Double-Size scaling mode (Ctrl+D)
  const [isDoubleSize, setIsDoubleSize] = useState(false);

  // Playlist dynamic dimensions
  const [playlistWidth, setPlaylistWidth] = useState(275);
  const [playlistHeight, setPlaylistHeight] = useState(232);

  // Playback state
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 102, // 01:42 demo start
    duration: 252,
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

  // Handle Playback Loop
  useEffect(() => {
    let timer: number;
    if (playback.isPlaying) {
      timer = window.setInterval(() => {
        setPlayback((prev) => {
          if (prev.currentTime >= prev.duration) {
            // Next track or loop
            if (prev.repeat) {
              return { ...prev, currentTime: 0 };
            } else {
              return { ...prev, isPlaying: false, currentTime: 0 };
            }
          }
          return { ...prev, currentTime: prev.currentTime + 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playback.isPlaying]);

  // Global Keyboard Shortcuts (Space, V, Z, B, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+D: Toggle Double Size
      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setIsDoubleSize((prev) => !prev);
        return;
      }

      // Alt+W: Toggle Playlist
      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        setIsPLVisible((prev) => !prev);
        return;
      }

      // Alt+G: Toggle EQ
      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setIsEQVisible((prev) => !prev);
        return;
      }

      switch (e.key) {
        case ' ': // Space: Play / Pause
          e.preventDefault();
          togglePlay();
          break;
        case 'v':
        case 'V': // Stop
          handleStop();
          break;
        case 'z':
        case 'Z': // Prev
          handlePrev();
          break;
        case 'b':
        case 'B': // Next
          handleNext();
          break;
        case 'c':
        case 'C': // Pause
          handlePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playback.isPlaying, currentTrackIndex, tracks.length]);

  const togglePlay = () => {
    if (playback.isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handlePlay = () => {
    audio.play();
    setPlayback((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
  };

  const handlePause = () => {
    audio.pause();
    setPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
  };

  const handleStop = () => {
    audio.stop();
    setPlayback((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    const nextIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(nextIdx);
    selectTrack(tracks[nextIdx]);
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIdx);
    selectTrack(tracks[nextIdx]);
  };

  const handleSeek = (seconds: number) => {
    audio.seek(seconds);
    setPlayback((prev) => ({ ...prev, currentTime: seconds }));
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
    const idx = tracks.findIndex((t) => t.id === track.id);
    if (idx !== -1) setCurrentTrackIndex(idx);

    if (track.file) {
      audio.loadTrack(track.file);
    } else if (track.url) {
      audio.loadTrack(track.url);
    }
    setPlayback((prev) => ({
      ...prev,
      duration: track.duration,
      currentTime: 0,
      isPlaying: true,
      isPaused: false,
    }));
    audio.play();
  };

  const handleAddFiles = (fileList: FileList | File[]) => {
    const newItems: Track[] = Array.from(fileList).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      title: f.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Artist',
      duration: 180, // estimated
      file: f,
    }));
    setTracks((prev) => [...prev, ...newItems]);
  };

  const handleAddUrl = (url: string, title?: string) => {
    const newTrack: Track = {
      id: `${Date.now()}`,
      title: title || url,
      artist: 'Internet Stream',
      duration: 0,
      url,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  const handleRemoveTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#111215] text-[#c2c4cb] p-3 flex flex-col items-center select-none font-sans text-xs">
      {/* Hidden file input */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
      />

      {/* Top Bar with Branding, Layout Modes & 2x Scaling Toggle */}
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
              Windows • macOS • Linux | 0px Manyetik Kenetlenme & Web Audio 10-Bant EQ
            </p>
          </div>
        </div>

        {/* Layout & 2x Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1a1b20] p-0.5 rounded border border-zinc-700 text-xs">
            <button
              onClick={() => {
                setLayoutMode('side-by-side');
                setPlaylistHeight(232);
              }}
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

          {/* Double-Size (Ctrl+D) Toggle */}
          <button
            onClick={() => setIsDoubleSize(!isDoubleSize)}
            className={`px-2 py-1 rounded border text-xs font-mono flex items-center gap-1 ${
              isDoubleSize
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
            title="Double-Size Modu (Ctrl+D)"
          >
            <span>{isDoubleSize ? '2X AKTİF' : '1X (275px)'}</span>
          </button>

          {/* Quick Play/Stop Button */}
          <button
            onClick={togglePlay}
            className="px-2.5 py-1 rounded bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs flex items-center gap-1 shadow"
          >
            <span>{playback.isPlaying ? '■ Durdur' : '▶ Oynat'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame (Applies 2x scaling if Double-Size is active) */}
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

            {/* If in vertical stack mode, Playlist docks right below EQ (or right below Main if EQ closed) */}
            {layoutMode === 'vertical-stack' && isPLVisible && (
              <Playlist
                tracks={tracks}
                currentTrackId={currentTrack?.id || null}
                onSelectTrack={selectTrack}
                onAddTracks={handleAddFiles}
                onAddUrl={handleAddUrl}
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

          {/* If in side-by-side mode, Playlist docks immediately to the right with 0px gap! */}
          {layoutMode === 'side-by-side' && isPLVisible && (
            <Playlist
              tracks={tracks}
              currentTrackId={currentTrack?.id || null}
              onSelectTrack={selectTrack}
              onAddTracks={handleAddFiles}
              onAddUrl={handleAddUrl}
              onRemoveTrack={handleRemoveTrack}
              onClose={() => setIsPLVisible(false)}
              width={playlistWidth}
              height={isEQVisible ? 232 : 116} // Matches Main+EQ (232px) or Main alone (116px)
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
          <span className="text-zinc-400 font-bold">Ctrl+D</span> (2x Boyut) •{' '}
          <span className="text-zinc-400 font-bold">Başlığa Çift Tık</span> (Windowshade)
        </div>
        <div>
          <span>WinAMP 2.9x Classic Base Skin Replica</span>
        </div>
      </div>

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};

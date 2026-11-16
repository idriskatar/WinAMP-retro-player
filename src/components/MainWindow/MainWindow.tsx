import React, { useEffect, useRef } from 'react';
import { PlaybackState, Track } from '../../types/winamp';
import { audio } from '../../audio/AudioEngine';

interface MainWindowProps {
  playback: PlaybackState;
  currentTrack: Track | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onBalanceChange: (bal: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  isEQVisible: boolean;
  onToggleEQ: () => void;
  isPLVisible: boolean;
  onTogglePL: () => void;
  onOpenAbout: () => void;
  onOpenFile: () => void;
  isDoubleSize: boolean;
  onToggleDoubleSize: () => void;
  onOpenTrackInfo: () => void;
}

type VisualizerMode = 'spectrum' | 'oscilloscope' | 'off';

const VISUALIZER_MODES: VisualizerMode[] = ['spectrum', 'oscilloscope', 'off'];

const VISUALIZER_LABELS: Record<VisualizerMode, string> = {
  spectrum: 'Spectrum analizörü',
  oscilloscope: 'Osiloskop',
  off: 'Kapalı',
};

export const MainWindow: React.FC<MainWindowProps> = ({
  playback,
  currentTrack,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onBalanceChange,
  onToggleShuffle,
  onToggleRepeat,
  isEQVisible,
  onToggleEQ,
  isPLVisible,
  onTogglePL,
  onOpenAbout,
  onOpenFile,
  isDoubleSize,
  onToggleDoubleSize,
  onOpenTrackInfo,
}) => {
  const visCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const [timeModeRemaining, setTimeModeRemaining] = React.useState(false);
  const [isShaded, setIsShaded] = React.useState(false);
  const [vizMode, setVizMode] = React.useState<VisualizerMode>('spectrum');
  const [alwaysOnTop, setAlwaysOnTop] = React.useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);

  const toggleAlwaysOnTop = () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    window.electronAPI?.setAlwaysOnTop(next);
  };

  const cycleVisualizer = () => {
    setVizMode((mode) => {
      const index = VISUALIZER_MODES.indexOf(mode);
      return VISUALIZER_MODES[(index + 1) % VISUALIZER_MODES.length];
    });
  };

  // Close the options menu when clicking outside it or pressing Escape.
  useEffect(() => {
    if (!isOptionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOptionsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOptionsOpen]);

  // The clutterbar is hidden while shaded; never leave its menu "open".
  useEffect(() => {
    if (isShaded) setIsOptionsOpen(false);
  }, [isShaded]);

  // Visualizer: spectrum bars, oscilloscope trace, or off (V cycles them).
  useEffect(() => {
    let animId = 0;
    const canvas = visCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numBars = 18;
    const barHeights = new Array(numBars).fill(2);
    const peakHeights = new Array(numBars).fill(2);
    const freqData = new Uint8Array(new ArrayBuffer(256));
    const timeData = new Uint8Array(new ArrayBuffer(256));

    const clear = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawSpectrum = (active: boolean) => {
      clear();
      if (active) {
        audio.getFrequencyData(freqData);
      }

      const barWidth = 3;
      const gap = 1;

      for (let i = 0; i < numBars; i++) {
        let target = 2;
        if (active) {
          const sampleIndex = Math.floor((i / numBars) * 64);
          const raw = freqData[sampleIndex] || 0;
          target = Math.max(1, (raw / 255) * (canvas.height - 2));
        }

        barHeights[i] += (target - barHeights[i]) * 0.45;
        if (barHeights[i] > peakHeights[i]) {
          peakHeights[i] = barHeights[i];
        } else {
          peakHeights[i] = Math.max(0, peakHeights[i] - 0.35);
        }

        const h = Math.max(1, Math.floor(barHeights[i]));
        const x = i * (barWidth + gap);

        // Green -> Yellow -> Red gradient bars
        for (let y = 0; y < h; y += 2) {
          const actualY = canvas.height - y - 1;
          if (y > canvas.height * 0.7) {
            ctx.fillStyle = '#FF2222';
          } else if (y > canvas.height * 0.4) {
            ctx.fillStyle = '#FFFF00';
          } else {
            ctx.fillStyle = '#00FF00';
          }
          ctx.fillRect(x, actualY, barWidth, 1.5);
        }

        // White falling peak dot
        const peakY = canvas.height - Math.floor(peakHeights[i]) - 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, Math.max(0, peakY), barWidth, 1);
      }
    };

    const drawOscilloscope = (active: boolean) => {
      clear();
      if (active) {
        audio.getTimeDomainData(timeData);
      }

      ctx.strokeStyle = '#00FF44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const sampleIndex = Math.floor((x / canvas.width) * timeData.length);
        const value = active ? timeData[sampleIndex] ?? 128 : 128;
        const y = Math.max(0.5, Math.min(canvas.height - 0.5, (value / 255) * canvas.height));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const drawFrame = (active: boolean) => {
      if (vizMode === 'off') {
        clear();
      } else if (vizMode === 'oscilloscope') {
        drawOscilloscope(active);
      } else {
        drawSpectrum(active);
      }
    };

    // Idle or disabled: draw one static frame and stop the animation loop.
    if (!playback.isPlaying || vizMode === 'off') {
      barHeights.fill(2);
      peakHeights.fill(2);
      drawFrame(false);
      return;
    }

    const render = () => {
      drawFrame(true);
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [playback.isPlaying, vizMode]);

  // Format time mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayTime = timeModeRemaining
    ? formatTime(Math.max(0, playback.duration - playback.currentTime))
    : formatTime(playback.currentTime);

  const seekPercent = playback.duration > 0
    ? Math.min(100, (playback.currentTime / playback.duration) * 100)
    : 0;

  const handlePosbarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (playback.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * playback.duration);
  };

  return (
    <div
      id="mainWindow"
      className="wa-window"
      style={{
        width: 275,
        height: isShaded ? 14 : 116,
        minWidth: 275,
        maxWidth: 275,
        minHeight: isShaded ? 14 : 116,
        maxHeight: isShaded ? 14 : 116,
        margin: 0,
        padding: 0,
      }}
    >
      {/* Titlebar (y: 0, h: 14) */}
      <div className="wa-titlebar" onDoubleClick={() => setIsShaded(!isShaded)}>
        <div className="flex items-center gap-1 z-10 cursor-pointer wa-nodrag" onClick={onOpenAbout}>
          <svg className="w-2.5 h-2.5 text-yellow-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          <span className="text-[9px] font-bold text-white tracking-widest font-mono">WINAMP</span>
        </div>
        <div className="flex items-center gap-0.5 z-10">
          <div
            className="wa-tbtn"
            title="Simge durumuna küçült"
            onClick={() => window.electronAPI?.minimizeWindow()}
          >
            _
          </div>
          <div className="wa-tbtn" title="Windowshade" onClick={() => setIsShaded(!isShaded)}>
            ▢
          </div>
          <div
            className="wa-tbtn text-red-300"
            title={window.electronAPI ? 'Tepsiye gizle' : 'Durdur ve kapat'}
            onClick={() => {
              if (window.electronAPI) {
                window.electronAPI.closeWindow();
              } else {
                onStop();
              }
            }}
          >
            ×
          </div>
        </div>
      </div>

      {!isShaded && (
        <>
          {/* Clutterbar (O, A, I, D, V) - x: 8, y: 18 */}
          <div
            className="absolute z-20"
            style={{ left: 8, top: 18, width: 10, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <div className="relative" ref={optionsRef}>
              <button
                type="button"
                className={`wa-btn ${isOptionsOpen ? 'text-yellow-300' : ''}`}
                style={{ width: 10, height: 7, fontSize: 6 }}
                title="Seçenekler menüsü"
                onClick={() => setIsOptionsOpen((open) => !open)}
              >
                O
              </button>

              {isOptionsOpen && (
                <div
                  className="wa-window absolute flex flex-col"
                  style={{ left: 13, top: 8, width: 150, padding: 2, zIndex: 40 }}
                >
                  <div
                    className="px-1 text-[7px] font-mono text-zinc-300 hover:bg-[#2f4a8f] hover:text-white cursor-pointer"
                    style={{ lineHeight: '12px' }}
                    onClick={() => {
                      setIsOptionsOpen(false);
                      onOpenAbout();
                    }}
                  >
                    Hakkında
                  </div>
                  <div className="my-[2px] h-px bg-[#4a4c54]" />
                  <div
                    className="px-1 text-[7px] font-mono text-zinc-300 hover:bg-[#2f4a8f] hover:text-white cursor-pointer"
                    style={{ lineHeight: '12px' }}
                    onClick={() => {
                      setIsOptionsOpen(false);
                      onOpenFile();
                    }}
                  >
                    Dosya Aç…
                  </div>
                  <div
                    className="px-1 text-[7px] font-mono text-zinc-300 hover:bg-[#2f4a8f] hover:text-white cursor-pointer"
                    style={{ lineHeight: '12px' }}
                    onClick={() => {
                      setIsOptionsOpen(false);
                      onOpenTrackInfo();
                    }}
                  >
                    Parça Bilgisi
                  </div>
                  <div className="my-[2px] h-px bg-[#4a4c54]" />
                  <div
                    className="px-1 flex items-center justify-between text-[7px] font-mono text-zinc-300 hover:bg-[#2f4a8f] hover:text-white cursor-pointer"
                    style={{ lineHeight: '12px' }}
                    onClick={() => {
                      toggleAlwaysOnTop();
                      setIsOptionsOpen(false);
                    }}
                  >
                    <span>Her Zaman Üstte</span>
                    <span className="text-emerald-400">{alwaysOnTop ? '✓' : ''}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`wa-btn ${alwaysOnTop ? 'text-emerald-300' : ''}`}
              style={{ width: 10, height: 7, fontSize: 6 }}
              title={alwaysOnTop ? 'Her zaman üstte: açık' : 'Her zaman üstte'}
              onClick={toggleAlwaysOnTop}
            >
              A
            </button>
            <button
              type="button"
              className="wa-btn"
              style={{ width: 10, height: 7, fontSize: 6 }}
              title="Parça bilgisi"
              onClick={onOpenTrackInfo}
            >
              I
            </button>
            <button
              type="button"
              className={`wa-btn ${isDoubleSize ? 'text-emerald-300' : ''}`}
              style={{ width: 10, height: 7, fontSize: 6 }}
              title={isDoubleSize ? '1.5x boyut: açık' : '1.5x boyut (Ctrl+D)'}
              onClick={onToggleDoubleSize}
            >
              D
            </button>
            <button
              type="button"
              className={`wa-btn ${
                vizMode === 'oscilloscope'
                  ? 'text-emerald-300'
                  : vizMode === 'off'
                    ? 'text-zinc-600'
                    : ''
              }`}
              style={{ width: 10, height: 7, fontSize: 6 }}
              title={`Görselleştirici: ${VISUALIZER_LABELS[vizMode]}`}
              onClick={cycleVisualizer}
            >
              V
            </button>
          </div>

          {/* LCD Display Box - x: 22, y: 18, w: 245, h: 42 */}
          <div
            className="absolute wa-lcd-box overflow-hidden flex flex-col justify-between"
            style={{ left: 22, top: 18, width: 245, height: 42, padding: '2px 4px' }}
          >
            {/* Row 1: Spectrum Vis + Green Timer + Badges (h: 18px) */}
            <div className="flex items-center justify-between" style={{ height: 18 }}>
              {/* 60 FPS Visualizer Canvas (w: 70, h: 16) */}
              <div className="bg-black border border-[#112211]" style={{ width: 70, height: 16 }}>
                <canvas ref={visCanvasRef} width={70} height={16} className="block" />
              </div>

              {/* Digital LED Time (Elapsed / Remaining toggle) */}
              <div
                className="font-mono font-bold text-[#00FF00] text-sm tracking-wider flex items-center leading-none cursor-pointer"
                style={{ textShadow: '0 0 4px #00FF00' }}
                onClick={() => setTimeModeRemaining(!timeModeRemaining)}
                title="Tıklayın: Geçen / Kalan Süre Değiştir"
              >
                {timeModeRemaining && <span className="text-xs mr-0.5">-</span>}
                <span>{displayTime}</span>
              </div>

              {/* Bitrate / kHz / Stereo */}
              <div className="flex flex-col items-end text-[7px] font-mono leading-none text-emerald-400">
                <div>
                  <span className="text-emerald-300 font-bold">{playback.bitrate}</span> KBPS{' '}
                  <span className="text-emerald-300 font-bold">{playback.sampleRate}</span> KHZ
                </div>
                <div className="flex gap-1 mt-0.5 text-[6px]">
                  <span className="bg-[#002800] text-[#00FF55] px-0.5 border border-[#005500]">STEREO</span>
                  <span className="text-zinc-600">MONO</span>
                </div>
              </div>
            </div>

            {/* Row 2: Marquee Song Title */}
            <div
              className="w-full overflow-hidden whitespace-nowrap text-[9px] font-mono text-[#00FF44] border-t border-[#0b160b] flex items-center"
              style={{ height: 16 }}
            >
              <span className="animate-marquee">
                {currentTrack ? `1. ${currentTrack.artist} - ${currentTrack.title} ***` : '1. WinAMP 2.9x Classic Retro Player ***'}
              </span>
            </div>
          </div>

          {/* Seekbar (Posbar) - x: 15, y: 64, w: 245, h: 10 */}
          <div
            className="absolute wa-posbar-track"
            style={{ left: 15, top: 64, width: 245, height: 10 }}
            onClick={handlePosbarClick}
          >
            <div
              className="wa-posbar-thumb"
              style={{ left: `${Math.max(0, Math.min(216, (seekPercent / 100) * 216))}px` }}
            />
          </div>

          {/* Volume & Balance Sliders - y: 78 */}
          {/* Volume */}
          <div className="absolute flex items-center gap-1" style={{ left: 15, top: 78 }}>
            <span className="text-[7px] font-mono text-zinc-400">VOL</span>
            <div className="wa-lcd-box relative overflow-hidden flex items-center" style={{ width: 70, height: 10, padding: 1 }}>
              <div
                className="h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded-sm"
                style={{ width: `${playback.volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={playback.volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Balance */}
          <div className="absolute flex items-center gap-1" style={{ left: 115, top: 78 }}>
            <span className="text-[7px] font-mono text-zinc-400">BAL</span>
            <div className="wa-lcd-box relative overflow-hidden flex items-center justify-center" style={{ width: 45, height: 10 }}>
              <div
                className="w-1 h-1.5 bg-emerald-400"
                style={{ transform: `translateX(${(playback.balance / 50) * 16}px)` }}
              />
              <input
                type="range"
                min="-50"
                max="50"
                value={playback.balance}
                onChange={(e) => onBalanceChange(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* EQ & PL Toggle Buttons */}
          <div className="absolute flex items-center gap-1" style={{ right: 15, top: 78 }}>
            <button
              onClick={onToggleEQ}
              className={`wa-btn ${isEQVisible ? 'text-emerald-400 bg-[#162916] border-emerald-600' : 'text-zinc-500 bg-[#1e1f24] border-zinc-700'}`}
              style={{ width: 18, height: 12, fontSize: 7 }}
            >
              EQ
            </button>
            <button
              onClick={onTogglePL}
              className={`wa-btn ${isPLVisible ? 'text-yellow-400 bg-[#292416] border-yellow-600' : 'text-zinc-500 bg-[#1e1f24] border-zinc-700'}`}
              style={{ width: 18, height: 12, fontSize: 7 }}
            >
              PL
            </button>
          </div>

          {/* Transport Buttons - y: 93 (h: 16) */}
          <div className="absolute flex items-center gap-0.5" style={{ left: 15, top: 93 }}>
            <button className="wa-btn" style={{ width: 23, height: 16 }} onClick={onPrev} title="Previous">|&lt;&lt;</button>
            <button
              className={`wa-btn ${playback.isPlaying ? 'text-emerald-300 font-bold' : ''}`}
              style={{ width: 23, height: 16 }}
              onClick={onPlay}
              title="Play"
            >
              ▶
            </button>
            <button className="wa-btn" style={{ width: 23, height: 16 }} onClick={onPause} title="Pause">❚❚</button>
            <button className="wa-btn text-red-400" style={{ width: 23, height: 16 }} onClick={onStop} title="Stop">■</button>
            <button className="wa-btn" style={{ width: 22, height: 16 }} onClick={onNext} title="Next">&gt;&gt;|</button>
            <button className="wa-btn" style={{ width: 22, height: 16 }} onClick={onOpenFile} title="Open File">⏏</button>
          </div>

          {/* Shuffle & Repeat */}
          <div className="absolute flex items-center gap-1" style={{ right: 15, top: 94 }}>
            <button
              className={`wa-btn ${playback.shuffle ? 'text-emerald-300 font-bold bg-[#172517]' : 'text-zinc-400'}`}
              style={{ padding: '1px 4px', height: 14, fontSize: 7 }}
              onClick={onToggleShuffle}
            >
              SHUF
            </button>
            <button
              className={`wa-btn ${playback.repeat ? 'text-emerald-300 font-bold bg-[#172517]' : 'text-zinc-400'}`}
              style={{ padding: '1px 4px', height: 14, fontSize: 7 }}
              onClick={onToggleRepeat}
            >
              REP
            </button>
          </div>
        </>
      )}
    </div>
  );
};

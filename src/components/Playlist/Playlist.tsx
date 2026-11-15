import React, { useEffect, useRef, useState } from 'react';
import { Track } from '../../types/winamp';

interface PlaylistProps {
  tracks: Track[];
  currentTrackId: string | null;
  onSelectTrack: (track: Track) => void;
  onAddTracks: (files: FileList | File[]) => void;
  onRequestAddUrl: () => void;
  onRemoveTrack: (id: string) => void;
  onClose: () => void;
  width: number;
  height: number;
  onResize: (newWidth: number, newHeight: number) => void;
}

const MIN_WIDTH = 275;
const MIN_HEIGHT = 116;
const MAX_WIDTH = 900;
const MAX_HEIGHT = 900;

export const Playlist: React.FC<PlaylistProps> = ({
  tracks,
  currentTrackId,
  onSelectTrack,
  onAddTracks,
  onRequestAddUrl,
  onRemoveTrack,
  onClose,
  width,
  height,
  onResize,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShaded, setIsShaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drop the selection when the selected track is removed.
  useEffect(() => {
    if (selectedId && !tracks.some((track) => track.id === selectedId)) {
      setSelectedId(null);
    }
  }, [tracks, selectedId]);

  // Drag-to-resize handle
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = width;
    const startH = height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (moveEvent.clientX - startX)));
      const nextH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + (moveEvent.clientY - startY)));
      onResize(nextW, nextH);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag & drop files onto playlist
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddTracks(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddTracks(e.target.files);
    }
    e.target.value = '';
  };

  const handlePromptAddUrl = () => {
    onRequestAddUrl();
  };

  const formatTrackTime = (seconds: number, isStream = false) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return isStream ? 'LIVE' : '--:--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const totalDuration = tracks.reduce((acc, t) => acc + t.duration, 0);

  return (
    <div
      id="playlistWindow"
      className="wa-window flex flex-col justify-between shrink-0"
      style={{
        width,
        height: isShaded ? 14 : height,
        minWidth: MIN_WIDTH,
        minHeight: isShaded ? 14 : MIN_HEIGHT,
        maxWidth: isShaded ? undefined : MAX_WIDTH,
        maxHeight: isShaded ? undefined : MAX_HEIGHT,
        margin: 0,
        padding: 0,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Playlist Titlebar (h: 14) */}
      <div className="wa-titlebar" onDoubleClick={() => setIsShaded(!isShaded)}>
        <div className="flex items-center gap-1 z-10">
          <svg className="w-2.5 h-2.5 text-yellow-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          <span className="text-[9px] font-bold text-white tracking-widest font-mono">WINAMP PLAYLIST</span>
        </div>
        <div className="flex items-center gap-0.5 z-10">
          <div className="wa-tbtn" title="Windowshade" onClick={() => setIsShaded(!isShaded)}>▢</div>
          <div className="wa-tbtn text-red-300" title="Close" onClick={onClose}>×</div>
        </div>
      </div>

      {!isShaded && (
        <>
          {/* Playlist Track List Box */}
          <div className="wa-lcd-box m-1 p-1 flex-1 overflow-y-auto font-mono text-[9px] leading-tight select-none">
            {tracks.length === 0 ? (
              <div className="text-zinc-600 italic p-2 text-center">
                Müzik dosyalarını buraya sürükleyin veya alttaki + ADD butonuna tıklayın.
              </div>
            ) : (
              tracks.map((track, idx) => {
                const isCurrent = track.id === currentTrackId;
                const isSel = track.id === selectedId;

                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedId(track.id)}
                    onDoubleClick={() => onSelectTrack(track)}
                    className={`flex justify-between items-center px-1 py-0.5 cursor-pointer ${
                      isCurrent
                        ? 'text-[#00FF44] bg-[#002806] border-l-2 border-[#00FF44] font-bold'
                        : isSel
                        ? 'bg-[#151624] text-yellow-300'
                        : 'text-amber-300 hover:bg-[#13141c]'
                    }`}
                  >
                    <span className="truncate">
                      {idx + 1}. {track.artist ? `${track.artist} - ` : ''}{track.title}
                    </span>
                    <span className="ml-2 font-mono shrink-0">
                      {formatTrackTime(track.duration, !!track.url && !track.file)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Playlist Bottom Bar */}
          <div className="px-1 pb-1 flex items-center justify-between text-[8px] font-mono">
            <div className="flex items-center gap-0.5">
              <button
                className="wa-btn px-1.5 py-0.5"
                onClick={() => fileInputRef.current?.click()}
                title="Dosya Ekle"
              >
                + FILE
              </button>
              <button
                className="wa-btn px-1 py-0.5"
                onClick={handlePromptAddUrl}
                title="İnternet Radyosu / URL Ekle"
              >
                + URL
              </button>
              <button
                className="wa-btn px-1.5 py-0.5"
                onClick={() => selectedId && onRemoveTrack(selectedId)}
                title="Seçileni Kaldır"
              >
                - REM
              </button>
              <button className="wa-btn px-1 py-0.5">SEL</button>
              <button className="wa-btn px-1 py-0.5">MISC</button>
            </div>

            <div className="flex items-center gap-1.5 bg-black px-1.5 py-0.5 wa-lcd-box text-emerald-400 text-[8px]">
              <span>{tracks.length} TRK</span>
              <span>{totalDuration > 0 ? formatTrackTime(totalDuration) : '00:00'}</span>
            </div>
          </div>

          {/* Resizable Corner Handle (Classic Winamp 3-Stripes) */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 group"
            title="Playlist'i Boyutlandırmak için Sürükleyin"
          >
            <div className="w-2.5 h-2.5 flex flex-col justify-between items-end">
              <div className="w-1 h-0.5 bg-zinc-500" />
              <div className="w-2 h-0.5 bg-zinc-400" />
              <div className="w-2.5 h-0.5 bg-yellow-400" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

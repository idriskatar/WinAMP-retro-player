import React, { useEffect } from 'react';
import { Track } from '../../types/winamp';

interface TrackInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  duration: number;
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-2 leading-snug">
    <span className="w-[58px] shrink-0 text-zinc-500">{label}</span>
    <span className="text-zinc-200 break-words min-w-0">{children}</span>
  </div>
);

/**
 * Read-only "file info" window in the spirit of Winamp's Alt+3 dialog.
 * Shows what the player actually knows about the current track.
 */
export const TrackInfoModal: React.FC<TrackInfoModalProps> = ({
  isOpen,
  onClose,
  track,
  duration,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const source = track?.file
    ? 'Yerel dosya'
    : track?.url
      ? 'İnternet radyosu / akış'
      : 'Dahili demo (synth)';

  const effectiveDuration = track?.duration || duration;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="wa-window w-[340px] bg-[#27272b] flex flex-col shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="wa-titlebar">
          <div className="flex items-center gap-1 z-10">
            <svg className="w-2.5 h-2.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            </svg>
            <span className="text-[9px] font-bold text-white tracking-widest font-mono">
              TRACK INFO
            </span>
          </div>
          <div className="wa-tbtn text-red-300 cursor-pointer" onClick={onClose}>
            ×
          </div>
        </div>

        <div className="p-3 flex flex-col gap-1.5 font-mono text-[10px]">
          {!track ? (
            <div className="text-zinc-400">Seçili parça yok.</div>
          ) : (
            <>
              <InfoRow label="Parça">
                {track.title || '(başlık yok)'}
              </InfoRow>
              <InfoRow label="Sanatçı">{track.artist || '(bilinmiyor)'}</InfoRow>
              <InfoRow label="Süre">{formatDuration(effectiveDuration)}</InfoRow>
              <InfoRow label="Kaynak">{source}</InfoRow>

              {track.file && (
                <>
                  <InfoRow label="Dosya">{track.file.name}</InfoRow>
                  <InfoRow label="Boyut">{formatBytes(track.file.size)}</InfoRow>
                  <InfoRow label="Tür">{track.file.type || 'bilinmiyor'}</InfoRow>
                </>
              )}

              {track.url && !track.file && (
                <InfoRow label="Adres">
                  <span className="break-all">{track.url}</span>
                </InfoRow>
              )}

              {!track.file && !track.url && (
                <div className="text-[8px] text-zinc-500 leading-snug border-t border-[#3a3c44] pt-1.5">
                  Bu parça gerçek bir ses dosyası içermez. Çalındığında dahili retro synth
                  beat üretilir. Kendi dosyalarınız gerçek ses olarak çalar.
                </div>
              )}

              <div className="text-[8px] text-zinc-500 leading-snug border-t border-[#3a3c44] pt-1.5">
                Not: ID3 / Vorbis etiketleri ve kapak görseli henüz okunmuyor; yalnızca
                oynatıcının bildiği bilgiler gösterilir.
              </div>
            </>
          )}

          <div className="flex items-center justify-end pt-1">
            <button type="button" onClick={onClose} className="wa-btn px-3 py-1 text-[9px]">
              KAPAT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

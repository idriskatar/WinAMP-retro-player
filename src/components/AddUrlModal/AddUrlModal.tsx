import React, { useEffect, useState } from 'react';

interface AddUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, title?: string) => void;
}

/**
 * In-app replacement for window.prompt(), which Electron does not support.
 * Works identically in the browser build and in the packaged desktop app.
 */
export const AddUrlModal: React.FC<AddUrlModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrl('');
    setTitle('');
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!/^https?:\/\/.+/i.test(value)) {
      setError('http:// veya https:// ile başlayan geçerli bir adres girin.');
      return;
    }
    onSubmit(value, title.trim() || undefined);
  };

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
              ADD URL / INTERNET RADIO
            </span>
          </div>
          <div className="wa-tbtn text-red-300 cursor-pointer" onClick={onClose}>
            ×
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-2 font-mono text-[10px]">
          <label className="text-zinc-300 flex flex-col gap-1">
            Akış / Müzik URL
            <input
              autoFocus
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://ornek.com/stream.mp3"
              spellCheck={false}
              className="wa-lcd-box px-1.5 py-1 text-[10px] text-[#00FF44] outline-none placeholder:text-zinc-600"
            />
          </label>

          <label className="text-zinc-300 flex flex-col gap-1">
            Başlık (opsiyonel)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Online Retro Radio"
              spellCheck={false}
              className="wa-lcd-box px-1.5 py-1 text-[10px] text-[#00FF44] outline-none placeholder:text-zinc-600"
            />
          </label>

          {error && <div className="text-red-400 text-[9px]">⚠ {error}</div>}

          <div className="text-[8px] text-zinc-500 leading-snug">
            Not: Doğrudan ses akışı (.mp3, .aac, .ogg, .m4a) veya ICY/Shoutcast yayın adresi
            kullanın. .m3u/.pls çalma listesi dosyaları desteklenmez.
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="wa-btn px-3 py-1 text-[9px]">
              İPTAL
            </button>
            <button type="submit" className="wa-btn px-3 py-1 text-[9px] text-yellow-300 border-yellow-700">
              EKLE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

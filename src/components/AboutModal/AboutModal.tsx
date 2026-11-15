import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const playLlamaSound = () => {
    // Generate a retro synthetic signature tone
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);

      // Release the temporary context instead of leaking one per click.
      osc.onended = () => {
        try {
          void ctx.close();
        } catch {
          // Ignore close errors.
        }
      };
    } catch {
      // AudioContext fallback
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="wa-window w-[300px] bg-[#27272b] p-0 flex flex-col justify-between shadow-2xl">
        {/* Titlebar */}
        <div className="wa-titlebar">
          <div className="flex items-center gap-1 z-10">
            <svg className="w-2.5 h-2.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            </svg>
            <span className="text-[9px] font-bold text-white tracking-widest font-mono">ABOUT WINAMP</span>
          </div>
          <div className="wa-tbtn text-red-300 cursor-pointer" onClick={onClose}>×</div>
        </div>

        {/* Modal Body */}
        <div className="p-3 text-center flex flex-col items-center gap-2 font-mono">
          <div className="w-12 h-12 bg-[#091336] rounded border-2 border-yellow-400 flex items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.5)] my-1">
            <svg className="w-8 h-8 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            </svg>
          </div>

          <h3 className="text-xs font-bold text-white">WinAMP 2.9x Retro Player</h3>
          <p className="text-[9px] text-zinc-400">
            Cross-Platform Desktop Edition<br />
            Windows • macOS • Linux
          </p>

          <div className="wa-lcd-box p-2 text-[9px] text-[#00FF55] w-full my-1 leading-relaxed">
            "WINAMP, it really whips the llama's ass!"
          </div>

          <button
            onClick={playLlamaSound}
            className="wa-btn px-3 py-1 text-[8px] text-yellow-300 border-yellow-700 bg-yellow-950/40"
          >
            🔊 Llama Sound Demo
          </button>

          <p className="text-[8px] text-zinc-500 mt-1">
            Created with React 18, TypeScript, Web Audio API & Electron.<br />
            MIT License • Idris Katar
          </p>

          <button
            onClick={onClose}
            className="wa-btn px-4 py-1 text-[9px] mt-1 text-white font-bold"
          >
            KAPAT (OK)
          </button>
        </div>
      </div>
    </div>
  );
};

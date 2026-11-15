import React, { useEffect, useRef, useState } from 'react';
import { EQ_FREQUENCIES, audio } from '../../audio/AudioEngine';

interface EqualizerProps {
  onClose: () => void;
}

const PRESET_MAP: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 3, -1, -2, 0, 2, 4, 5, 5, 4],
  Pop: [1, 2, 4, 3, 0, -1, -1, 1, 3, 3],
  Techno: [6, 4, 0, -2, -1, 2, 5, 5, 4, 3],
  'Bass Boost': [8, 6, 4, 1, 0, 0, 0, 0, 0, 0],
  Acoustic: [3, 2, 1, 1, 1, 2, 3, 3, 2, 1],
};

export const Equalizer: React.FC<EqualizerProps> = ({ onClose }) => {
  const [eqOn, setEqOn] = useState(true);
  const [autoOn, setAutoOn] = useState(false);
  const [preamp, setPreamp] = useState(2);
  const [bands, setBands] = useState<number[]>([4, 2, -1, -3, 0, 3, 5, 4, 2, 1]);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [isShaded, setIsShaded] = useState(false);

  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update Web Audio nodes and draw Spline Curve
  useEffect(() => {
    audio.setPreamp(eqOn ? preamp : 0);
    bands.forEach((gain, idx) => {
      audio.setEQBand(idx, eqOn ? gain : 0);
    });

    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = eqOn ? '#00FF44' : '#557755';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const points: { x: number; y: number }[] = [];
    const step = canvas.width / (bands.length - 1);

    bands.forEach((val, idx) => {
      const normalizedY = eqOn
        ? canvas.height / 2 - (val / 12) * (canvas.height / 2 - 2)
        : canvas.height / 2;
      points.push({ x: idx * step, y: normalizedY });
    });

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
  }, [eqOn, preamp, bands]);

  const handleBandChange = (index: number, val: number) => {
    const updated = [...bands];
    updated[index] = val;
    setBands(updated);
  };

  const applyPreset = (presetName: string) => {
    if (PRESET_MAP[presetName]) {
      setBands([...PRESET_MAP[presetName]]);
      setShowPresetsMenu(false);
    }
  };

  return (
    <div
      id="eqWindow"
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
        <div className="flex items-center gap-1 z-10">
          <svg className="w-2.5 h-2.5 text-yellow-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          <span className="text-[9px] font-bold text-white tracking-widest font-mono">WINAMP EQUALIZER</span>
        </div>
        <div className="flex items-center gap-0.5 z-10">
          <div className="wa-tbtn" title="Windowshade" onClick={() => setIsShaded(!isShaded)}>▢</div>
          <div className="wa-tbtn text-red-300" title="Close" onClick={onClose}>×</div>
        </div>
      </div>

      {!isShaded && (
        <>
          {/* Upper Row: ON/AUTO Buttons + Spline Graph + Presets - y: 17 */}
          <div
            className="absolute flex items-center justify-between"
            style={{ left: 12, top: 17, width: 251, height: 18 }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEqOn(!eqOn)}
                className={`wa-btn ${eqOn ? 'text-emerald-400 bg-emerald-950 border-emerald-600' : 'text-zinc-500'}`}
                style={{ padding: '1px 4px', height: 14, fontSize: 7 }}
              >
                ON
              </button>
              <button
                onClick={() => setAutoOn(!autoOn)}
                className={`wa-btn ${autoOn ? 'text-emerald-400 bg-emerald-950' : 'text-zinc-400'}`}
                style={{ padding: '1px 4px', height: 14, fontSize: 7 }}
              >
                AUTO
              </button>
            </div>

            {/* Real-time Spline Graph */}
            <div className="wa-lcd-box overflow-hidden" style={{ width: 110, height: 16 }}>
              <canvas ref={graphCanvasRef} width={110} height={16} className="block" />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                className="wa-btn text-amber-300 font-mono"
                style={{ padding: '1px 5px', height: 14, fontSize: 7 }}
              >
                PRESETS
              </button>

              {/* Presets Dropdown */}
              {showPresetsMenu && (
                <div
                  className="absolute right-0 top-5 bg-[#1b1c20] border border-zinc-600 shadow-xl z-50 py-1 text-[8px] font-mono w-24"
                >
                  {Object.keys(PRESET_MAP).map((name) => (
                    <div
                      key={name}
                      onClick={() => applyPreset(name)}
                      className="px-2 py-0.5 hover:bg-emerald-900 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* EQ Sliders Container - y: 38 (h: 68px) */}
          <div
            className="absolute flex items-center justify-between"
            style={{ left: 10, top: 38, width: 255, height: 68 }}
          >
            {/* Preamp Slider */}
            <div className="flex flex-col items-center justify-between" style={{ width: 22, height: 66 }}>
              <span className="text-[6px] font-mono text-zinc-400">PRE</span>
              <input
                type="range"
                min="-12"
                max="12"
                value={preamp}
                onChange={(e) => setPreamp(Number(e.target.value))}
                className="wa-eq-v"
              />
              <span className="text-[6px] font-mono text-emerald-400">{preamp > 0 ? `+${preamp}` : preamp}dB</span>
            </div>

            {/* Vertical Divider */}
            <div className="w-px bg-zinc-700" style={{ height: 52 }} />

            {/* 10 Bands */}
            <div className="flex items-center justify-between flex-1 px-1" style={{ height: 66 }}>
              {EQ_FREQUENCIES.map((freq, idx) => {
                const label = freq >= 1000 ? `${freq / 1000}K` : `${freq}`;
                return (
                  <div key={freq} className="flex flex-col items-center justify-between h-full">
                    <span className="text-[6px] text-zinc-400 font-mono">{label}</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      value={bands[idx]}
                      onChange={(e) => handleBandChange(idx, Number(e.target.value))}
                      className="wa-eq-v"
                    />
                    <span className="text-[5px] text-zinc-500">-</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

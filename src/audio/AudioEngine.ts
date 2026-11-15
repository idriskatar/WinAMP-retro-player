// Real Web Audio API Engine with 10-Band EQ, 60 FPS Analyser and
// HTMLAudioElement lifecycle events (duration / time / ended / error).

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

/** Default boost curve shown by the Equalizer window. */
export const DEFAULT_EQ_BANDS = [4, 2, -1, -3, 0, 3, 5, 4, 2, 1];

export interface AudioEngineHandlers {
  onTimeUpdate?: (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preampGain: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Persisted mixer settings so values chosen before playback starts survive
  // AudioContext creation (and Equalizer re-mounts).
  private volume = 75;
  private balance = 0;
  private preamp = 2;
  private bands: number[] = [...DEFAULT_EQ_BANDS];
  private eqEnabled = true;

  // Playback bookkeeping
  private sourceLoaded = false;
  private objectUrl: string | null = null;
  private handlers: AudioEngineHandlers = {};

  // Synthetic demo beat oscillator handles
  private isDemoRunning = false;
  private demoInterval: number | null = null;

  constructor() {
    // Lazy initialize upon first user interaction to comply with browser autoplay policies
  }

  public setHandlers(handlers: AudioEngineHandlers) {
    this.handlers = handlers;
  }

  private emitError(message: string) {
    console.warn('[AudioEngine]', message);
    this.handlers.onError?.(message);
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) {
      this.emitError('Web Audio API bu ortamda desteklenmiyor.');
      return;
    }

    this.ctx = new AudioCtxClass();
    const el = new Audio();
    el.preload = 'metadata';
    this.audioElement = el;

    el.addEventListener('timeupdate', () => {
      this.handlers.onTimeUpdate?.(el.currentTime);
    });
    el.addEventListener('loadedmetadata', () => this.reportDuration());
    el.addEventListener('durationchange', () => this.reportDuration());
    el.addEventListener('ended', () => this.handlers.onEnded?.());
    el.addEventListener('error', () => {
      if (!this.sourceLoaded) return;
      const code = el.error?.code;
      this.emitError(
        code === 4
          ? 'Ses dosyası bulunamadı veya desteklenmeyen bir format.'
          : 'Ses dosyası yüklenemedi.'
      );
    });

    this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
    this.preampGain = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.75;

    // Create 10-band peaking filters
    this.eqFilters = EQ_FREQUENCIES.map((freq) => {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });

    if (this.ctx.createStereoPanner) {
      this.pannerNode = this.ctx.createStereoPanner();
    }

    // Connect node chain:
    // Source -> Preamp -> EQ[0] -> EQ[1] -> ... -> EQ[9] -> Panner -> MasterGain -> Analyser -> Destination
    let current: AudioNode = this.sourceNode;
    current.connect(this.preampGain);
    current = this.preampGain;

    this.eqFilters.forEach((filter) => {
      current.connect(filter);
      current = filter;
    });

    if (this.pannerNode) {
      current.connect(this.pannerNode);
      current = this.pannerNode;
    }

    current.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    // Apply everything the UI has configured before the graph existed.
    this.applySettings();
  }

  private reportDuration() {
    const el = this.audioElement;
    if (!el || !this.sourceLoaded) return;
    const duration = el.duration;
    if (Number.isFinite(duration) && duration > 0) {
      this.handlers.onDurationChange?.(duration);
    }
  }

  private applySettings() {
    const now = this.ctx?.currentTime ?? 0;

    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(100, this.volume)) / 100, now);
    }

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(Math.max(-50, Math.min(50, this.balance)) / 50, now);
    }

    if (this.preampGain) {
      const db = this.eqEnabled ? this.preamp : 0;
      this.preampGain.gain.setValueAtTime(Math.pow(10, db / 20), now);
    }

    this.eqFilters.forEach((filter, index) => {
      filter.gain.setValueAtTime(this.eqEnabled ? this.bands[index] ?? 0 : 0, now);
    });
  }

  public async resumeContext() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        this.emitError('Ses çıkışı başlatılamadı. Cihazın ses ayarlarını kontrol edin.');
      }
    }
  }

  public setPreamp(db: number) {
    this.preamp = db;
    this.applySettings();
  }

  public setEQBand(index: number, db: number) {
    this.bands[index] = db;
    this.applySettings();
  }

  public setEqEnabled(enabled: boolean) {
    this.eqEnabled = enabled;
    this.applySettings();
  }

  public setVolume(volPercent: number) {
    this.volume = Math.max(0, Math.min(100, volPercent));
    this.applySettings();
  }

  public setBalance(pan: number) {
    this.balance = Math.max(-50, Math.min(50, pan));
    this.applySettings();
  }

  public getPreamp() {
    return this.preamp;
  }

  public getEQBand(index: number) {
    return this.bands[index] ?? 0;
  }

  public getBands() {
    return [...this.bands];
  }

  public getEqEnabled() {
    return this.eqEnabled;
  }

  private releaseObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  /**
   * Loads a real track. Passing `null` clears the media element and switches
   * the engine to the built-in demo synth (used by the bundled playlist).
   */
  public loadTrack(src: string | File | null) {
    this.initContext();
    const el = this.audioElement;
    if (!el) return;

    this.stopDemoSynthBeat();
    el.pause();
    this.sourceLoaded = false;
    this.releaseObjectUrl();
    el.removeAttribute('src');
    try {
      el.load();
    } catch {
      // Ignore: some platforms throw while resetting an unloaded element.
    }

    if (!src) return;

    if (typeof src === 'string') {
      el.src = src;
    } else {
      this.objectUrl = URL.createObjectURL(src);
      el.src = this.objectUrl;
    }
    this.sourceLoaded = true;
    el.load();
  }

  public hasSource() {
    return this.sourceLoaded && !!this.audioElement?.src;
  }

  public async play() {
    await this.resumeContext();
    if (!this.audioElement) return;

    if (this.hasSource()) {
      try {
        await this.audioElement.play();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.emitError(`Oynatma başlatılamadı: ${message}`);
      }
    } else {
      // Built-in retro synth beat for the demo playlist tracks.
      this.startDemoSynthBeat();
    }
  }

  public pause() {
    this.audioElement?.pause();
    this.stopDemoSynthBeat();
  }

  public stop() {
    if (this.hasSource() && this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopDemoSynthBeat();
  }

  public seek(seconds: number) {
    if (!this.hasSource() || !this.audioElement) return;
    if (!Number.isFinite(seconds)) return;
    const duration = this.audioElement.duration;
    const max = Number.isFinite(duration) && duration > 0 ? duration : seconds;
    this.audioElement.currentTime = Math.max(0, Math.min(max, seconds));
  }

  public getFrequencyData(array: Uint8Array<ArrayBuffer>) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    }
  }

  public getTimeDomainData(array: Uint8Array<ArrayBuffer>) {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(array);
    }
  }

  // --- Procedural 90s Retro Synth Generator (Instant Sound & FFT test) ---
  private startDemoSynthBeat() {
    if (this.isDemoRunning || !this.ctx) return;
    this.isDemoRunning = true;

    const chords = [
      [130.81, 164.81, 196.0], // C
      [110.0, 130.81, 164.81], // A
      [146.83, 174.61, 220.0], // D
      [98.0, 123.47, 146.83], // G
    ];

    let step = 0;
    this.demoInterval = window.setInterval(() => {
      if (!this.isDemoRunning || !this.ctx) return;
      const t = this.ctx.currentTime;
      const chord = chords[Math.floor((step % 32) / 8)];
      const freq = chord[step % chord.length];

      // Bass drum / retro bass pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = step % 4 === 0 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(step % 4 === 0 ? 65 : freq * 1.5, t);
      if (step % 4 === 0) {
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      }

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      if (this.preampGain) {
        gain.connect(this.preampGain);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc.start(t);
      osc.stop(t + 0.2);

      step++;
    }, 180);
  }

  private stopDemoSynthBeat() {
    this.isDemoRunning = false;
    if (this.demoInterval !== null) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
  }
}

export const audio = new AudioEngine();

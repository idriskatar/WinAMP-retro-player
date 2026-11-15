// Real Web Audio API Engine with 10-Band EQ & 60 FPS Analyser

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preampGain: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Synthetic demo beat oscillator handles
  private isDemoRunning = false;
  private demoInterval: number | null = null;

  constructor() {
    // Lazy initialize upon first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtxClass();

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

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
  }

  public async resumeContext() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setPreamp(db: number) {
    if (!this.preampGain) return;
    // convert dB to linear gain
    const linear = Math.pow(10, db / 20);
    this.preampGain.gain.setValueAtTime(linear, this.ctx!.currentTime);
  }

  public setEQBand(index: number, db: number) {
    if (!this.eqFilters[index]) return;
    this.eqFilters[index].gain.setValueAtTime(db, this.ctx!.currentTime);
  }

  public setVolume(volPercent: number) {
    if (!this.masterGain) return;
    const clamped = Math.max(0, Math.min(100, volPercent)) / 100;
    this.masterGain.gain.setValueAtTime(clamped, this.ctx!.currentTime);
  }

  public setBalance(pan: number) {
    // pan: -50 (Left) to +50 (Right) -> normalize to -1 to +1
    if (!this.pannerNode) return;
    const normalized = Math.max(-50, Math.min(50, pan)) / 50;
    this.pannerNode.pan.setValueAtTime(normalized, this.ctx!.currentTime);
  }

  public loadTrack(src: string | File) {
    this.initContext();
    if (this.audioElement) {
      if (typeof src === 'string') {
        this.audioElement.src = src;
      } else {
        this.audioElement.src = URL.createObjectURL(src);
      }
      this.audioElement.load();
    }
  }

  public async play() {
    await this.resumeContext();
    if (this.audioElement && this.audioElement.src && !this.audioElement.src.endsWith('/')) {
      return this.audioElement.play();
    } else {
      // Start built-in retro synth beat generator for instant sound & visualizer response!
      this.startDemoSynthBeat();
    }
  }

  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopDemoSynthBeat();
  }

  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopDemoSynthBeat();
  }

  public seek(seconds: number) {
    if (this.audioElement && isFinite(seconds)) {
      this.audioElement.currentTime = seconds;
    }
  }

  public getFrequencyData(array: Uint8Array) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    }
  }

  public getTimeDomainData(array: Uint8Array) {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(array);
    }
  }

  // --- Procedural 90s Retro Synth Generator (Instant Sound & FFT test) ---
  private startDemoSynthBeat() {
    if (this.isDemoRunning || !this.ctx) return;
    this.isDemoRunning = true;

    const chords = [
      [130.81, 164.81, 196.00], // C
      [110.00, 130.81, 164.81], // A
      [146.83, 174.61, 220.00], // D
      [98.00, 123.47, 146.83],  // G
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
      osc.type = (step % 4 === 0) ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime((step % 4 === 0) ? 65 : freq * 1.5, t);
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

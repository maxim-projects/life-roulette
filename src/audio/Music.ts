/**
 * Procedural western/cowboy ambient через Web Audio API.
 * Свист-лид (Морриконе-style coyote call) + редкий bass-pluck + delay.
 * Чтобы заменить на реальный mp3: подменить тело start().
 */

const STORAGE_KEY = 'life-roulette:music-muted';

export class Music {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private intervalId: number | null = null;
  private muted: boolean;

  constructor() {
    this.muted = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY) === 'true'
      : false;
  }

  /** Должно вызываться по user gesture (click). Иначе AudioContext будет suspended. */
  start(): void {
    if (this.ctx) return;
    const Ctor = (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) || null;
    if (!Ctor) return;

    const ctx = new Ctor();
    this.ctx = ctx;

    // master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.18;
    this.masterGain.connect(ctx.destination);

    // delay для прерий-эха
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0.4;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.delayWet);
    this.delayWet.connect(this.masterGain);

    // Coyote-call whistle motif (D minor pent: D5 A4 F4 D4) + sparse strums
    // Loop ~ каждые 8 секунд
    let beat = 0;
    const playMotif = (): void => {
      if (!this.ctx || !this.masterGain) return;
      const t0 = this.ctx.currentTime;

      // Whistle: D5 → A4 (короткая coyote-call)
      this.playWhistle(t0 + 0.0, 587.33, 0.6);   // D5
      this.playWhistle(t0 + 0.6, 440.0, 1.4);    // A4 длинная
      this.playWhistle(t0 + 2.2, 587.33, 0.4);   // D5
      this.playWhistle(t0 + 2.8, 349.23, 1.6);   // F4 длинная

      // Bass pluck (D2)
      this.playPluck(t0 + 0.0, 73.42);
      this.playPluck(t0 + 4.0, 73.42);

      // Каждые 4-й проход — разнообразие: A2 вместо D2
      if (beat % 4 === 3) {
        this.playPluck(t0 + 6.0, 110.0);
      }
      beat += 1;
    };

    // Сразу + по интервалу
    playMotif();
    this.intervalId = window.setInterval(playMotif, 8000);
  }

  private playWhistle(startTime: number, freq: number, duration: number): void {
    if (!this.ctx || !this.masterGain || !this.delayWet) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    // Vibrato через LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 4;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(startTime);
    lfo.stop(startTime + duration + 0.1);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.18, startTime + 0.08);
    env.gain.linearRampToValueAtTime(0.15, startTime + duration * 0.6);
    env.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(env);
    env.connect(this.masterGain);
    env.connect(this.delayWet);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  private playPluck(startTime: number, freq: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, startTime);
    filter.frequency.exponentialRampToValueAtTime(120, startTime + 0.8);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 1.3);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.18, this.ctx.currentTime + 0.2);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.masterGain = null;
    this.delayWet = null;
  }
}

export const music = new Music();

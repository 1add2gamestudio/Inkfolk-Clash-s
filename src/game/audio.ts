import type { BattleSoundEvent } from './engine';
import {
  MusicComposer,
  type BattleMusicContext,
  type MusicMode,
} from './musicEngine';

export type { BattleMusicContext, MusicMode };

export type SteelClashVariant = 'parry_ring' | 'blade_scrape' | 'broad_clang' | 'shield_brace';
export type BattleDrumVariant = 'taiko_thump' | 'double_flam' | 'march_cadence';
export type BattleShoutVariant = 'rally_cry' | 'charge_hey' | 'grunt_effort' | 'giant_roar';

export interface RandomizedBattleSfxPayload {
  category: 'steel_clash' | 'war_drum' | 'battle_shout';
  variant: SteelClashVariant | BattleDrumVariant | BattleShoutVariant;
  /** Stereo pan position in [-0.7, 0.7] mapped from battlefield X coordinate */
  pan: number;
  /** Intensity scalar in [0.25, 1.0] driven by clash density / tug-of-war energy */
  intensity: number;
  /** Pitch multiplier for natural organic variation (e.g. 0.85..1.18) */
  pitchScale: number;
}

/**
 * Generates a warm, natural stereo Stone Courtyard / Castle Hall impulse response
 * with subtle early reflections and high-frequency air damping.
 */
function createCourtyardImpulseResponse(
  ctx: AudioContext,
  durationSec = 1.75,
  decayPower = 2.6
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * durationSec);
  const buffer = ctx.createBuffer(2, length, rate);

  // Discrete early stone reflections (in seconds)
  const earlyReflections: Array<[number, number, number]> = [
    [0.014, 0.52, 0.38],
    [0.027, 0.36, 0.48],
    [0.043, 0.42, 0.31],
    [0.068, 0.28, 0.34],
  ];

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lpState = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decayPower);
      // One-pole lowpass damping simulates warm stone absorption over time
      const white = Math.random() * 2 - 1;
      const damp = 0.24 + (1 - t) * 0.44;
      lpState = lpState + damp * (white - lpState);
      data[i] = lpState * env * 0.65;
    }

    // Stamp warm early reflections
    for (const [sec, lGain, rGain] of earlyReflections) {
      const idx = Math.min(length - 1, Math.floor(sec * rate));
      const g = ch === 0 ? lGain : rGain;
      data[idx] += (Math.random() * 0.4 + 0.6) * g * 0.35;
    }
  }
  return buffer;
}

/**
 * Builds a gentle analog soft-clipping curve (tanh saturation) so heavy clashes,
 * giant stomps, and orchestral brass sound warm and punchy without digital clipping.
 */
function createWarmSaturationCurve(drive = 1.35): Float32Array<ArrayBuffer> {
  const samples = 512;
  const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  const norm = Math.tanh(drive);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * drive) / norm;
  }
  return curve;
}

class SoundController {
  private ctx: AudioContext | null = null;
  private sfxDry: GainNode | null = null;
  private sfxWet: GainNode | null = null;
  private musicDry: GainNode | null = null;
  private musicWet: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private readonly music = new MusicComposer();
  private desiredMusicMode: MusicMode = 'title';
  private lastOutcomeCueAt = 0;
  private lastOutcomeCueKind: 'victory' | 'defeat' | null = null;

  private soundEnabled = true;
  private hapticsEnabled = true;
  private lastLightHitAt = 0;
  private lastHeavyHitAt = 0;
  private lastKillAt = 0;
  private lastGiantStompAt = 0;
  private lastGiantSlamAt = 0;
  private hasVibrated = false;

  setPreferences(sound: boolean, haptics: boolean): void {
    const wasMuted = !this.soundEnabled;
    this.soundEnabled = sound;
    this.hapticsEnabled = haptics;
    this.music.setEnabled(sound);

    if (sound && wasMuted) {
      const ctx = this.ensureContext();
      if (ctx && (this.desiredMusicMode === 'title' || this.desiredMusicMode === 'battle' || this.desiredMusicMode === 'paused')) {
        this.music.setMode(this.desiredMusicMode);
      }
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(sound ? 0.95 : 0.0001, now, 0.04);
    }
  }

  /**
   * Call on the first user gesture (pointerdown / keydown) so browser autoplay policy
   * unlocks Web Audio cleanly and starts the queued title/battle BGM seamlessly.
   */
  unlock(): void {
    if (!this.soundEnabled) return;
    const isLoopMode =
      this.desiredMusicMode === 'title' ||
      this.desiredMusicMode === 'battle' ||
      this.desiredMusicMode === 'paused';
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        if (this.soundEnabled && isLoopMode) {
          this.music.setMode(this.desiredMusicMode);
        }
      }).catch(() => {});
    } else if (isLoopMode) {
      this.music.setMode(this.desiredMusicMode);
    }
  }

  setMusicMode(mode: MusicMode): void {
    // Guard against re-triggering victory/defeat fanfare twice (once in engine end-beat, once when modal opens)
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (
      (mode === 'victory' || mode === 'defeat') &&
      this.lastOutcomeCueKind === mode &&
      nowMs - this.lastOutcomeCueAt < 3800
    ) {
      this.desiredMusicMode = mode;
      return;
    }

    this.desiredMusicMode = mode;
    if (mode === 'victory' || mode === 'defeat') {
      this.lastOutcomeCueKind = mode;
      this.lastOutcomeCueAt = nowMs;
    } else {
      this.lastOutcomeCueKind = null;
    }

    if (!this.soundEnabled) return;
    // Only spin up AudioContext if already created or user has interacted
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      this.music.setMode(mode);
    }
  }

  updateBattleMusic(partial: Partial<BattleMusicContext>): void {
    this.music.updateBattleContext(partial);
  }

  setSuspendedByVisibility(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) {
      if (this.ctx.state === 'running') {
        void this.ctx.suspend().catch(() => {});
      }
    } else if (this.soundEnabled && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Master Chain: Buses -> Warm Saturator -> Dynamics Compressor -> Master Gain -> Destination
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.soundEnabled ? 0.95 : 0.0001, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.masterGain = masterGain;

      let masterIn: AudioNode = masterGain;

      if (typeof ctx.createDynamicsCompressor === 'function') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-12, ctx.currentTime);
        comp.knee.setValueAtTime(16, ctx.currentTime);
        comp.ratio.setValueAtTime(3.6, ctx.currentTime);
        comp.attack.setValueAtTime(0.005, ctx.currentTime);
        comp.release.setValueAtTime(0.16, ctx.currentTime);
        comp.connect(masterGain);
        masterIn = comp;
      }

      if (typeof ctx.createWaveShaper === 'function') {
        const shaper = ctx.createWaveShaper();
        shaper.curve = createWarmSaturationCurve(1.28);
        shaper.oversample = '2x';
        shaper.connect(masterIn);
        masterIn = shaper;
      }

      // Global Stone Courtyard Convolution Reverb
      const reverbReturn = ctx.createGain();
      reverbReturn.gain.setValueAtTime(0.62, ctx.currentTime);
      reverbReturn.connect(masterIn);

      let wetInput: AudioNode = reverbReturn;
      if (typeof ctx.createConvolver === 'function') {
        const convolver = ctx.createConvolver();
        convolver.buffer = createCourtyardImpulseResponse(ctx, 1.75, 2.55);
        convolver.connect(reverbReturn);
        wetInput = convolver;
      }

      // Separate SFX & Music Buses for clean mix balance
      const sfxDry = ctx.createGain();
      sfxDry.gain.setValueAtTime(1.0, ctx.currentTime);
      sfxDry.connect(masterIn);

      const sfxWet = ctx.createGain();
      sfxWet.gain.setValueAtTime(0.28, ctx.currentTime);
      sfxWet.connect(wetInput);

      const musicDry = ctx.createGain();
      musicDry.gain.setValueAtTime(0.56, ctx.currentTime);
      musicDry.connect(masterIn);

      const musicWet = ctx.createGain();
      musicWet.gain.setValueAtTime(0.42, ctx.currentTime);
      musicWet.connect(wetInput);

      this.sfxDry = sfxDry;
      this.sfxWet = sfxWet;
      this.musicDry = musicDry;
      this.musicWet = musicWet;

      // Attach adaptive music composer to the shared acoustic space
      this.music.attach({
        ctx,
        musicDry,
        musicWet,
        whiteNoise: this.getWhiteNoise(ctx),
        pinkNoise: this.getPinkNoise(ctx),
      });
      this.music.setEnabled(this.soundEnabled);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getWhiteNoise(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer && this.whiteNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.whiteNoiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buf;
    return buf;
  }

  /**
   * Paul Kellet's economical pink noise filter (-3dB/octave) — ideal for steam,
   * stone rubble, drum skins, wooden impacts, and breathy warhorns.
   */
  private getPinkNoise(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer && this.pinkNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.pinkNoiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = buf;
    return buf;
  }

  /**
   * Creates a stereo-panned output split sending dry signal + optional wet reverb send.
   */
  private createSfxBus(ctx: AudioContext, pan = 0, reverbSend = 0.22): AudioNode {
    const dryDest = this.sfxDry ?? ctx.destination;
    const wetDest = this.sfxWet;

    let entry: AudioNode = dryDest;
    if (Math.abs(pan) > 0.02 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.78, Math.min(0.78, pan)), ctx.currentTime);
      panner.connect(dryDest);
      if (wetDest && reverbSend > 0.01) {
        const send = ctx.createGain();
        send.gain.setValueAtTime(reverbSend, ctx.currentTime);
        panner.connect(send);
        send.connect(wetDest);
      }
      entry = panner;
    } else if (wetDest && reverbSend > 0.01) {
      const node = ctx.createGain();
      node.gain.setValueAtTime(1.0, ctx.currentTime);
      node.connect(dryDest);
      const send = ctx.createGain();
      send.gain.setValueAtTime(reverbSend, ctx.currentTime);
      node.connect(send);
      send.connect(wetDest);
      entry = node;
    }
    return entry;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
    pan = 0,
    reverbSend = 0.18,
    attack = 0.004
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, volume), now + Math.min(attack, duration * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.createSfxBus(ctx, pan, reverbSend));
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * High-Q modal metallic ring oscillator — models real forged steel / bronze overtones.
   */
  private playModalRing(
    freq: number,
    duration: number,
    volume: number,
    q = 14,
    type: OscillatorType = 'triangle',
    delay = 0,
    pan = 0,
    reverbSend = 0.32
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    // Tiny physical pitch sag as blade vibration loses energy
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.97), now + duration);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq, now);
    bp.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, volume), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.createSfxBus(ctx, pan, reverbSend));
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playFilteredNoise(
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    q: number,
    volume: number,
    delay = 0,
    pan = 0,
    usePink = false,
    reverbSend = 0.22,
    attack = 0.004
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = usePink ? this.getPinkNoise(ctx) : this.getWhiteNoise(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(Math.max(40, freqStart), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, volume), now + Math.min(attack, duration * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.createSfxBus(ctx, pan, reverbSend));
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  /**
   * Synthesizes a cinematic brass warhorn / colossus BRAAM voice with dual detuned sawtooths,
   * breath-bloom resonant lowpass sweep, and optional gravity pitch sag.
   */
  private playWarhornVoice(
    freqStart: number,
    freqEnd: number,
    duration: number,
    volume: number,
    delay = 0,
    pan = 0,
    reverbSend = 0.55,
    filterPeakMult = 4.6
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const out = this.createSfxBus(ctx, pan, reverbSend);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freqStart, now);
    osc2.frequency.setValueAtTime(freqStart, now);
    osc1.detune.setValueAtTime(-7, now);
    osc2.detune.setValueAtTime(7, now);
    osc1.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);
    osc2.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.6, now);
    filter.frequency.setValueAtTime(Math.max(120, freqStart * 1.4), now);
    filter.frequency.linearRampToValueAtTime(
      Math.min(4800, freqStart * filterPeakMult),
      now + Math.min(0.16, duration * 0.28)
    );
    filter.frequency.exponentialRampToValueAtTime(Math.max(140, freqEnd * 2.1), now + duration);

    const env = ctx.createGain();
    const atk = Math.min(0.11, duration * 0.22);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(volume, now + atk);
    env.gain.setValueAtTime(volume * 0.86, now + duration * 0.68);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(out);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.03);
    osc2.stop(now + duration + 0.03);
  }

  private canUseHaptics(): boolean {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false;
    }
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
      .userActivation;
    if (activation && !activation.hasBeenActive) {
      return false;
    }
    return true;
  }

  vibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled || !this.canUseHaptics()) return;
    try {
      this.hasVibrated = true;
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported environments
    }
  }

  stopVibration(): void {
    if (!this.hasVibrated || !this.canUseHaptics()) return;
    try {
      this.hasVibrated = false;
      navigator.vibrate(0);
    } catch {
      // Ignore unsupported environments
    }
  }

  // =========================================================================
  // STEREO COLLISION ATMOSPHERE (Steel Clashes, Tug-of-War Drums, Warcries)
  // =========================================================================

  playBattleCollisionSfx(payload: RandomizedBattleSfxPayload): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const { category, variant, pan, intensity, pitchScale } = payload;
    const vol = 0.5 + Math.max(0, Math.min(1, intensity)) * 0.48;

    if (category === 'steel_clash') {
      this.playSteelClash(variant as SteelClashVariant, pan, vol, pitchScale);
    } else if (category === 'war_drum') {
      this.playBattleDrum(variant as BattleDrumVariant, pan, vol, pitchScale);
    } else if (category === 'battle_shout') {
      this.playBattleShout(variant as BattleShoutVariant, pan, vol, pitchScale);
    }
  }

  private playSteelClash(
    variant: SteelClashVariant,
    pan: number,
    vol: number,
    pitch: number
  ): void {
    // 4-layer foley modal steel synthesis (Transient Crack + Inharmonic Modal Rings + Weight Body + Reverb)
    if (variant === 'parry_ring') {
      // High-carbon blade parry: razor transient + 4 non-integer forged steel partials
      this.playFilteredNoise(0.038, 'highpass', 3000 * pitch, 5600 * pitch, 1.8, 0.068 * vol, 0, pan, false, 0.25);
      this.playTone(310 * pitch, 105 * pitch, 0.065, 'sine', 0.055 * vol, 0, pan, 0.14);
      this.playModalRing(1310 * pitch, 0.24, 0.072 * vol, 16, 'triangle', 0, pan, 0.36);
      this.playModalRing(2390 * pitch, 0.2, 0.054 * vol, 18, 'sine', 0.003, pan, 0.36);
      this.playModalRing(3780 * pitch, 0.15, 0.036 * vol, 20, 'sine', 0.005, pan, 0.38);
      this.playModalRing(5120 * pitch, 0.1, 0.022 * vol, 16, 'sine', 0.006, pan, 0.38);
    } else if (variant === 'blade_scrape') {
      // Steel-on-steel sliding edge friction + biting metallic zing
      this.playFilteredNoise(0.13, 'bandpass', 2200 * pitch, 4900 * pitch, 6.2, 0.075 * vol, 0, pan, false, 0.32, 0.015);
      this.playModalRing(1840 * pitch, 0.14, 0.048 * vol, 14, 'sawtooth', 0.01, pan, 0.34);
      this.playModalRing(3260 * pitch, 0.13, 0.034 * vol, 18, 'sine', 0.014, pan, 0.34);
    } else if (variant === 'broad_clang') {
      // Heavy iron broadsword / halberd clash: deep mass + resonant bronze-iron ring
      this.playFilteredNoise(0.055, 'bandpass', 1900 * pitch, 720 * pitch, 1.5, 0.088 * vol, 0, pan, true, 0.28);
      this.playTone(230 * pitch, 72 * pitch, 0.095, 'sine', 0.092 * vol, 0, pan, 0.16);
      this.playModalRing(590 * pitch, 0.25, 0.076 * vol, 12, 'triangle', 0, pan, 0.35);
      this.playModalRing(1235 * pitch, 0.2, 0.052 * vol, 16, 'triangle', 0.004, pan, 0.36);
      this.playModalRing(2480 * pitch, 0.15, 0.032 * vol, 18, 'sine', 0.007, pan, 0.36);
    } else {
      // shield_brace: solid oak shield thud + iron rim boss rattle
      this.playTone(245 * pitch, 82 * pitch, 0.095, 'triangle', 0.095 * vol, 0, pan, 0.2);
      this.playFilteredNoise(0.055, 'bandpass', 1150 * pitch, 540 * pitch, 2.0, 0.078 * vol, 0, pan, true, 0.22);
      this.playModalRing(1420 * pitch, 0.11, 0.036 * vol, 12, 'sine', 0.008, pan, 0.28);
    }
  }

  private playBattleDrum(
    variant: BattleDrumVariant,
    pan: number,
    vol: number,
    pitch: number
  ): void {
    const hitDrum = (delay: number, gainMult: number, freqMult: number) => {
      const f = pitch * freqMult;
      const p = pan * 0.45;
      // Deep resonant taiko membrane + felt mallet snap
      this.playTone(115 * f, 40 * f, 0.22, 'sine', 0.095 * vol * gainMult, delay, p, 0.28);
      this.playTone(170 * f, 62 * f, 0.12, 'triangle', 0.052 * vol * gainMult, delay, p, 0.22);
      this.playFilteredNoise(0.045, 'bandpass', 460 * f, 180 * f, 1.4, 0.054 * vol * gainMult, delay, p, true, 0.24);
    };

    if (variant === 'taiko_thump') {
      hitDrum(0, 1.0, 0.96);
    } else if (variant === 'double_flam') {
      hitDrum(0, 0.62, 1.14);
      hitDrum(0.072, 1.05, 0.92);
    } else {
      hitDrum(0, 0.8, 1.05);
      hitDrum(0.155, 0.96, 0.88);
    }
  }

  private playBattleShout(
    variant: BattleShoutVariant,
    pan: number,
    vol: number,
    pitch: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const out = this.createSfxBus(ctx, pan, variant === 'giant_roar' ? 0.5 : 0.34);

    // 3-formant vocal tract synthesis (F1/F2/F3) for warmer, more natural medieval warcries
    const spec =
      variant === 'rally_cry'
        ? { f0Start: 196, f0Peak: 262, f0End: 185, f1: 730, f2: 1450, f3: 2550, dur: 0.29, gain: 0.068 }
        : variant === 'charge_hey'
          ? { f0Start: 224, f0Peak: 282, f0End: 168, f1: 660, f2: 1760, f3: 2700, dur: 0.22, gain: 0.064 }
          : variant === 'grunt_effort'
            ? { f0Start: 142, f0Peak: 158, f0End: 102, f1: 560, f2: 1140, f3: 2300, dur: 0.16, gain: 0.066 }
            : { f0Start: 88, f0Peak: 112, f0End: 58, f1: 390, f2: 860, f3: 1850, dur: 0.44, gain: 0.105 }; // giant_roar

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(spec.f0Start * pitch, now);
    oscA.frequency.linearRampToValueAtTime(spec.f0Peak * pitch, now + spec.dur * 0.3);
    oscA.frequency.exponentialRampToValueAtTime(Math.max(42, spec.f0End * pitch), now + spec.dur);

    oscB.frequency.setValueAtTime(spec.f0Start * pitch * 1.008, now);
    oscB.frequency.linearRampToValueAtTime(spec.f0Peak * pitch * 1.006, now + spec.dur * 0.3);
    oscB.frequency.exponentialRampToValueAtTime(Math.max(42, spec.f0End * pitch * 0.994), now + spec.dur);

    const makeFormant = (freq: number, q: number, gVal: number) => {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(freq * (0.94 + pitch * 0.06), now);
      f.Q.setValueAtTime(q, now);
      const fg = ctx.createGain();
      fg.gain.setValueAtTime(gVal, now);
      f.connect(fg);
      return { f, fg };
    };

    const fm1 = makeFormant(spec.f1, variant === 'giant_roar' ? 3.0 : 4.2, 1.0);
    const fm2 = makeFormant(spec.f2, 5.0, 0.72);
    const fm3 = makeFormant(spec.f3, 6.2, 0.32);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(spec.gain * vol, now + 0.028);
    env.gain.setValueAtTime(spec.gain * vol * 0.84, now + spec.dur * 0.56);
    env.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);

    [fm1, fm2, fm3].forEach(({ f, fg }) => {
      oscA.connect(f);
      oscB.connect(f);
      fg.connect(env);
    });
    env.connect(out);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + spec.dur + 0.02);
    oscB.stop(now + spec.dur + 0.02);

    // Vocal breath aspiration grit
    this.playFilteredNoise(
      spec.dur * 0.85,
      'bandpass',
      spec.f2 * 0.92,
      spec.f1 * 0.85,
      2.4,
      0.032 * vol,
      0.012,
      pan,
      true,
      0.3
    );

    // Extra deep brassy chest rumble for Giant Roar
    if (variant === 'giant_roar') {
      this.playWarhornVoice(73.4 * pitch, 58 * pitch, 0.48, 0.085 * vol, 0.02, pan, 0.52, 3.2);
    }
  }

  // =========================================================================
  // CORE COMBAT, COLOSSUS, WAVE & PROGRESSION SFX
  // =========================================================================

  /**
   * 5-layer cinematic Colossus / Giant Grand Entrance:
   * Steam vent hiss -> Hydraulic gear lock -> Earth-shaking sub footfall -> Gravel debris -> Mythic BRAAM Warhorn
   */
  private playGiantEntrance(): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastGiantStompAt < 260) return;
    this.lastGiantStompAt = nowMs;

    const jitter = 0.95 + Math.random() * 0.1;

    // Briefly duck BGM so the Colossus commands the battlefield
    this.music.duck(0.56, 0.45, 0.65);

    // Layer 1 (0.00s): High-pressure steam valve hiss (clockwork / brass steam identity!)
    this.playFilteredNoise(0.42, 'bandpass', 4200 * jitter, 980 * jitter, 2.2, 0.12, 0, 0, true, 0.48, 0.018);
    this.playFilteredNoise(0.24, 'highpass', 5200, 2600, 1.0, 0.055, 0.01, 0.15, false, 0.4, 0.012);

    // Layer 2 (0.04s): Heavy clockwork servo lock + iron gear ratchet clank
    this.playModalRing(440 * jitter, 0.2, 0.07, 10, 'triangle', 0.035, -0.18, 0.34);
    this.playModalRing(920 * jitter, 0.16, 0.052, 14, 'sawtooth', 0.055, 0.18, 0.34);
    this.playTone(190 * jitter, 95 * jitter, 0.11, 'triangle', 0.085, 0.04, 0, 0.24);

    // Layer 3 (0.11s): Earth-shaking sub-bass footfall (chest thump 64Hz -> 24Hz) + low stone crush
    this.playTone(68 * jitter, 24, 0.46, 'sine', 0.24, 0.105, 0, 0.25, 0.006);
    this.playTone(112 * jitter, 34, 0.32, 'triangle', 0.16, 0.105, 0, 0.3, 0.005);
    this.playFilteredNoise(0.22, 'lowpass', 720, 160, 1.2, 0.15, 0.105, 0, true, 0.36, 0.005);

    // Layer 4 (0.13s): Stereo-scattered crumbling stone & gravel debris
    this.playFilteredNoise(0.11, 'bandpass', 2400, 1100, 1.8, 0.072, 0.125, -0.42, false, 0.35);
    this.playFilteredNoise(0.14, 'bandpass', 3100, 1400, 2.1, 0.06, 0.165, 0.45, false, 0.38);

    // Layer 5 (0.15s): Mythic Colossus Brass "BRAAM" Warhorn (D2 + A2 with downward gravity sag!)
    this.playWarhornVoice(73.42 * jitter, 65.4 * jitter, 1.05, 0.135, 0.145, -0.12, 0.62, 4.4);
    this.playWarhornVoice(110.0 * jitter, 98.0 * jitter, 0.96, 0.085, 0.165, 0.16, 0.62, 3.8);
  }

  /**
   * 4-layer seismic Colossus Combat Strike (greatsword / hammer ground slam):
   * Air-shear whoosh -> Seismic sub-bass shockwave -> Heavy bronze-iron anvil clang -> Stone rubble scatter
   */
  private playGiantSlam(): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastGiantSlamAt < 130) return;
    this.lastGiantSlamAt = nowMs;

    const jitter = 0.93 + Math.random() * 0.14;

    // Layer 1 (0.00s): Heavy blade/hammer downward air shear whoosh
    this.playFilteredNoise(0.085, 'bandpass', 980 * jitter, 210, 1.6, 0.095, 0, 0, true, 0.25, 0.015);

    // Layer 2 (0.025s): Seismic shockwave sub-bass + saturated impact weight
    this.playTone(96 * jitter, 26, 0.38, 'sine', 0.22, 0.025, 0, 0.28, 0.004);
    this.playTone(148 * jitter, 42, 0.26, 'triangle', 0.15, 0.025, 0, 0.3, 0.004);
    this.playFilteredNoise(0.16, 'bandpass', 880, 240, 1.3, 0.14, 0.025, 0, true, 0.34, 0.004);

    // Layer 3 (0.028s): Colossal bronze-iron anvil modal ring (low-pitched heavy metal!)
    this.playModalRing(368 * jitter, 0.32, 0.095, 11, 'triangle', 0.028, -0.12, 0.42);
    this.playModalRing(792 * jitter, 0.26, 0.072, 14, 'triangle', 0.031, 0.14, 0.42);
    this.playModalRing(1520 * jitter, 0.2, 0.048, 16, 'sine', 0.034, -0.08, 0.44);
    this.playModalRing(2640 * jitter, 0.14, 0.03, 18, 'sine', 0.036, 0.12, 0.44);

    // Layer 4 (0.055s): Multi-grain shattering stone rubble cascading across stereo field
    this.playFilteredNoise(0.09, 'highpass', 2100, 950, 1.2, 0.068, 0.05, -0.45, false, 0.34);
    this.playFilteredNoise(0.11, 'bandpass', 2900, 1200, 2.0, 0.055, 0.085, 0.48, false, 0.36);
    this.playFilteredNoise(0.08, 'bandpass', 1800, 850, 2.2, 0.042, 0.13, -0.22, true, 0.34);
  }

  /**
   * Medieval Siege Warhorn + Double War-Drum for Huge Wave Warning
   */
  private playWaveWarhorn(): void {
    this.music.duck(0.62, 0.45, 0.55);

    // Deep ominous siege warhorn call: D3 -> C3 -> A2 (minor-modal tension!)
    this.playWarhornVoice(146.83, 142.0, 0.44, 0.115, 0, -0.16, 0.6, 3.8);
    this.playWarhornVoice(73.42, 72.0, 0.46, 0.095, 0, 0.14, 0.55, 2.8);

    this.playWarhornVoice(130.81, 110.0, 0.68, 0.12, 0.36, 0.12, 0.65, 4.2);
    this.playWarhornVoice(65.41, 55.0, 0.72, 0.1, 0.38, -0.14, 0.58, 2.8);

    // Booming double war-drum cadence underneath
    this.playTone(98, 36, 0.28, 'sine', 0.18, 0.06, 0, 0.35);
    this.playFilteredNoise(0.06, 'bandpass', 380, 140, 1.4, 0.08, 0.06, 0, true, 0.3);
    this.playTone(92, 34, 0.32, 'sine', 0.2, 0.4, 0, 0.38);
    this.playFilteredNoise(0.07, 'bandpass', 360, 130, 1.4, 0.09, 0.4, 0, true, 0.32);

    // Preserved user preference: moderate half-duration mobile vibration ONLY on pre-wave alert
    this.vibrate([105, 85, 115, 85, 125, 85, 115, 85, 105, 85, 90]);
  }

  trigger(ev: BattleSoundEvent): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const jitter = 0.93 + Math.random() * 0.14;
    const microPan = (Math.random() - 0.5) * 0.36;

    switch (ev) {
      case 'summon': {
        // Tactile troop muster: warm leather/wood drum tap + buckle clink + D Dorian harp fifth
        this.playTone(175 * jitter, 82, 0.085, 'triangle', 0.095, 0, -0.25, 0.2);
        this.playFilteredNoise(0.032, 'bandpass', 1800 * jitter, 900, 2.2, 0.048, 0, -0.25, true, 0.2);
        this.playTone(293.66, 293.66, 0.16, 'triangle', 0.058, 0.015, -0.18, 0.32, 0.005);
        this.playTone(440.0, 440.0, 0.2, 'sine', 0.048, 0.05, -0.1, 0.35, 0.005);
        break;
      }

      case 'hit_light': {
        if (nowMs - this.lastLightHitAt < 45) return;
        this.lastLightHitAt = nowMs;
        // 3-layer crisp blade/arrow hit: broadband snap + warm wood/armor thwack + steel glint
        this.playFilteredNoise(0.032, 'highpass', 2600 * jitter, 4800 * jitter, 1.5, 0.048, 0, microPan, false, 0.2);
        this.playTone(255 * jitter, 92 * jitter, 0.062, 'triangle', 0.062, 0, microPan, 0.16);
        this.playModalRing(1680 * jitter, 0.09, 0.028, 14, 'sine', 0.002, microPan, 0.26);
        break;
      }

      case 'hit_heavy': {
        if (nowMs - this.lastHeavyHitAt < 42) return;
        this.lastHeavyHitAt = nowMs;
        // 4-layer weighty cleave/critical impact: sub punch + armor crunch + forged-iron modal ring
        this.playTone(148 * jitter, 42, 0.14, 'sine', 0.13, 0, microPan, 0.24);
        this.playTone(220 * jitter, 68, 0.1, 'triangle', 0.085, 0, microPan, 0.22);
        this.playFilteredNoise(0.075, 'bandpass', 1650 * jitter, 480, 1.5, 0.085, 0, microPan, true, 0.28);
        this.playModalRing(540 * jitter, 0.18, 0.056, 12, 'triangle', 0.004, microPan, 0.34);
        this.playModalRing(1190 * jitter, 0.14, 0.038, 16, 'sine', 0.006, microPan, 0.34);
        break;
      }

      case 'kill': {
        if (nowMs - this.lastKillAt < 55) return;
        this.lastKillAt = nowMs;
        // Satisfying enemy defeat thud + crisp twin gold-coin bounty chime!
        this.playTone(155 * jitter, 64, 0.08, 'triangle', 0.06, 0, microPan, 0.2);
        this.playModalRing(2637.02 * (0.98 + Math.random() * 0.04), 0.2, 0.044, 18, 'sine', 0.015, microPan, 0.38);
        this.playModalRing(3520.0 * (0.98 + Math.random() * 0.04), 0.24, 0.038, 18, 'sine', 0.062, microPan * 0.6, 0.42);
        break;
      }

      case 'upgrade': {
        // Blacksmith hammer-on-anvil chime + ascending D Major heroic lute triad (D4 -> F#4 -> A4)
        this.playModalRing(1318.5, 0.22, 0.055, 16, 'triangle', 0, -0.12, 0.38);
        this.playModalRing(2793.8, 0.18, 0.032, 18, 'sine', 0.005, 0.12, 0.4);
        this.playTone(293.66, 293.66, 0.2, 'triangle', 0.075, 0.0, -0.15, 0.34);
        this.playTone(369.99, 369.99, 0.22, 'triangle', 0.075, 0.075, 0.0, 0.36);
        this.playTone(440.0, 440.0, 0.3, 'triangle', 0.082, 0.15, 0.15, 0.4);
        break;
      }

      case 'evolve': {
        // Grand Age Ascension: resonant Guild Bell + rising golden harp & heroic brass chord!
        this.music.duck(0.68, 0.35, 0.45);
        this.playModalRing(587.33, 1.25, 0.085, 18, 'sine', 0, -0.15, 0.55);
        this.playModalRing(1174.66, 0.95, 0.045, 20, 'sine', 0.01, 0.15, 0.55);
        // Ascending golden harp arpeggio (D4 -> F#4 -> A4 -> D5 -> F#5)
        [293.66, 369.99, 440.0, 587.33, 739.99].forEach((freq, i) => {
          this.playTone(freq, freq, 0.52, 'triangle', 0.078, i * 0.065, -0.3 + i * 0.15, 0.46, 0.006);
        });
        // Warm heroic brass swell
        this.playWarhornVoice(293.66, 293.66, 0.65, 0.08, 0.18, 0, 0.52, 4.0);
        this.playWarhornVoice(440.0, 440.0, 0.62, 0.068, 0.22, 0.18, 0.52, 4.2);
        break;
      }

      case 'victory': {
        this.stopVibration();
        this.ensureContext();
        this.setMusicMode('victory');
        break;
      }

      case 'defeat': {
        this.stopVibration();
        this.ensureContext();
        this.setMusicMode('defeat');
        break;
      }

      case 'wave_warn': {
        this.playWaveWarhorn();
        break;
      }

      case 'wave_drum': {
        this.playTone(96 * jitter, 36, 0.26, 'sine', 0.16, 0, 0, 0.34);
        this.playTone(62 * jitter, 30, 0.24, 'triangle', 0.11, 0.055, 0, 0.34);
        this.playFilteredNoise(0.05, 'bandpass', 420, 150, 1.5, 0.07, 0, 0, true, 0.28);
        break;
      }

      case 'giant_stomp': {
        this.playGiantEntrance();
        break;
      }

      case 'giant_slam': {
        this.playGiantSlam();
        break;
      }

      case 'charge': {
        // Electrifying Cavalry Herald Bugle Call (D4 -> A4 -> D5 -> F#5) + snappy field snare roll!
        this.music.duck(0.68, 0.35, 0.4);
        this.playWarhornVoice(293.66, 293.66, 0.18, 0.095, 0.0, -0.1, 0.48, 4.8);
        this.playWarhornVoice(440.0, 440.0, 0.18, 0.1, 0.14, 0.05, 0.5, 5.0);
        this.playWarhornVoice(587.33, 587.33, 0.22, 0.11, 0.28, -0.05, 0.52, 5.4);
        this.playWarhornVoice(739.99, 739.99, 0.46, 0.115, 0.44, 0.08, 0.56, 5.6);
        // Snappy marching snare roll
        [0, 0.065, 0.13, 0.195, 0.28, 0.44].forEach((d, idx) => {
          this.playFilteredNoise(
            idx === 5 ? 0.14 : 0.07,
            'bandpass',
            2100,
            1600,
            1.2,
            idx === 5 ? 0.085 : 0.048,
            d,
            0.18,
            false,
            0.3
          );
        });
        break;
      }
    }
  }
}

export const gameAudio = new SoundController();

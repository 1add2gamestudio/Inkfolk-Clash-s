import type { BattleSoundEvent } from './engine';

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

class SoundController {
  private ctx: AudioContext | null = null;
  private masterOut: AudioNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private soundEnabled = true;
  private hapticsEnabled = true;
  private lastHitAt = 0;
  private hasVibrated = false;

  setPreferences(sound: boolean, haptics: boolean): void {
    this.soundEnabled = sound;
    this.hapticsEnabled = haptics;
  }

  private ensureContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Soft dynamics compressor keeps overlapping steel clashes, drums & shouts clean and clip-free
      if (typeof this.ctx.createDynamicsCompressor === 'function') {
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-14, this.ctx.currentTime);
        comp.knee.setValueAtTime(18, this.ctx.currentTime);
        comp.ratio.setValueAtTime(4, this.ctx.currentTime);
        comp.attack.setValueAtTime(0.004, this.ctx.currentTime);
        comp.release.setValueAtTime(0.14, this.ctx.currentTime);
        comp.connect(this.ctx.destination);
        this.masterOut = comp;
      } else {
        this.masterOut = this.ctx.destination;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext, pan = 0): AudioNode {
    const dest = this.masterOut ?? ctx.destination;
    if (Math.abs(pan) > 0.02 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.75, Math.min(0.75, pan)), ctx.currentTime);
      panner.connect(dest);
      return panner;
    }
    return dest;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
    pan = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);

    gain.gain.setValueAtTime(Math.max(0.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx, pan));
    osc.start(now);
    osc.stop(now + duration + 0.015);
  }

  private playFilteredNoise(
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    q: number,
    volume: number,
    delay = 0,
    pan = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freqEnd), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx, pan));
    src.start(now);
    src.stop(now + duration + 0.015);
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

  /**
   * Procedural battle atmosphere synthesizer driven by useBattleCollisionAudio.
   * Renders stereo-panned clashing steel, rhythmic tug-of-war drums, and formant warcries.
   */
  playBattleCollisionSfx(payload: RandomizedBattleSfxPayload): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const { category, variant, pan, intensity, pitchScale } = payload;
    const vol = 0.55 + Math.max(0, Math.min(1, intensity)) * 0.45;

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
    if (variant === 'parry_ring') {
      // Crisp high-carbon blade parry: bright inharmonic metallic partials + quick spark transient
      this.playFilteredNoise(0.045, 'highpass', 3200 * pitch, 5400 * pitch, 2.2, 0.055 * vol, 0, pan);
      this.playTone(1480 * pitch, 1410 * pitch, 0.14, 'triangle', 0.032 * vol, 0, pan);
      this.playTone(2710 * pitch, 2630 * pitch, 0.11, 'sine', 0.024 * vol, 0.004, pan);
      this.playTone(4120 * pitch, 3980 * pitch, 0.08, 'sine', 0.016 * vol, 0.006, pan);
    } else if (variant === 'blade_scrape') {
      // Sliding steel edge-on-edge rasp
      this.playFilteredNoise(0.11, 'bandpass', 2400 * pitch, 4600 * pitch, 5.0, 0.065 * vol, 0, pan);
      this.playTone(1860 * pitch, 2320 * pitch, 0.09, 'sawtooth', 0.018 * vol, 0.01, pan);
      this.playTone(3180 * pitch, 2940 * pitch, 0.09, 'sine', 0.018 * vol, 0.015, pan);
    } else if (variant === 'broad_clang') {
      // Heavy iron broadsword/halberd impact with lower metallic body
      this.playFilteredNoise(0.06, 'bandpass', 1800 * pitch, 950 * pitch, 1.8, 0.075 * vol, 0, pan);
      this.playTone(620 * pitch, 490 * pitch, 0.16, 'triangle', 0.042 * vol, 0, pan);
      this.playTone(1190 * pitch, 1080 * pitch, 0.14, 'square', 0.018 * vol, 0.004, pan);
      this.playTone(2340 * pitch, 2190 * pitch, 0.12, 'sine', 0.022 * vol, 0.008, pan);
    } else {
      // shield_brace: woody thud + iron rim rattle
      this.playTone(215 * pitch, 92 * pitch, 0.095, 'triangle', 0.068 * vol, 0, pan);
      this.playFilteredNoise(0.055, 'bandpass', 1350 * pitch, 780 * pitch, 2.4, 0.06 * vol, 0, pan);
      this.playTone(1340 * pitch, 1210 * pitch, 0.08, 'sine', 0.02 * vol, 0.008, pan);
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
      // Resonant membrane body
      this.playTone(118 * f, 44 * f, 0.21, 'triangle', 0.11 * vol * gainMult, delay, pan * 0.45);
      this.playTone(74 * f, 36 * f, 0.24, 'sine', 0.095 * vol * gainMult, delay + 0.006, pan * 0.45);
      // Leather stick attack transient
      this.playFilteredNoise(
        0.04,
        'bandpass',
        420 * f,
        160 * f,
        1.5,
        0.052 * vol * gainMult,
        delay,
        pan * 0.45
      );
    };

    if (variant === 'taiko_thump') {
      hitDrum(0, 1.0, 0.96);
    } else if (variant === 'double_flam') {
      // Quick grace-note + thunderous downbeat
      hitDrum(0, 0.62, 1.12);
      hitDrum(0.075, 1.05, 0.92);
    } else {
      // march_cadence: tight rhythmic tug-of-war 1-2 beat
      hitDrum(0, 0.82, 1.04);
      hitDrum(0.16, 0.96, 0.88);
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
    const out = this.getOutputNode(ctx, pan);

    // Stylized vocal formant synthesizer (glottal sawtooth -> dual vowel bandpass formants)
    const spec =
      variant === 'rally_cry'
        ? { f0Start: 205, f0Peak: 268, f0End: 195, f1: 760, f2: 1480, dur: 0.27, gain: 0.068 }
        : variant === 'charge_hey'
          ? { f0Start: 235, f0Peak: 285, f0End: 175, f1: 680, f2: 1780, dur: 0.21, gain: 0.064 }
          : variant === 'grunt_effort'
            ? { f0Start: 148, f0Peak: 162, f0End: 108, f1: 580, f2: 1180, dur: 0.16, gain: 0.07 }
            : { f0Start: 96, f0Peak: 118, f0End: 68, f1: 420, f2: 920, dur: 0.36, gain: 0.095 }; // giant_roar

    const osc = ctx.createOscillator();
    osc.type = variant === 'giant_roar' ? 'sawtooth' : 'sawtooth';
    osc.frequency.setValueAtTime(spec.f0Start * pitch, now);
    osc.frequency.linearRampToValueAtTime(spec.f0Peak * pitch, now + spec.dur * 0.32);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45, spec.f0End * pitch), now + spec.dur);

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(spec.f1 * (0.94 + pitch * 0.06), now);
    f1.Q.setValueAtTime(variant === 'giant_roar' ? 3.2 : 4.2, now);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(spec.f2 * (0.94 + pitch * 0.06), now);
    f2.Q.setValueAtTime(4.8, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(spec.gain * vol, now + 0.028);
    env.gain.setValueAtTime(spec.gain * vol * 0.82, now + spec.dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.001, now + spec.dur);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(env);
    f2.connect(env);
    env.connect(out);

    osc.start(now);
    osc.stop(now + spec.dur + 0.02);

    // Subtle vocal breath aspiration layer for organic grit
    this.playFilteredNoise(
      spec.dur * 0.85,
      'bandpass',
      spec.f2 * 0.9,
      spec.f1 * 0.85,
      2.6,
      0.026 * vol,
      0.01,
      pan
    );
  }

  trigger(ev: BattleSoundEvent): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pitchJitter = 0.94 + Math.random() * 0.12;

    switch (ev) {
      case 'summon':
        this.playTone(210 * pitchJitter, 130, 0.08, 'triangle', 0.08);
        break;
      case 'hit_light':
        if (nowMs - this.lastHitAt < 45) return;
        this.lastHitAt = nowMs;
        this.playTone(170 * pitchJitter, 85, 0.055, 'square', 0.035);
        break;
      case 'hit_heavy':
        if (nowMs - this.lastHitAt < 40) return;
        this.lastHitAt = nowMs;
        this.playTone(125 * pitchJitter, 48, 0.11, 'sawtooth', 0.07);
        break;
      case 'kill':
        this.playTone(540 * pitchJitter, 760, 0.09, 'sine', 0.05);
        break;
      case 'upgrade':
        this.playTone(392, 523.25, 0.12, 'triangle', 0.09);
        this.playTone(523.25, 659.25, 0.14, 'triangle', 0.08, 0.08);
        break;
      case 'evolve':
        this.playTone(330, 440, 0.14, 'triangle', 0.1);
        this.playTone(440, 659, 0.16, 'triangle', 0.1, 0.1);
        this.playTone(659, 880, 0.24, 'sine', 0.1, 0.2);
        break;
      case 'victory':
        this.stopVibration();
        this.playTone(392, 392, 0.14, 'triangle', 0.1);
        this.playTone(493.88, 493.88, 0.14, 'triangle', 0.1, 0.12);
        this.playTone(587.33, 783.99, 0.34, 'triangle', 0.12, 0.24);
        break;
      case 'defeat':
        this.stopVibration();
        this.playTone(260, 196, 0.18, 'sawtooth', 0.08);
        this.playTone(196, 130, 0.34, 'sawtooth', 0.08, 0.16);
        break;
      case 'wave_warn':
        this.playTone(146, 110, 0.36, 'sawtooth', 0.09);
        this.playTone(96, 50, 0.28, 'triangle', 0.12, 0.08);
        this.playTone(164, 112, 0.44, 'sawtooth', 0.085, 0.28);
        // Only time mobile vibration motor fires: moderate half-duration pre-wave alert (~1.4s)
        this.vibrate([105, 85, 115, 85, 125, 85, 115, 85, 105, 85, 90]);
        break;
      case 'wave_drum':
        this.playTone(92, 38, 0.22, 'triangle', 0.14);
        this.playTone(60, 32, 0.19, 'sine', 0.12, 0.07);
        break;
      case 'giant_stomp':
        // Heavy hydraulic mech footstep + metallic servo clank
        this.playTone(76, 34, 0.24, 'triangle', 0.14);
        this.playTone(54, 30, 0.22, 'sine', 0.12, 0.05);
        this.playFilteredNoise(0.06, 'bandpass', 1450, 620, 2.6, 0.055, 0.015);
        break;
      case 'giant_slam':
        // Seismic mech greatsword/crusher slam + heavy bronze-iron clang
        this.playTone(108, 36, 0.24, 'sawtooth', 0.11);
        this.playTone(68, 30, 0.3, 'triangle', 0.14, 0.03);
        this.playTone(580 * pitchJitter, 420, 0.16, 'triangle', 0.045, 0.01);
        this.playFilteredNoise(0.08, 'bandpass', 1900, 750, 2.2, 0.075, 0.01);
        break;
      case 'charge':
        this.playTone(392, 523.25, 0.14, 'triangle', 0.09);
        this.playTone(523.25, 659.25, 0.16, 'triangle', 0.09, 0.11);
        this.playTone(659.25, 783.99, 0.26, 'sine', 0.1, 0.22);
        break;
    }
  }
}

export const gameAudio = new SoundController();

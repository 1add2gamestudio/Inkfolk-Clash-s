/**
 * Inkfolk Clash — Adaptive Medieval-Clockwork Orchestral Music Engine
 *
 * Pure Web Audio API procedural soundtrack & fanfare composer:
 * - Key Center: D Dorian (battle / title / elegy) & D Major (victory triumph)
 * - Acoustic palette: Celtic Harp / Medieval Lute, French War Horn, Chamber Bowed Strings,
 *   Storybook Wooden Flute, Tuned Timpani, Marching Field Snare, Bodhrán & Guild Bells
 * - Sample-accurate look-ahead scheduler (zero JS timer jitter)
 */

export type MusicMode = 'silent' | 'title' | 'battle' | 'paused' | 'victory' | 'defeat';

export interface BattleMusicContext {
  /** Normalized combat energy 0..1 */
  intensity: number;
  /** Player evolution age 0..4 (Stone -> Starlight) */
  ageIndex: number;
  /** True during pre-wave storm warning */
  waveWarning: boolean;
  /** True after all waves are cleared & Final Charge triggers */
  finalCharge: boolean;
  /** True while any Colossus / Giant is active on the field */
  bossPresent: boolean;
  /** 1x or 2x battle speed */
  speedMultiplier: 1 | 2;
}

export interface MusicRouter {
  ctx: AudioContext;
  musicDry: GainNode;
  musicWet: GainNode;
  whiteNoise: AudioBuffer;
  pinkNoise: AudioBuffer;
}

// MIDI note number to Hz (A4 = 69 -> 440Hz)
function midi(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Named MIDI constants for readable musical composition
const N = {
  A1: 33, Bb1: 34, B1: 35, C2: 36, D2: 38, E2: 40, F2: 41, G2: 43, A2: 45, Bb2: 46, B2: 47,
  C3: 48, Cs3: 49, D3: 50, E3: 52, F3: 53, Fs3: 54, G3: 55, A3: 57, Bb3: 58, B3: 59,
  C4: 60, Cs4: 61, D4: 62, E4: 64, F4: 65, Fs4: 66, G4: 67, A4: 69, Bb4: 70, B4: 71,
  C5: 72, Cs5: 73, D5: 74, E5: 76, F5: 77, Fs5: 78, G5: 79, A5: 81, Bb5: 82, B5: 83,
  C6: 84, D6: 86,
} as const;

interface ScheduledTone {
  step: number; // 16th-note step inside phrase (0..63 or 0..127)
  note: number; // MIDI note
  durSteps: number; // Duration in 16th notes
  vel?: number; // Velocity 0..1
}

// ---------------------------------------------------------------------------
// TITLE THEME: "Chronicle of Ink & Stone" — D Dorian, 92 BPM, 8 bars (64 eighth-steps, 128 16ths)
// Warm tavern/storybook lute arpeggios, cello drone, expressive wooden flute melody
// ---------------------------------------------------------------------------
const TITLE_CHORDS: Array<{ bass: number; arp: number[]; pad: number[] }> = [
  // Bar 0: Dm9
  { bass: N.D2, arp: [N.D3, N.A3, N.E4, N.F4, N.A4, N.F4, N.E4, N.A3], pad: [N.D3, N.A3, N.F4] },
  // Bar 1: Cmaj7 / C
  { bass: N.C2, arp: [N.C3, N.G3, N.D4, N.E4, N.G4, N.E4, N.D4, N.G3], pad: [N.C3, N.G3, N.E4] },
  // Bar 2: G/B (Dorian raised 6th!)
  { bass: N.B1, arp: [N.B2, N.G3, N.D4, N.G4, N.B4, N.G4, N.D4, N.G3], pad: [N.B2, N.G3, N.D4] },
  // Bar 3: Asus4 -> A7sus
  { bass: N.A1, arp: [N.A2, N.E3, N.A3, N.D4, N.E4, N.D4, N.C4, N.E3], pad: [N.A2, N.E3, N.D4] },
  // Bar 4: Dm9
  { bass: N.D2, arp: [N.D3, N.A3, N.F4, N.E4, N.A4, N.F4, N.D4, N.A3], pad: [N.D3, N.A3, N.F4] },
  // Bar 5: Fmaj7
  { bass: N.F2, arp: [N.F3, N.C4, N.E4, N.A4, N.G4, N.E4, N.C4, N.A3], pad: [N.F3, N.C4, N.A4] },
  // Bar 6: G (Dorian bright lift)
  { bass: N.G2, arp: [N.G3, N.B3, N.D4, N.G4, N.A4, N.G4, N.D4, N.B3], pad: [N.G3, N.D4, N.B4] },
  // Bar 7: C -> A (turnaround)
  { bass: N.A1, arp: [N.A2, N.E3, N.G3, N.C4, N.E4, N.D4, N.C4, N.A3], pad: [N.A2, N.E3, N.C4] },
];

const TITLE_FLUTE_MELODY: ScheduledTone[] = [
  // Phrase 1 (Bars 0-3): Noble nostalgic medieval motif
  { step: 0, note: N.A4, durSteps: 6, vel: 0.72 },
  { step: 6, note: N.G4, durSteps: 2, vel: 0.62 },
  { step: 8, note: N.F4, durSteps: 4, vel: 0.7 },
  { step: 12, note: N.E4, durSteps: 4, vel: 0.65 },
  { step: 16, note: N.G4, durSteps: 6, vel: 0.74 },
  { step: 22, note: N.E4, durSteps: 2, vel: 0.6 },
  { step: 24, note: N.D4, durSteps: 6, vel: 0.68 },
  { step: 32, note: N.D4, durSteps: 4, vel: 0.64 },
  { step: 36, note: N.G4, durSteps: 4, vel: 0.74 },
  { step: 40, note: N.B4, durSteps: 6, vel: 0.8 },
  { step: 46, note: N.A4, durSteps: 2, vel: 0.68 },
  { step: 48, note: N.A4, durSteps: 10, vel: 0.72 },
  // Phrase 2 (Bars 4-7): Soaring storybook answer
  { step: 64, note: N.A4, durSteps: 4, vel: 0.74 },
  { step: 68, note: N.C5, durSteps: 4, vel: 0.78 },
  { step: 72, note: N.D5, durSteps: 6, vel: 0.84 },
  { step: 78, note: N.C5, durSteps: 2, vel: 0.72 },
  { step: 80, note: N.A4, durSteps: 6, vel: 0.76 },
  { step: 86, note: N.G4, durSteps: 2, vel: 0.66 },
  { step: 88, note: N.F4, durSteps: 6, vel: 0.72 },
  { step: 96, note: N.G4, durSteps: 4, vel: 0.75 },
  { step: 100, note: N.B4, durSteps: 4, vel: 0.82 },
  { step: 104, note: N.A4, durSteps: 4, vel: 0.78 },
  { step: 108, note: N.G4, durSteps: 4, vel: 0.72 },
  { step: 112, note: N.E4, durSteps: 6, vel: 0.66 },
  { step: 118, note: N.D4, durSteps: 8, vel: 0.62 },
];

// ---------------------------------------------------------------------------
// BATTLE THEME: "March of the Inkfolk" — D Dorian, 118 BPM, 16 bars (256 16th steps)
// Section A (Bars 0-7): Driving tactical medieval march
// Section B (Bars 8-15): Soaring heroic tug-of-war anthem
// ---------------------------------------------------------------------------
interface BattleBarSpec {
  bass: number;
  fifth: number;
  chord: number[];
  ostinato: number[]; // 8 eighth-note lute plucks
}

const BATTLE_BARS: BattleBarSpec[] = [
  // Section A — Bars 0-3: Dm -> Dm -> Bb -> C
  { bass: N.D2, fifth: N.A2, chord: [N.D3, N.A3, N.F4], ostinato: [N.D3, N.A3, N.D4, N.F4, N.D4, N.A3, N.E4, N.A3] },
  { bass: N.D2, fifth: N.A2, chord: [N.D3, N.A3, N.E4], ostinato: [N.D3, N.A3, N.D4, N.E4, N.F4, N.E4, N.D4, N.A3] },
  { bass: N.Bb1, fifth: N.F2, chord: [N.Bb2, N.F3, N.D4], ostinato: [N.Bb2, N.F3, N.Bb3, N.D4, N.F4, N.D4, N.Bb3, N.F3] },
  { bass: N.C2, fifth: N.G2, chord: [N.C3, N.G3, N.E4], ostinato: [N.C3, N.G3, N.C4, N.E4, N.G4, N.E4, N.C4, N.G3] },
  // Section A — Bars 4-7: Dm -> F -> G(Dorian!) -> A
  { bass: N.D2, fifth: N.A2, chord: [N.D3, N.A3, N.F4], ostinato: [N.D3, N.A3, N.D4, N.F4, N.A4, N.F4, N.D4, N.A3] },
  { bass: N.F2, fifth: N.C3, chord: [N.F3, N.C4, N.A4], ostinato: [N.F3, N.C4, N.F4, N.A4, N.G4, N.F4, N.C4, N.A3] },
  { bass: N.G2, fifth: N.D3, chord: [N.G3, N.B3, N.D4], ostinato: [N.G3, N.B3, N.D4, N.G4, N.B4, N.G4, N.D4, N.B3] },
  { bass: N.A2, fifth: N.E3, chord: [N.A2, N.E3, N.A3], ostinato: [N.A2, N.E3, N.A3, N.C4, N.E4, N.D4, N.C4, N.E3] },
  // Section B — Bars 8-11: Heroic lift Bb -> C -> Dm -> A/C#
  { bass: N.Bb1, fifth: N.F2, chord: [N.Bb2, N.F3, N.D4], ostinato: [N.Bb2, N.F3, N.D4, N.F4, N.Bb4, N.F4, N.D4, N.F3] },
  { bass: N.C2, fifth: N.G2, chord: [N.C3, N.G3, N.E4], ostinato: [N.C3, N.G3, N.E4, N.G4, N.C5, N.G4, N.E4, N.G3] },
  { bass: N.D2, fifth: N.A2, chord: [N.D3, N.A3, N.F4], ostinato: [N.D3, N.A3, N.F4, N.A4, N.D5, N.A4, N.F4, N.A3] },
  { bass: N.A1, fifth: N.E2, chord: [N.A2, N.E3, N.Cs4], ostinato: [N.A2, N.E3, N.A3, N.Cs4, N.E4, N.Cs4, N.A3, N.E3] },
  // Section B — Bars 12-15: Climax Bb -> C -> Gm -> A7sus/A
  { bass: N.Bb1, fifth: N.F2, chord: [N.Bb2, N.F3, N.D4], ostinato: [N.Bb2, N.F3, N.D4, N.F4, N.D4, N.Bb3, N.F3, N.D4] },
  { bass: N.C2, fifth: N.G2, chord: [N.C3, N.G3, N.E4], ostinato: [N.C3, N.G3, N.E4, N.G4, N.E4, N.C4, N.G3, N.E4] },
  { bass: N.G2, fifth: N.D3, chord: [N.G3, N.Bb3, N.D4], ostinato: [N.G3, N.Bb3, N.D4, N.G4, N.F4, N.D4, N.Bb3, N.G3] },
  { bass: N.A1, fifth: N.E2, chord: [N.A2, N.E3, N.A3], ostinato: [N.A2, N.E3, N.A3, N.E4, N.G4, N.E4, N.Cs4, N.A3] },
];

// Heroic Brass / Horn Lead Melody across the 16-bar battle loop (256 16th steps)
const BATTLE_HERO_MELODY: ScheduledTone[] = [
  // Section A (Bars 0-7): Bold rhythmic march call
  { step: 0, note: N.D4, durSteps: 6, vel: 0.85 },
  { step: 6, note: N.F4, durSteps: 2, vel: 0.78 },
  { step: 8, note: N.A4, durSteps: 4, vel: 0.92 },
  { step: 12, note: N.G4, durSteps: 4, vel: 0.82 },
  { step: 16, note: N.F4, durSteps: 6, vel: 0.84 },
  { step: 22, note: N.E4, durSteps: 2, vel: 0.76 },
  { step: 24, note: N.D4, durSteps: 6, vel: 0.82 },
  { step: 32, note: N.D4, durSteps: 4, vel: 0.84 },
  { step: 36, note: N.F4, durSteps: 4, vel: 0.88 },
  { step: 40, note: N.G4, durSteps: 6, vel: 0.9 },
  { step: 46, note: N.F4, durSteps: 2, vel: 0.8 },
  { step: 48, note: N.E4, durSteps: 6, vel: 0.86 },
  { step: 54, note: N.G4, durSteps: 6, vel: 0.88 },
  { step: 60, note: N.E4, durSteps: 4, vel: 0.82 },

  { step: 64, note: N.D4, durSteps: 4, vel: 0.86 },
  { step: 68, note: N.A4, durSteps: 4, vel: 0.94 },
  { step: 72, note: N.C5, durSteps: 6, vel: 0.96 },
  { step: 78, note: N.A4, durSteps: 2, vel: 0.84 },
  { step: 80, note: N.A4, durSteps: 6, vel: 0.9 },
  { step: 86, note: N.G4, durSteps: 2, vel: 0.82 },
  { step: 88, note: N.F4, durSteps: 6, vel: 0.86 },
  { step: 96, note: N.G4, durSteps: 4, vel: 0.88 },
  { step: 100, note: N.B4, durSteps: 6, vel: 0.95 }, // Dorian hero lift!
  { step: 106, note: N.A4, durSteps: 2, vel: 0.86 },
  { step: 108, note: N.G4, durSteps: 4, vel: 0.86 },
  { step: 112, note: N.A4, durSteps: 12, vel: 0.94 },

  // Section B (Bars 8-15): Triumphant soaring chorus
  { step: 128, note: N.Bb4, durSteps: 6, vel: 0.96 },
  { step: 134, note: N.A4, durSteps: 2, vel: 0.86 },
  { step: 136, note: N.F4, durSteps: 4, vel: 0.88 },
  { step: 140, note: N.Bb4, durSteps: 4, vel: 0.92 },
  { step: 144, note: N.C5, durSteps: 6, vel: 0.98 },
  { step: 150, note: N.Bb4, durSteps: 2, vel: 0.86 },
  { step: 152, note: N.G4, durSteps: 4, vel: 0.88 },
  { step: 156, note: N.C5, durSteps: 4, vel: 0.94 },
  { step: 160, note: N.D5, durSteps: 8, vel: 1.0 },
  { step: 168, note: N.C5, durSteps: 4, vel: 0.92 },
  { step: 172, note: N.A4, durSteps: 4, vel: 0.9 },
  { step: 176, note: N.A4, durSteps: 6, vel: 0.92 },
  { step: 182, note: N.G4, durSteps: 2, vel: 0.84 },
  { step: 184, note: N.E4, durSteps: 6, vel: 0.86 },

  { step: 192, note: N.F4, durSteps: 4, vel: 0.9 },
  { step: 196, note: N.A4, durSteps: 4, vel: 0.94 },
  { step: 200, note: N.Bb4, durSteps: 6, vel: 0.96 },
  { step: 206, note: N.A4, durSteps: 2, vel: 0.88 },
  { step: 208, note: N.G4, durSteps: 4, vel: 0.92 },
  { step: 212, note: N.C5, durSteps: 6, vel: 0.98 },
  { step: 218, note: N.Bb4, durSteps: 2, vel: 0.88 },
  { step: 220, note: N.A4, durSteps: 4, vel: 0.9 },
  { step: 224, note: N.G4, durSteps: 6, vel: 0.9 },
  { step: 230, note: N.F4, durSteps: 2, vel: 0.84 },
  { step: 232, note: N.G4, durSteps: 4, vel: 0.88 },
  { step: 236, note: N.A4, durSteps: 4, vel: 0.94 },
  { step: 240, note: N.A4, durSteps: 10, vel: 0.96 },
  { step: 250, note: N.G4, durSteps: 3, vel: 0.84 },
  { step: 253, note: N.E4, durSteps: 3, vel: 0.82 },
];

export class MusicComposer {
  private router: MusicRouter | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private volumeNode: GainNode | null = null;
  private duckNode: GainNode | null = null;
  private wetSendNode: GainNode | null = null;

  private mode: MusicMode = 'silent';
  private enabled = true;
  private timerId: number | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private phraseCycle = 0;
  private activeModeToken = 0;

  private battleCtx: BattleMusicContext = {
    intensity: 0.3,
    ageIndex: 0,
    waveWarning: false,
    finalCharge: false,
    bossPresent: false,
    speedMultiplier: 1,
  };

  attach(router: MusicRouter): void {
    if (this.router && this.router.ctx === router.ctx) return;
    this.router = router;

    const { ctx, musicDry, musicWet } = router;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(16000, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);

    const volume = ctx.createGain();
    volume.gain.setValueAtTime(0.0001, ctx.currentTime);

    const duck = ctx.createGain();
    duck.gain.setValueAtTime(1.0, ctx.currentTime);

    const wetSend = ctx.createGain();
    wetSend.gain.setValueAtTime(0.42, ctx.currentTime);

    // Chain: instruments -> filter -> volume -> duck -> dry & wetSend
    filter.connect(volume);
    volume.connect(duck);
    duck.connect(musicDry);
    duck.connect(wetSend);
    wetSend.connect(musicWet);

    this.filterNode = filter;
    this.volumeNode = volume;
    this.duckNode = duck;
    this.wetSendNode = wetSend;

    // Apply queued mode if sound is enabled
    if (this.enabled && (this.mode === 'title' || this.mode === 'battle' || this.mode === 'paused')) {
      this.applyLoopState();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopScheduler();
      if (this.router && this.volumeNode) {
        const now = this.router.ctx.currentTime;
        this.volumeNode.gain.cancelScheduledValues(now);
        this.volumeNode.gain.setTargetAtTime(0.0001, now, 0.05);
      }
    } else if (this.router) {
      if (this.mode === 'title' || this.mode === 'battle' || this.mode === 'paused') {
        this.applyLoopState();
      }
    }
  }

  updateBattleContext(partial: Partial<BattleMusicContext>): void {
    this.battleCtx = { ...this.battleCtx, ...partial };
  }

  /**
   * Momentarily ducks background music so huge cinematic events (Colossus stomp, Wave warhorn)
   * command the soundstage cleanly without muddying the mix.
   */
  duck(depth = 0.55, holdSec = 0.35, releaseSec = 0.55): void {
    if (!this.router || !this.duckNode) return;
    const now = this.router.ctx.currentTime;
    const g = this.duckNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.15, g.value), now);
    g.linearRampToValueAtTime(Math.max(0.15, Math.min(1, depth)), now + 0.04);
    g.setValueAtTime(Math.max(0.15, Math.min(1, depth)), now + 0.04 + holdSec);
    g.linearRampToValueAtTime(1.0, now + 0.04 + holdSec + releaseSec);
  }

  setMode(nextMode: MusicMode): void {
    if (nextMode === this.mode && (nextMode !== 'victory' && nextMode !== 'defeat')) {
      return;
    }
    const prevMode = this.mode;
    this.mode = nextMode;
    this.activeModeToken++;

    if (!this.router || !this.enabled) return;

    if (nextMode === 'silent') {
      this.stopScheduler();
      this.fadeVolume(0.0001, 0.14);
      return;
    }

    if (nextMode === 'paused') {
      // Warm muffled stone-hall pause ambiance instead of abrupt silence
      this.fadeFilter(720, 0.12);
      this.fadeVolume(0.28, 0.12);
      if (this.timerId === null) {
        this.startScheduler();
      }
      return;
    }

    if (nextMode === 'title' || nextMode === 'battle') {
      this.fadeFilter(16500, 0.18);
      this.fadeVolume(nextMode === 'title' ? 0.82 : 0.92, 0.28);
      // Reset phrase neatly when switching between title & battle (keep position when resuming from pause)
      if (prevMode !== 'paused' && prevMode !== nextMode) {
        this.currentStep = 0;
        this.phraseCycle = 0;
        this.nextNoteTime = this.router.ctx.currentTime + 0.08;
      }
      if (this.timerId === null) {
        this.startScheduler();
      }
      return;
    }

    if (nextMode === 'victory') {
      this.stopScheduler();
      this.fadeFilter(16500, 0.04);
      this.fadeVolume(0.0001, 0.09);
      this.playVictoryFanfare();
      return;
    }

    if (nextMode === 'defeat') {
      this.stopScheduler();
      this.fadeFilter(14000, 0.04);
      this.fadeVolume(0.0001, 0.09);
      this.playDefeatRequiem();
      return;
    }
  }

  private applyLoopState(): void {
    if (!this.router || !this.enabled) return;
    if (this.mode === 'paused') {
      this.fadeFilter(720, 0.1);
      this.fadeVolume(0.28, 0.1);
      this.startScheduler();
    } else if (this.mode === 'title' || this.mode === 'battle') {
      this.fadeFilter(16500, 0.16);
      this.fadeVolume(this.mode === 'title' ? 0.82 : 0.92, 0.25);
      this.startScheduler();
    }
  }

  private fadeVolume(target: number, timeConst: number): void {
    if (!this.router || !this.volumeNode) return;
    const now = this.router.ctx.currentTime;
    this.volumeNode.gain.cancelScheduledValues(now);
    this.volumeNode.gain.setTargetAtTime(Math.max(0.0001, target), now, timeConst);
  }

  private fadeFilter(targetHz: number, timeConst: number): void {
    if (!this.router || !this.filterNode) return;
    const now = this.router.ctx.currentTime;
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setTargetAtTime(targetHz, now, timeConst);
  }

  private startScheduler(): void {
    if (!this.router || typeof window === 'undefined') return;
    if (this.timerId !== null) return;
    this.nextNoteTime = Math.max(this.nextNoteTime, this.router.ctx.currentTime + 0.06);
    this.timerId = window.setInterval(() => this.scheduleAhead(), 45);
  }

  private stopScheduler(): void {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private getCurrentStepDurationSec(): number {
    if (this.mode === 'title') {
      // 92 BPM -> 16th note
      return 60 / 92 / 4;
    }
    // Battle BPM gently accelerates with wave urgency, Final Charge & 2x speed feel
    let bpm = 116;
    if (this.battleCtx.waveWarning) bpm = 122;
    if (this.battleCtx.finalCharge) bpm = 128;
    if (this.battleCtx.speedMultiplier === 2) bpm += 6;
    return 60 / bpm / 4;
  }

  private scheduleAhead(): void {
    if (!this.router || !this.enabled) return;
    if (this.router.ctx.state !== 'running') return;
    if (this.mode !== 'title' && this.mode !== 'battle' && this.mode !== 'paused') return;

    const lookAheadSec = 0.16;
    const now = this.router.ctx.currentTime;
    // Guard against long background tab sleep causing massive catch-up burst
    if (this.nextNoteTime < now - 0.25) {
      this.nextNoteTime = now + 0.05;
    }

    while (this.nextNoteTime < now + lookAheadSec) {
      const stepDur = this.getCurrentStepDurationSec();
      if (this.mode === 'title') {
        this.scheduleTitleStep(this.currentStep, this.nextNoteTime, stepDur);
        this.currentStep = (this.currentStep + 1) % 128;
        if (this.currentStep === 0) this.phraseCycle++;
      } else {
        this.scheduleBattleStep(this.currentStep, this.nextNoteTime, stepDur);
        this.currentStep = (this.currentStep + 1) % 256;
        if (this.currentStep === 0) this.phraseCycle++;
      }
      this.nextNoteTime += stepDur;
    }
  }

  // -------------------------------------------------------------------------
  // TITLE STEP SCHEDULER ("Chronicle of Ink & Stone")
  // -------------------------------------------------------------------------
  private scheduleTitleStep(step: number, time: number, stepDur: number): void {
    const dest = this.filterNode;
    if (!dest) return;

    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const spec = TITLE_CHORDS[bar % TITLE_CHORDS.length];

    // 1. Lute / Celtic Harp flowing eighth-note arpeggio
    if (inBar % 2 === 0) {
      const arpIdx = inBar / 2;
      const note = spec.arp[arpIdx % spec.arp.length];
      const accent = inBar === 0 || inBar === 8 ? 1.0 : 0.72;
      const pan = arpIdx % 2 === 0 ? -0.26 : 0.26;
      this.playPluckedString(dest, midi(note), time, stepDur * 4.5, 0.085 * accent, pan, 'lute');
    }

    // 2. Warm Chamber Cello & Viola pad on bar downbeat
    if (inBar === 0) {
      this.playBowedString(dest, midi(spec.bass), time, stepDur * 16.4, 0.078, -0.15);
      // Soft upper string chord swell
      this.playBowedString(dest, midi(spec.pad[1]), time, stepDur * 15.8, 0.036, 0.2);
      if (bar % 2 === 0) {
        this.playBowedString(dest, midi(spec.pad[2]), time + stepDur * 0.5, stepDur * 14.5, 0.028, -0.22);
      }
    }

    // 3. Soft Medieval Bodhrán Frame Drum pulse (gentle heartbeat on beats 1, 2.5, 4)
    if (inBar === 0) {
      this.playWarDrum(dest, time, 0.068, 0.96, -0.05);
    } else if (inBar === 6) {
      this.playBodhranTap(dest, time, 0.038, 1.08, 0.14);
    } else if (inBar === 10) {
      this.playWarDrum(dest, time, 0.044, 1.04, -0.08);
    } else if (inBar === 14 && bar % 2 === 1) {
      this.playBodhranTap(dest, time, 0.032, 1.15, 0.16);
    }

    // 4. Storybook Wooden Flute Melody (subtle variation on alternate loops)
    for (let i = 0; i < TITLE_FLUTE_MELODY.length; i++) {
      const ev = TITLE_FLUTE_MELODY[i];
      if (ev.step === step) {
        const useWarmHorn = this.phraseCycle % 2 === 1 && bar >= 4;
        if (useWarmHorn) {
          this.playBrassHorn(dest, midi(ev.note - 12), time, stepDur * ev.durSteps, 0.072 * (ev.vel ?? 0.75), 0.1);
        } else {
          this.playFlute(dest, midi(ev.note), time, stepDur * ev.durSteps, 0.075 * (ev.vel ?? 0.75), 0.12);
        }
      }
    }

    // 5. Delicate storybook harp sparkle on phrase turnarounds
    if (step === 60 || step === 124) {
      this.playBellChime(dest, midi(N.A5), time, 1.35, 0.022, 0.35);
    }
  }

  // -------------------------------------------------------------------------
  // ADAPTIVE BATTLE STEP SCHEDULER ("March of the Inkfolk")
  // -------------------------------------------------------------------------
  private scheduleBattleStep(step: number, time: number, stepDur: number): void {
    const dest = this.filterNode;
    if (!dest) return;

    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const spec = BATTLE_BARS[bar % BATTLE_BARS.length];
    const { intensity, ageIndex, waveWarning, finalCharge, bossPresent } = this.battleCtx;
    const energy = Math.min(1, intensity + (waveWarning ? 0.3 : 0) + (finalCharge ? 0.35 : 0) + (bossPresent ? 0.2 : 0));

    // LAYER 1 (Always): Driving Medieval Lute / Harp Ostinato (8th notes)
    if (inBar % 2 === 0) {
      const idx = inBar / 2;
      const note = spec.ostinato[idx % spec.ostinato.length];
      const accent = inBar === 0 || inBar === 6 || inBar === 12 ? 1.0 : 0.72;
      const pan = idx % 2 === 0 ? -0.3 : 0.3;
      const timbre = ageIndex >= 4 ? 'harp' : 'lute';
      this.playPluckedString(dest, midi(note), time, stepDur * 2.6, 0.076 * accent, pan, timbre);
    }

    // LAYER 1B (Always): Driving Cello / Contrabass Rhythmic Pulse
    if (inBar === 0 || inBar === 8) {
      const note = inBar === 0 ? spec.bass : spec.fifth;
      this.playBowedString(dest, midi(note), time, stepDur * 7.6, 0.085, -0.14);
    } else if (inBar === 12 && energy >= 0.35) {
      this.playBowedString(dest, midi(spec.bass), time, stepDur * 3.8, 0.068, -0.14);
    }

    // LAYER 1C (Always): Tactile Medieval Marching War Drums (Taiko + Bodhrán)
    // Iconic 1-and-2-e-3-4 heroic march groove
    if (inBar === 0) {
      this.playWarDrum(dest, time, 0.11 + energy * 0.03, 0.94, 0);
    } else if (inBar === 6) {
      this.playWarDrum(dest, time, 0.075 + energy * 0.02, 1.06, -0.12);
    } else if (inBar === 8) {
      this.playWarDrum(dest, time, 0.092 + energy * 0.025, 0.98, 0.06);
    } else if (inBar === 12) {
      this.playWarDrum(dest, time, 0.08 + energy * 0.02, 1.02, -0.06);
    } else if (inBar === 14 && (energy >= 0.4 || bar % 2 === 1)) {
      this.playWarDrum(dest, time, 0.065, 1.12, 0.12);
    }

    // LAYER 2 (Skirmish & Marching Snare): Crisp Medieval Field Snare & Rim Accents
    if (energy >= 0.2 || ageIndex >= 2) {
      const snareVol = 0.036 + energy * 0.032;
      if (inBar === 4 || inBar === 12) {
        this.playFieldSnare(dest, time, snareVol, false, 0.18);
      } else if (inBar === 14 || (inBar === 15 && bar % 4 === 3)) {
        // Snappy marching drag/flam into next bar
        this.playFieldSnare(dest, time, snareVol * 0.72, true, 0.2);
      } else if ((finalCharge || waveWarning) && (inBar === 2 || inBar === 10)) {
        // Double-time charge cadence!
        this.playFieldSnare(dest, time, snareVol * 0.65, true, -0.16);
      }
    }

    // LAYER 2B (Timpani Punctuation on phrase peaks, Wave Warnings & Boss presence)
    if (inBar === 0 && (bar % 2 === 0 || waveWarning || bossPresent || finalCharge)) {
      this.playTimpani(dest, midi(spec.bass + 12), time, 0.11 + energy * 0.04, -0.2);
    } else if (waveWarning && (inBar === 4 || inBar === 8 || inBar === 12)) {
      // Heartbeat siege timpani during incoming huge wave
      this.playTimpani(dest, midi(spec.bass + 12), time, 0.095, -0.18);
    } else if (bar % 4 === 3 && (inBar === 12 || inBar === 14)) {
      this.playTimpani(dest, midi(N.A2), time, 0.09, 0.18);
    }

    // LAYER 3 (Mid-to-High Intensity): Warm Horn Harmony Pads on phrase downbeats
    if (inBar === 0 && (energy >= 0.28 || bar >= 8)) {
      this.playBrassHorn(dest, midi(spec.chord[0]), time, stepDur * 14, 0.048 + energy * 0.018, -0.26);
      this.playBrassHorn(dest, midi(spec.chord[1]), time, stepDur * 14, 0.042 + energy * 0.016, 0.26);
    }

    // LAYER 4 (Lead Melody): Heroic French Horn + Storybook Flute / Final Charge Octaves
    for (let i = 0; i < BATTLE_HERO_MELODY.length; i++) {
      const ev = BATTLE_HERO_MELODY[i];
      if (ev.step !== step) continue;

      const vel = ev.vel ?? 0.85;
      const noteDur = stepDur * ev.durSteps;

      // Always play memorable lead on Section B or when combat is engaged; during calm opening A, flute carries it softly
      if (energy >= 0.42 || bar >= 8 || bossPresent || finalCharge) {
        this.playBrassHorn(dest, midi(ev.note), time, noteDur, (0.072 + energy * 0.032) * vel, 0.08);
      } else {
        this.playFlute(dest, midi(ev.note), time, noteDur, 0.068 * vel, 0.14);
      }

      // Final Charge or High-Energy Chorus: bright upper octave flute/fife soaring above the brass!
      if ((finalCharge || (energy >= 0.72 && bar >= 8)) && ev.durSteps >= 4) {
        this.playFlute(dest, midi(ev.note + 12), time, noteDur * 0.92, 0.048 * vel, -0.18);
      }
    }

    // LAYER 5 (Age V Starlight Kin / Age III-IV Clockwork Accent)
    if (ageIndex >= 4 && (inBar === 0 || inBar === 10)) {
      const shimmerNote = inBar === 0 ? spec.chord[2] + 12 : spec.chord[1] + 12;
      this.playBellChime(dest, midi(shimmerNote), time, 1.1, 0.022, inBar === 0 ? -0.35 : 0.35);
    } else if (ageIndex >= 2 && ageIndex <= 3 && inBar === 4 && bar % 2 === 1) {
      // Subtle clockwork brass tick/rim accent
      this.playBodhranTap(dest, time, 0.028, 1.45, 0.28);
    }
  }

  // -------------------------------------------------------------------------
  // VICTORY MUSIC: "Banner at Dawn" (~4.8s heroic orchestral fanfare in D Major)
  // Chord progression: D (I) -> Bb (bVI) -> C (bVII) -> D (I)
  // -------------------------------------------------------------------------
  playVictoryFanfare(): void {
    if (!this.router || !this.enabled) return;
    const { ctx, musicDry, musicWet } = this.router;
    const now = ctx.currentTime + 0.04;

    // Dedicated cue bus so it isn't affected by BGM loop fade-out
    const cueBus = ctx.createGain();
    cueBus.gain.setValueAtTime(1.0, now);
    const cueWet = ctx.createGain();
    cueWet.gain.setValueAtTime(0.46, now);
    cueBus.connect(musicDry);
    cueBus.connect(cueWet);
    cueWet.connect(musicWet);

    // 1. Dramatic Timpani Roll-Up & Cymbal Swell into Downbeat (0.00s - 0.24s)
    this.playTimpani(cueBus, midi(N.A2), now + 0.0, 0.13, -0.15);
    this.playTimpani(cueBus, midi(N.A2), now + 0.075, 0.15, 0.15);
    this.playTimpani(cueBus, midi(N.A2), now + 0.15, 0.17, -0.1);
    this.playCymbalShimmer(cueBus, now + 0.22, 1.6, 0.085, 0);

    // 2. Blazing Heroic Trumpet & French Horn Fanfare Melody (I -> bVI -> bVII -> I)
    const fanfareLead: Array<[number, number, number, number]> = [
      // [offsetSec, midiNote, durSec, vel]
      // Pickup + D Major triumph
      [0.02, N.A4, 0.18, 0.85],
      [0.22, N.D5, 0.44, 1.0],
      [0.68, N.D5, 0.16, 0.88],
      [0.86, N.D5, 0.16, 0.9],
      // bVI (Bb Major) epic lift!
      [1.04, N.Bb4, 0.42, 0.96],
      [1.48, N.C5, 0.24, 0.94],
      [1.74, N.D5, 0.34, 0.98],
      // bVII (C Major) soaring push!
      [2.10, N.C5, 0.24, 0.95],
      [2.36, N.D5, 0.24, 0.98],
      [2.62, N.E5, 0.38, 1.0],
      // I (D Major) radiant crown resolution!
      [3.04, N.Fs5, 1.55, 1.0],
    ];

    fanfareLead.forEach(([t, n, d, v]) => {
      this.playBrassHorn(cueBus, midi(n), now + t, d, 0.115 * v, 0.06, true);
      // Warm harmony a fifth/third below on major downbeats
      if (t >= 0.2) {
        const harm =
          t < 1.0 ? n - 5 : t < 2.05 ? n - 4 : t < 3.0 ? n - 4 : N.D5;
        this.playBrassHorn(cueBus, midi(harm), now + t, d, 0.072 * v, -0.22, false);
      }
    });

    // 3. Orchestral Chords (Strings + Bass + Timpani Hits)
    const chords: Array<[number, number, number[], number]> = [
      [0.22, N.D2, [N.D3, N.A3, N.Fs4], 0.85],
      [1.04, N.Bb1, [N.Bb2, N.F3, N.D4], 1.05],
      [2.10, N.C2, [N.C3, N.G3, N.E4], 0.95],
      [3.04, N.D2, [N.D3, N.A3, N.D4, N.Fs4, N.A4], 1.75],
    ];

    chords.forEach(([t, bass, notes, dur]) => {
      this.playTimpani(cueBus, midi(bass + 12), now + t, 0.22, -0.12);
      this.playWarDrum(cueBus, now + t, 0.14, 0.95, 0.08);
      this.playBowedString(cueBus, midi(bass), now + t, dur, 0.11, -0.15);
      notes.forEach((n, idx) => {
        this.playBowedString(cueBus, midi(n), now + t, dur, 0.052, (idx % 2 === 0 ? -0.24 : 0.24));
      });
    });

    // Crisp military victory snare rhythm
    [0.22, 0.68, 0.86, 1.04, 1.92, 2.1, 2.86, 2.95, 3.04].forEach((t, i) => {
      this.playFieldSnare(cueBus, now + t, i === 8 ? 0.11 : 0.068, i === 6 || i === 7, 0.22);
    });

    // 4. Cascading Golden Harp Glissando (sweeps up into the triumphant final D Major chord!)
    const gliss = [N.D4, N.E4, N.Fs4, N.A4, N.D5, N.E5, N.Fs5, N.A5, N.D6];
    gliss.forEach((n, i) => {
      this.playPluckedString(
        cueBus,
        midi(n),
        now + 2.98 + i * 0.055,
        1.5,
        0.088,
        -0.38 + (i / gliss.length) * 0.76,
        'harp'
      );
    });

    // 5. Joyful Flute Flourish + Cathedral Guild Bells Finale
    this.playFlute(cueBus, midi(N.A5), now + 3.08, 1.35, 0.065, -0.18);
    this.playBellChime(cueBus, midi(N.D5), now + 3.04, 2.1, 0.062, -0.28);
    this.playBellChime(cueBus, midi(N.A5), now + 3.12, 2.1, 0.048, 0.3);
    this.playCymbalShimmer(cueBus, now + 3.04, 1.9, 0.095, 0);
  }

  // -------------------------------------------------------------------------
  // DEFEAT MUSIC: "Rain Before Dawn" (~4.6s noble melancholic elegy in D Aeolian/Dorian)
  // Chord progression: Dm -> Bbmaj7 -> Gm7 -> Asus4 -> Dm(open 5th)
  // -------------------------------------------------------------------------
  playDefeatRequiem(): void {
    if (!this.router || !this.enabled) return;
    const { ctx, musicDry, musicWet } = this.router;
    const now = ctx.currentTime + 0.04;

    const cueBus = ctx.createGain();
    cueBus.gain.setValueAtTime(1.0, now);
    const cueWet = ctx.createGain();
    cueWet.gain.setValueAtTime(0.56, now); // Deep solemn stone courtyard reverb
    cueBus.connect(musicDry);
    cueBus.connect(cueWet);
    cueWet.connect(musicWet);

    // 1. Solemn Distant Bronze Bell Toll + Muffled Funeral Drum Heartbeat
    this.playBellChime(cueBus, midi(N.D3), now + 0.0, 2.8, 0.075, -0.25);
    this.playWarDrum(cueBus, now + 0.02, 0.14, 0.72, 0);
    this.playWarDrum(cueBus, now + 1.15, 0.10, 0.70, -0.08);
    this.playWarDrum(cueBus, now + 2.35, 0.085, 0.68, 0.06);

    // 2. Warm, Dark Bowed String Elegy Chords (Dm -> Bbmaj7 -> Gm7 -> Asus4 -> Dm)
    const chords: Array<[number, number, number[], number]> = [
      [0.08, N.D2, [N.D3, N.A3, N.F4], 1.15],
      [1.18, N.Bb1, [N.Bb2, N.F3, N.D4], 1.15],
      [2.28, N.G2, [N.G3, N.Bb3, N.F4], 0.95],
      [3.18, N.A1, [N.A2, N.E3, N.D4], 0.62],
      [3.74, N.D2, [N.D3, N.A3], 1.5], // Noble hollow open-5th resolution
    ];

    chords.forEach(([t, bass, notes, dur]) => {
      this.playBowedString(cueBus, midi(bass), now + t, dur + 0.2, 0.105, -0.18);
      notes.forEach((n, idx) => {
        this.playBowedString(cueBus, midi(n), now + t, dur + 0.18, 0.052, idx % 2 === 0 ? 0.2 : -0.2);
      });
    });

    // 3. Weeping Solo Cello & Muted Horn Descending Lament (A4 -> G4 -> F4 -> E4 -> D4)
    const lament: Array<[number, number, number, number]> = [
      [0.24, N.A4, 0.85, 0.88],
      [1.18, N.G4, 0.55, 0.84],
      [1.76, N.F4, 0.56, 0.82],
      [2.32, N.E4, 0.78, 0.80],
      [3.18, N.E4, 0.48, 0.76],
      [3.74, N.D4, 1.35, 0.78],
    ];

    lament.forEach(([t, n, d, v]) => {
      this.playBowedString(cueBus, midi(n), now + t, d, 0.082 * v, 0.12);
      // Warm muted French horn echoing an octave below on key sigh notes
      if (t === 0.24 || t === 2.32 || t === 3.74) {
        this.playBrassHorn(cueBus, midi(n - 12), now + t + 0.04, d * 0.95, 0.056 * v, -0.16, false);
      }
    });

    // 4. Sparse Harp Teardrops (delicate raindrop pluck descending gently)
    const drops: Array<[number, number]> = [
      [0.55, N.F4],
      [0.92, N.E4],
      [1.55, N.D4],
      [2.02, N.C4],
      [2.72, N.Bb3],
      [3.38, N.A3],
      [3.92, N.D4],
      [4.28, N.A3],
    ];
    drops.forEach(([t, n], i) => {
      this.playPluckedString(cueBus, midi(n), now + t, 1.25, 0.058, i % 2 === 0 ? -0.32 : 0.32, 'harp');
    });
  }

  // =========================================================================
  // ACOUSTIC & ORCHESTRAL INSTRUMENT SYNTHESIZERS
  // =========================================================================

  private routePanned(dest: AudioNode, pan: number): AudioNode {
    if (!this.router) return dest;
    const { ctx } = this.router;
    if (Math.abs(pan) > 0.02 && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), ctx.currentTime);
      p.connect(dest);
      return p;
    }
    return dest;
  }

  private playPluckedString(
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    volume: number,
    pan: number,
    style: 'lute' | 'harp'
  ): void {
    if (!this.router) return;
    const { ctx, whiteNoise } = this.router;
    const out = this.routePanned(dest, pan);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = style === 'lute' ? 'triangle' : 'sine';
    osc2.type = style === 'lute' ? 'sawtooth' : 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * (style === 'lute' ? 2.002 : 2.0), time);

    const mix2 = ctx.createGain();
    mix2.gain.setValueAtTime(style === 'lute' ? 0.24 : 0.32, time);

    // Classic plucked string brightness decay (filter closes rapidly after finger/pick release)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(style === 'lute' ? 1.8 : 1.1, time);
    filter.frequency.setValueAtTime(Math.min(7200, freq * (style === 'lute' ? 5.2 : 6.4)), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(260, freq * 1.35), time + Math.min(0.32, duration * 0.6));

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(volume, time + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(mix2);
    mix2.connect(filter);
    filter.connect(env);
    env.connect(out);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.02);
    osc2.stop(time + duration + 0.02);

    // Subtle acoustic pluck transient click (nail on gut string)
    const pluck = ctx.createBufferSource();
    pluck.buffer = whiteNoise;
    const pf = ctx.createBiquadFilter();
    pf.type = 'bandpass';
    pf.frequency.setValueAtTime(Math.min(4800, freq * 4.5), time);
    pf.Q.setValueAtTime(2.4, time);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(volume * 0.28, time);
    pg.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
    pluck.connect(pf);
    pf.connect(pg);
    pg.connect(out);
    pluck.start(time);
    pluck.stop(time + 0.025);
  }

  private playBrassHorn(
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    volume: number,
    pan: number,
    brightTrumpet = false
  ): void {
    if (!this.router) return;
    const { ctx } = this.router;
    const out = this.routePanned(dest, pan);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(freq, time);
    oscB.frequency.setValueAtTime(freq, time);
    oscA.detune.setValueAtTime(-5.5, time);
    oscB.detune.setValueAtTime(5.5, time);

    // Expressive brass vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(brightTrumpet ? 5.6 : 4.8, time);
    lfoGain.gain.setValueAtTime(0.0001, time);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.0085, time + Math.min(0.28, duration * 0.45));
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);

    // Brass breath-bloom filter envelope: mellow start -> warm golden brass flare -> warm settle
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(brightTrumpet ? 2.4 : 1.7, time);
    const startCut = Math.max(220, freq * (brightTrumpet ? 2.0 : 1.35));
    const peakCut = Math.min(7800, freq * (brightTrumpet ? 5.8 : 3.6));
    const susCut = Math.min(5400, freq * (brightTrumpet ? 4.1 : 2.6));
    filter.frequency.setValueAtTime(startCut, time);
    filter.frequency.linearRampToValueAtTime(peakCut, time + Math.min(0.09, duration * 0.25));
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, susCut), time + duration);

    const env = ctx.createGain();
    const attack = brightTrumpet ? 0.032 : 0.068;
    const releaseStart = Math.max(time + attack + 0.01, time + duration - 0.09);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(volume, time + attack);
    env.gain.setValueAtTime(volume * 0.88, releaseStart);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.06);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(env);
    env.connect(out);

    oscA.start(time);
    oscB.start(time);
    lfo.start(time);
    oscA.stop(time + duration + 0.08);
    oscB.stop(time + duration + 0.08);
    lfo.stop(time + duration + 0.08);
  }

  private playBowedString(
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    volume: number,
    pan: number
  ): void {
    if (!this.router) return;
    const { ctx } = this.router;
    const out = this.routePanned(dest, pan);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'triangle';
    oscA.frequency.setValueAtTime(freq, time);
    oscB.frequency.setValueAtTime(freq, time);
    oscA.detune.setValueAtTime(-6, time);
    oscB.detune.setValueAtTime(6, time);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.1, time);
    lfoGain.gain.setValueAtTime(0.0001, time);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.007, time + Math.min(0.35, duration * 0.4));
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);

    // Warm wooden body filter (cuts harsh upper buzz, emphasizes cello/viola resonance)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3400, freq * 3.4), time);
    filter.Q.setValueAtTime(1.2, time);

    const env = ctx.createGain();
    const attack = Math.min(0.18, duration * 0.25);
    const rel = Math.max(time + attack + 0.02, time + duration - 0.16);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(volume, time + attack);
    env.gain.setValueAtTime(volume * 0.85, rel);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.12);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(env);
    env.connect(out);

    oscA.start(time);
    oscB.start(time);
    lfo.start(time);
    oscA.stop(time + duration + 0.14);
    oscB.stop(time + duration + 0.14);
    lfo.stop(time + duration + 0.14);
  }

  private playFlute(
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    volume: number,
    pan: number
  ): void {
    if (!this.router) return;
    const { ctx, pinkNoise } = this.router;
    const out = this.routePanned(dest, pan);

    const osc = ctx.createOscillator();
    const harm = ctx.createOscillator();
    osc.type = 'sine';
    harm.type = 'triangle';
    // Gentle grace pitch scoop into note like a real breath-blown wooden recorder/fife
    osc.frequency.setValueAtTime(freq * 0.985, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.045);
    harm.frequency.setValueAtTime(freq * 2, time);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.16, time);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.4, time);
    lfoGain.gain.setValueAtTime(0.0001, time);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.009, time + Math.min(0.24, duration * 0.5));
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const env = ctx.createGain();
    const atk = Math.min(0.055, duration * 0.2);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(volume, time + atk);
    env.gain.setValueAtTime(volume * 0.85, Math.max(time + atk + 0.01, time + duration - 0.07));
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.05);

    osc.connect(env);
    harm.connect(harmGain);
    harmGain.connect(env);
    env.connect(out);

    osc.start(time);
    harm.start(time);
    lfo.start(time);
    osc.stop(time + duration + 0.06);
    harm.stop(time + duration + 0.06);
    lfo.stop(time + duration + 0.06);

    // Breathy wooden chiff at note onset
    const breath = ctx.createBufferSource();
    breath.buffer = pinkNoise;
    const bf = ctx.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.setValueAtTime(Math.min(5000, freq * 2.2), time);
    bf.Q.setValueAtTime(3.2, time);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, time);
    bg.gain.linearRampToValueAtTime(volume * 0.24, time + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.14, duration * 0.5));
    breath.connect(bf);
    bf.connect(bg);
    bg.connect(out);
    breath.start(time);
    breath.stop(time + 0.16);
  }

  private playTimpani(dest: AudioNode, freq: number, time: number, volume: number, pan: number): void {
    if (!this.router) return;
    const { ctx, pinkNoise } = this.router;
    const out = this.routePanned(dest, pan);

    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(freq * 1.42, time);
    body.frequency.exponentialRampToValueAtTime(freq, time + 0.055);
    body.frequency.exponentialRampToValueAtTime(freq * 0.96, time + 0.58);

    const overtone = ctx.createOscillator();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 1.505, time); // Kettle fifth mode

    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(volume * 0.34, time);
    overGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(volume, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.62);

    body.connect(env);
    overtone.connect(overGain);
    overGain.connect(out);
    env.connect(out);

    body.start(time);
    overtone.start(time);
    body.stop(time + 0.65);
    overtone.stop(time + 0.28);

    // Soft felt mallet thump
    const mallet = ctx.createBufferSource();
    mallet.buffer = pinkNoise;
    const mf = ctx.createBiquadFilter();
    mf.type = 'bandpass';
    mf.frequency.setValueAtTime(280, time);
    mf.Q.setValueAtTime(1.4, time);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(volume * 0.45, time);
    mg.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    mallet.connect(mf);
    mf.connect(mg);
    mg.connect(out);
    mallet.start(time);
    mallet.stop(time + 0.045);
  }

  private playWarDrum(dest: AudioNode, time: number, volume: number, pitch: number, pan: number): void {
    if (!this.router) return;
    const { ctx, pinkNoise } = this.router;
    const out = this.routePanned(dest, pan);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(118 * pitch, time);
    osc.frequency.exponentialRampToValueAtTime(42 * pitch, time + 0.14);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(volume, time + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

    osc.connect(env);
    env.connect(out);
    osc.start(time);
    osc.stop(time + 0.26);

    const slap = ctx.createBufferSource();
    slap.buffer = pinkNoise;
    const sf = ctx.createBiquadFilter();
    sf.type = 'bandpass';
    sf.frequency.setValueAtTime(360 * pitch, time);
    sf.Q.setValueAtTime(1.5, time);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(volume * 0.48, time);
    sg.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    slap.connect(sf);
    sf.connect(sg);
    sg.connect(out);
    slap.start(time);
    slap.stop(time + 0.06);
  }

  private playBodhranTap(dest: AudioNode, time: number, volume: number, pitch: number, pan: number): void {
    if (!this.router) return;
    const { ctx, whiteNoise } = this.router;
    const out = this.routePanned(dest, pan);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 * pitch, time);
    osc.frequency.exponentialRampToValueAtTime(115 * pitch, time + 0.05);
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);
    osc.connect(env);
    env.connect(out);
    osc.start(time);
    osc.stop(time + 0.075);

    const tick = ctx.createBufferSource();
    tick.buffer = whiteNoise;
    const tf = ctx.createBiquadFilter();
    tf.type = 'bandpass';
    tf.frequency.setValueAtTime(1600 * pitch, time);
    tf.Q.setValueAtTime(2.6, time);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(volume * 0.36, time);
    tg.gain.exponentialRampToValueAtTime(0.0001, time + 0.024);
    tick.connect(tf);
    tf.connect(tg);
    tg.connect(out);
    tick.start(time);
    tick.stop(time + 0.03);
  }

  private playFieldSnare(dest: AudioNode, time: number, volume: number, ghost: boolean, pan: number): void {
    if (!this.router) return;
    const { ctx, whiteNoise } = this.router;
    const out = this.routePanned(dest, pan);

    // Crisp gut-wire snare rattle
    const noise = ctx.createBufferSource();
    noise.buffer = whiteNoise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(ghost ? 2400 : 1950, time);
    bp.Q.setValueAtTime(1.1, time);

    const ng = ctx.createGain();
    const dur = ghost ? 0.075 : 0.135;
    ng.gain.setValueAtTime(0.0001, time);
    ng.gain.linearRampToValueAtTime(volume, time + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    noise.start(time);
    noise.stop(time + dur + 0.015);

    // Wooden drum shell punch
    const shell = ctx.createOscillator();
    shell.type = 'triangle';
    shell.frequency.setValueAtTime(215, time);
    shell.frequency.exponentialRampToValueAtTime(125, time + 0.05);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(volume * 0.58, time);
    sg.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);
    shell.connect(sg);
    sg.connect(out);
    shell.start(time);
    shell.stop(time + 0.075);
  }

  private playBellChime(dest: AudioNode, freq: number, time: number, duration: number, volume: number, pan: number): void {
    if (!this.router) return;
    const { ctx } = this.router;
    const out = this.routePanned(dest, pan);

    // Authentic tubular bell / guild bell modal ratios
    const partials: Array<[number, number, number]> = [
      [1.0, 1.0, 1.0],
      [2.0, 0.45, 0.72],
      [2.756, 0.24, 0.48],
      [4.07, 0.12, 0.3],
    ];
    partials.forEach(([ratio, gainRatio, durRatio]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, time);
      const g = ctx.createGain();
      const d = duration * durRatio;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(volume * gainRatio, time + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, time + d);
      osc.connect(g);
      g.connect(out);
      osc.start(time);
      osc.stop(time + d + 0.02);
    });
  }

  private playCymbalShimmer(dest: AudioNode, time: number, duration: number, volume: number, pan: number): void {
    if (!this.router) return;
    const { ctx, whiteNoise } = this.router;
    const out = this.routePanned(dest, pan);

    const src = ctx.createBufferSource();
    src.buffer = whiteNoise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4800, time);
    const bp = ctx.createBiquadFilter();
    bp.type = 'peaking';
    bp.frequency.setValueAtTime(7600, time);
    bp.gain.setValueAtTime(5, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(volume, time + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(time);
    src.stop(time + duration + 0.03);
  }
}

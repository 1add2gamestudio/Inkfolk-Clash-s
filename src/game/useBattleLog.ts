import { useCallback, useRef, useState } from 'react';
import { AGES } from './content';
import type { BattleSoundEvent, UnitCollisionEvent } from './engine';
import type { BattleState } from './types';

export type BattleLogTone =
  | 'wave'
  | 'crit'
  | 'clash'
  | 'giant'
  | 'castle'
  | 'evolve'
  | 'rally';

export interface BattleLogEntry {
  id: number;
  timeSec: number;
  label: string;
  detail?: string;
  tone: BattleLogTone;
}

export const MAX_BATTLE_LOG_ENTRIES = 4;

type CooldownChannel =
  | 'unit_clash'
  | 'critical_hit'
  | 'wave_incoming'
  | 'wave_unleashed'
  | 'giant_event'
  | 'ally_castle_hit'
  | 'enemy_castle_hit'
  | 'age_evolve'
  | 'final_charge'
  | 'outcome'
  | 'start';

const CHANNEL_COOLDOWNS_SEC: Record<CooldownChannel, number> = {
  unit_clash: 2.6,
  critical_hit: 1.8,
  wave_incoming: 0,
  wave_unleashed: 0,
  giant_event: 0.6,
  ally_castle_hit: 3.8,
  enemy_castle_hit: 3.8,
  age_evolve: 0,
  final_charge: 0,
  outcome: 0,
  start: 0,
};

export function formatBattleTimestamp(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export class BattleLogRecorder {
  private entries: BattleLogEntry[] = [];
  private nextId = 1;
  private lastChannelAt = new Map<CooldownChannel, number>();
  private lastActiveWaveIndex = 0;

  getEntries(): BattleLogEntry[] {
    return this.entries;
  }

  reset(initialLabel?: string, initialDetail?: string): BattleLogEntry[] {
    this.entries = [];
    this.lastChannelAt.clear();
    this.lastActiveWaveIndex = 0;
    if (initialLabel) {
      this.push('start', 0, initialLabel, initialDetail, 'rally');
    }
    return this.entries;
  }

  push(
    channel: CooldownChannel,
    battleTimeSec: number,
    label: string,
    detail: string | undefined,
    tone: BattleLogTone
  ): boolean {
    const cooldown = CHANNEL_COOLDOWNS_SEC[channel];
    const lastAt = this.lastChannelAt.get(channel);
    if (cooldown > 0 && lastAt !== undefined && battleTimeSec - lastAt < cooldown) {
      return false;
    }

    this.lastChannelAt.set(channel, battleTimeSec);
    const entry: BattleLogEntry = {
      id: this.nextId++,
      timeSec: Math.max(0, battleTimeSec),
      label,
      detail,
      tone,
    };
    const next = [...this.entries, entry];
    this.entries =
      next.length > MAX_BATTLE_LOG_ENTRIES
        ? next.slice(next.length - MAX_BATTLE_LOG_ENTRIES)
        : next;
    return true;
  }

  recordCollision(col: UnitCollisionEvent, battleTimeSec: number): boolean {
    if (col.kind === 'heavy_impact') {
      const detail =
        col.attackerRole === 'heavy'
          ? col.attackerFaction === 'ally'
            ? 'Colossus Cleave'
            : 'Siege Slam'
          : 'Heavy Strike';
      return this.push('critical_hit', battleTimeSec, 'Critical Hit!', detail, 'crit');
    }

    if (col.kind === 'frontline_engage' || col.kind === 'melee_clash') {
      const detail =
        col.kind === 'frontline_engage' ? 'Frontline Engaged' : 'Vanguard Skirmish';
      return this.push('unit_clash', battleTimeSec, 'Unit Clash!', detail, 'clash');
    }

    return false;
  }

  recordSound(ev: BattleSoundEvent, state: BattleState): boolean {
    const t = state.time;

    switch (ev) {
      case 'wave_warn': {
        const wave = state.incomingHugeWave;
        const detail = wave
          ? `Wave ${wave.index}/3 · ${wave.title}`
          : 'Enemy Horde Approaching';
        return this.push('wave_incoming', t, 'Wave Incoming!', detail, 'wave');
      }
      case 'hit_heavy':
        return this.push('critical_hit', t, 'Critical Hit!', 'Heavy Blow', 'crit');
      case 'giant_slam':
        return this.push('critical_hit', t, 'Critical Hit!', 'Seismic Slam', 'crit');
      case 'giant_stomp': {
        const newestHeavy = [...state.units]
          .reverse()
          .find((u) => u.role === 'heavy' && u.state !== 'die');
        if (newestHeavy?.faction === 'enemy') {
          return this.push('giant_event', t, 'Enemy Giant!', 'Siege Walker Advancing', 'giant');
        }
        return this.push('giant_event', t, 'Giant Deployed!', 'Colossus Entering Field', 'giant');
      }
      case 'evolve': {
        const ageName = AGES[Math.min(AGES.length - 1, state.allyAgeIndex)]?.name ?? 'Next Age';
        return this.push('age_evolve', t, 'Age Evolved!', ageName, 'evolve');
      }
      case 'charge':
        return this.push('final_charge', t, 'Final Charge!', '+80% Spd · +50% Siege', 'rally');
      case 'victory':
        return this.push('outcome', t, 'Enemy Keep Fallen!', 'Victory Secured', 'rally');
      case 'defeat':
        return this.push('outcome', t, 'Citadel Breached!', 'Hold the Line', 'castle');
      default:
        return false;
    }
  }

  recordBattleStepChecks(state: BattleState): boolean {
    let changed = false;

    const activeIdx = state.activeHugeWaveBanner?.index ?? 0;
    if (activeIdx > this.lastActiveWaveIndex && state.activeHugeWaveBanner) {
      this.lastActiveWaveIndex = activeIdx;
      changed =
        this.push(
          'wave_unleashed',
          state.time,
          `Wave ${activeIdx} Unleashed!`,
          state.activeHugeWaveBanner.title,
          'wave'
        ) || changed;
    }

    if (state.allyBaseHitFlash > 0.095) {
      changed =
        this.push(
          'ally_castle_hit',
          state.time,
          'Castle Under Siege!',
          `${Math.ceil(state.allyBaseHp)} HP Left`,
          'castle'
        ) || changed;
    }

    if (state.enemyBaseHitFlash > 0.095) {
      changed =
        this.push(
          'enemy_castle_hit',
          state.time,
          'Sieging Enemy Keep!',
          `${Math.ceil(state.enemyBaseHp)} HP Left`,
          'clash'
        ) || changed;
    }

    return changed;
  }
}

export function useBattleLog() {
  const recorderRef = useRef<BattleLogRecorder>(new BattleLogRecorder());
  const [entries, setEntries] = useState<BattleLogEntry[]>([]);

  const sync = useCallback(() => {
    setEntries(recorderRef.current.getEntries());
  }, []);

  const resetLog = useCallback(
    (initialLabel?: string, initialDetail?: string) => {
      recorderRef.current.reset(initialLabel, initialDetail);
      sync();
    },
    [sync]
  );

  const recordSoundEvent = useCallback(
    (ev: BattleSoundEvent, state: BattleState) => {
      if (recorderRef.current.recordSound(ev, state)) {
        sync();
      }
    },
    [sync]
  );

  const recordCollisionEvent = useCallback(
    (col: UnitCollisionEvent, battleTimeSec: number) => {
      if (recorderRef.current.recordCollision(col, battleTimeSec)) {
        sync();
      }
    },
    [sync]
  );

  const recordStepChecks = useCallback(
    (state: BattleState) => {
      if (recorderRef.current.recordBattleStepChecks(state)) {
        sync();
      }
    },
    [sync]
  );

  return {
    entries,
    resetLog,
    recordSoundEvent,
    recordCollisionEvent,
    recordStepChecks,
  };
}

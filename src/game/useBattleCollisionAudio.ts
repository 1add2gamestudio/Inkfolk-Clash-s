import { useCallback, useEffect, useRef } from 'react';
import {
  gameAudio,
  type BattleDrumVariant,
  type BattleShoutVariant,
  type RandomizedBattleSfxPayload,
  type SteelClashVariant,
} from './audio';
import { WORLD_WIDTH, type UnitCollisionEvent } from './engine';

const STEEL_VARIANTS: readonly SteelClashVariant[] = [
  'parry_ring',
  'blade_scrape',
  'broad_clang',
  'shield_brace',
];

const DRUM_VARIANTS: readonly BattleDrumVariant[] = [
  'taiko_thump',
  'double_flam',
  'march_cadence',
];

const SHOUT_VARIANTS: readonly BattleShoutVariant[] = [
  'rally_cry',
  'charge_hey',
  'grunt_effort',
  'giant_roar',
];

export interface CollisionAudioDirectorOptions {
  /** Custom sound sink (defaults to gameAudio.playBattleCollisionSfx) */
  onPlay?: (payload: RandomizedBattleSfxPayload) => void;
  /** Injectable PRNG for deterministic testing (defaults to Math.random) */
  random?: () => number;
  /** Injectable millisecond clock for deterministic testing */
  now?: () => number;
}

export interface CollisionAudioDirector {
  handleCollision: (event: UnitCollisionEvent) => void;
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

function pickNonRepeating<T extends string>(
  pool: readonly T[],
  lastUsed: T | null,
  rand: () => number
): T {
  if (pool.length <= 1) return pool[0];
  const filtered = lastUsed ? pool.filter((item) => item !== lastUsed) : pool;
  const list = filtered.length > 0 ? filtered : pool;
  const idx = Math.min(list.length - 1, Math.floor(rand() * list.length));
  return list[idx];
}

/**
 * Pure controller that translates unit collision events into randomized,
 * cooldown-gated clashing steel, tug-of-war war drums, and battle shouts.
 */
export function createCollisionAudioDirector(
  options: CollisionAudioDirectorOptions = {}
): CollisionAudioDirector {
  const onPlay =
    options.onPlay ?? ((payload) => gameAudio.playBattleCollisionSfx(payload));
  const rand = options.random ?? Math.random;
  const nowFn =
    options.now ??
    (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  let enabled = true;
  let clashEnergy = 0;
  let lastEventAt = -1;
  let lastSteelAt = -Infinity;
  let lastDrumAt = -Infinity;
  let lastShoutAt = -Infinity;
  let lastSteelVariant: SteelClashVariant | null = null;
  let lastDrumVariant: BattleDrumVariant | null = null;
  let lastShoutVariant: BattleShoutVariant | null = null;

  const reset = () => {
    clashEnergy = 0;
    lastEventAt = -1;
    lastSteelAt = -Infinity;
    lastDrumAt = -Infinity;
    lastShoutAt = -Infinity;
    lastSteelVariant = null;
    lastDrumVariant = null;
    lastShoutVariant = null;
  };

  const setEnabled = (nextEnabled: boolean) => {
    enabled = nextEnabled;
  };

  const handleCollision = (event: UnitCollisionEvent) => {
    if (!enabled) return;

    const now = nowFn();
    if (lastEventAt >= 0 && now > lastEventAt) {
      const elapsedSec = (now - lastEventAt) / 1000;
      clashEnergy = Math.max(0, clashEnergy - elapsedSec * 0.72);
    }
    lastEventAt = now;

    // Accumulate rolling tug-of-war clash energy
    const energyGain =
      event.kind === 'heavy_impact'
        ? 0.95
        : event.kind === 'frontline_engage'
          ? 0.85
          : event.kind === 'melee_clash'
            ? 0.44
            : 0.16;
    clashEnergy = Math.min(4.0, clashEnergy + energyGain);

    const pan = Math.max(-0.68, Math.min(0.68, (event.x / WORLD_WIDTH) * 1.36 - 0.68));
    const totalNearby = event.allyCount + event.enemyCount;
    const tugUrgency = Math.abs(event.tugOfWarBalance); // 0 midfield .. 1 near either base

    // 1. Clashing Steel (triggered on melee clashes, frontline engagements, heavy hits, or armored arrow hits)
    const steelCooldownMs = Math.max(110, 185 - event.intensity * 65);
    const steelEligible =
      event.kind !== 'projectile_hit' ||
      event.defenderRole === 'heavy' ||
      rand() < 0.38;

    if (steelEligible && now - lastSteelAt >= steelCooldownMs) {
      const steelPool: readonly SteelClashVariant[] =
        event.kind === 'heavy_impact'
          ? ['broad_clang', 'shield_brace', 'blade_scrape']
          : event.kind === 'projectile_hit'
            ? ['parry_ring', 'shield_brace']
            : STEEL_VARIANTS;

      const variant = pickNonRepeating(steelPool, lastSteelVariant, rand);
      lastSteelVariant = variant;
      lastSteelAt = now;

      const pitchScale =
        event.attackerRole === 'heavy' || event.defenderRole === 'heavy'
          ? 0.8 + rand() * 0.14
          : 0.92 + rand() * 0.24;

      onPlay({
        category: 'steel_clash',
        variant,
        pan,
        intensity: event.intensity,
        pitchScale,
      });
    }

    // 2. Tug-of-War War Drums (builds rhythmic momentum during sustained clashes & frontline shifts)
    const drumCooldownMs = Math.max(
      640,
      1160 - tugUrgency * 280 - Math.min(1, clashEnergy / 3.2) * 240
    );
    const drumTriggered =
      clashEnergy >= 1.2 ||
      (event.kind === 'frontline_engage' && totalNearby >= 3) ||
      event.kind === 'heavy_impact';

    if (drumTriggered && now - lastDrumAt >= drumCooldownMs) {
      const drumPool: readonly BattleDrumVariant[] =
        tugUrgency > 0.45 || clashEnergy >= 2.2
          ? ['double_flam', 'march_cadence', 'taiko_thump']
          : DRUM_VARIANTS;

      const variant = pickNonRepeating(drumPool, lastDrumVariant, rand);
      lastDrumVariant = variant;
      lastDrumAt = now;

      // Slightly higher, tighter drum tension when either base is under threat
      const pitchScale = 0.92 + tugUrgency * 0.14 + (rand() * 0.1 - 0.05);
      const drumIntensity = Math.min(1, 0.45 + (clashEnergy / 4) * 0.4 + tugUrgency * 0.2);

      onPlay({
        category: 'war_drum',
        variant,
        pan: pan * 0.5,
        intensity: drumIntensity,
        pitchScale,
      });
    }

    // 3. Battle Shouts & Warcries (punctuates frontline crashes, multi-unit brawls, and Giant slams)
    const shoutCooldownMs = Math.max(1150, 2050 - event.intensity * 620);
    const shoutChance =
      event.kind === 'frontline_engage'
        ? 0.72
        : event.kind === 'heavy_impact'
          ? 0.65
          : event.kind === 'melee_clash' && totalNearby >= 3
            ? 0.34
            : 0;

    if (
      shoutChance > 0 &&
      now - lastShoutAt >= shoutCooldownMs &&
      rand() <= shoutChance
    ) {
      const isGiantInvolved =
        event.attackerRole === 'heavy' || event.defenderRole === 'heavy';

      let shoutPool: readonly BattleShoutVariant[];
      if (isGiantInvolved && rand() < 0.62) {
        shoutPool = ['giant_roar', 'grunt_effort'];
      } else if (event.attackerFaction === 'ally') {
        shoutPool = ['rally_cry', 'charge_hey', 'grunt_effort'];
      } else {
        shoutPool = ['grunt_effort', 'charge_hey', 'rally_cry'];
      }

      const variant = pickNonRepeating(
        shoutPool.length > 0 ? shoutPool : SHOUT_VARIANTS,
        lastShoutVariant,
        rand
      );
      lastShoutVariant = variant;
      lastShoutAt = now;

      const basePitch =
        variant === 'giant_roar'
          ? 0.86 + rand() * 0.14
          : event.attackerFaction === 'ally'
            ? 0.96 + rand() * 0.18
            : 0.84 + rand() * 0.16;

      onPlay({
        category: 'battle_shout',
        variant,
        pan,
        intensity: Math.min(1, event.intensity * 0.95 + (totalNearby >= 5 ? 0.15 : 0)),
        pitchScale: basePitch,
      });
    }
  };

  return {
    handleCollision,
    setEnabled,
    reset,
  };
}

export interface UseBattleCollisionAudioOptions {
  enabled: boolean;
  isPlaying: boolean;
}

/**
 * React hook that binds game-loop unit collision events to randomized
 * clashing steel, war drums, and battle shouts for tug-of-war atmosphere.
 */
export function useBattleCollisionAudio({
  enabled,
  isPlaying,
}: UseBattleCollisionAudioOptions): {
  handleCollision: (event: UnitCollisionEvent) => void;
  reset: () => void;
} {
  const directorRef = useRef<CollisionAudioDirector | null>(null);
  if (!directorRef.current) {
    directorRef.current = createCollisionAudioDirector();
  }

  useEffect(() => {
    directorRef.current?.setEnabled(enabled && isPlaying);
    if (!isPlaying) {
      directorRef.current?.reset();
    }
  }, [enabled, isPlaying]);

  const handleCollision = useCallback((event: UnitCollisionEvent) => {
    directorRef.current?.handleCollision(event);
  }, []);

  const reset = useCallback(() => {
    directorRef.current?.reset();
  }, []);

  return { handleCollision, reset };
}

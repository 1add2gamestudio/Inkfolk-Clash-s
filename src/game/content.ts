import type { AgeSpec, StageSpec } from './types';

export const AGES: AgeSpec[] = [
  {
    ageIndex: 0,
    id: 'stone-reed',
    name: 'Stone & Reed',
    eraTag: 'AGE I · ROYAL VANGUARD',
    baseName: 'Stone Bastion',
    evolveCost: 45,
    baseHpBonus: 0,
    units: {
      melee: {
        role: 'melee',
        name: 'Oathblade',
        cost: 8,
        hp: 165,
        dmg: 20,
        range: 24,
        speed: 10.7,
        attackCooldown: 2.36,
        scale: 1.24,
        splashRadius: 18,
        cleaveCount: 3,
        knockback: 4.0,
      },
      ranged: {
        role: 'ranged',
        name: 'Royal Longbow',
        cost: 12,
        hp: 110,
        dmg: 22,
        range: 118,
        speed: 8.5,
        attackCooldown: 2.2,
        scale: 1.2,
        pierceCount: 1,
        knockback: 2.0,
      },
      heavy: {
        role: 'heavy',
        name: 'Brass Automaton',
        cost: 42,
        hp: 720,
        dmg: 56,
        range: 44,
        speed: 5.2,
        attackCooldown: 4.0,
        scale: 3.22,
        splashRadius: 40,
        cleaveCount: 5,
        knockback: 14.0,
        armorReduction: 0.2,
        knockbackImmune: true,
      },
    },
    enemyUnits: {
      melee: {
        role: 'melee',
        name: 'Clubkin',
        cost: 3,
        hp: 65,
        dmg: 8,
        range: 17,
        speed: 11.5,
        attackCooldown: 2.3,
        scale: 0.95,
      },
      ranged: {
        role: 'ranged',
        name: 'Slinger',
        cost: 5,
        hp: 40,
        dmg: 9,
        range: 94,
        speed: 10,
        attackCooldown: 2.9,
        scale: 0.92,
      },
      heavy: {
        role: 'heavy',
        name: 'Iron Walker',
        cost: 42,
        hp: 720,
        dmg: 56,
        range: 44,
        speed: 5.2,
        attackCooldown: 3.8,
        scale: 3.22,
        splashRadius: 54,
        cleaveCount: 7,
        knockback: 14.0,
        armorReduction: 0.2,
        knockbackImmune: true,
      },
    },
  },
  {
    ageIndex: 1,
    id: 'timber-bronze',
    name: 'Timber & Bronze',
    eraTag: 'AGE II · GILDED ORDER',
    baseName: 'Bronze Keep',
    evolveCost: 95,
    baseHpBonus: 220,
    units: {
      melee: {
        role: 'melee',
        name: 'Aegis Knight',
        cost: 8,
        hp: 255,
        dmg: 31,
        range: 25,
        speed: 11.0,
        attackCooldown: 2.3,
        scale: 1.26,
        splashRadius: 18,
        cleaveCount: 4,
        knockback: 4.5,
      },
      ranged: {
        role: 'ranged',
        name: 'Gilded Marksman',
        cost: 12,
        hp: 168,
        dmg: 35,
        range: 124,
        speed: 8.75,
        attackCooldown: 2.14,
        scale: 1.22,
        pierceCount: 1,
        knockback: 2.5,
      },
      heavy: {
        role: 'heavy',
        name: 'Gilded Colossus',
        cost: 42,
        hp: 1120,
        dmg: 88,
        range: 44,
        speed: 5.3,
        attackCooldown: 3.92,
        scale: 3.26,
        splashRadius: 42,
        cleaveCount: 5,
        knockback: 15.0,
        armorReduction: 0.21,
        knockbackImmune: true,
      },
    },
    enemyUnits: {
      melee: {
        role: 'melee',
        name: 'Shieldkin',
        cost: 3,
        hp: 102,
        dmg: 13,
        range: 18,
        speed: 11.75,
        attackCooldown: 2.24,
        scale: 0.96,
      },
      ranged: {
        role: 'ranged',
        name: 'Yew Archer',
        cost: 5,
        hp: 62,
        dmg: 15,
        range: 100,
        speed: 10.25,
        attackCooldown: 2.8,
        scale: 0.92,
      },
      heavy: {
        role: 'heavy',
        name: 'Boiler Crusher',
        cost: 42,
        hp: 1120,
        dmg: 88,
        range: 44,
        speed: 5.3,
        attackCooldown: 3.74,
        scale: 3.26,
        splashRadius: 56,
        cleaveCount: 7,
        knockback: 15.0,
        armorReduction: 0.21,
        knockbackImmune: true,
      },
    },
  },
  {
    ageIndex: 2,
    id: 'clockwork-guild',
    name: 'Clockwork Guild',
    eraTag: 'AGE III · HIGH CITADEL',
    baseName: 'Clockwork Citadel',
    evolveCost: 165,
    baseHpBonus: 500,
    units: {
      melee: {
        role: 'melee',
        name: 'Guild Paladin',
        cost: 8,
        hp: 400,
        dmg: 49,
        range: 26,
        speed: 11.25,
        attackCooldown: 2.24,
        scale: 1.28,
        splashRadius: 19,
        cleaveCount: 4,
        knockback: 5.0,
      },
      ranged: {
        role: 'ranged',
        name: 'Clockwork Arbalester',
        cost: 12,
        hp: 258,
        dmg: 55,
        range: 128,
        speed: 9,
        attackCooldown: 2.08,
        scale: 1.22,
        pierceCount: 1,
        knockback: 3.0,
      },
      heavy: {
        role: 'heavy',
        name: 'Clockwork Titan',
        cost: 42,
        hp: 1740,
        dmg: 138,
        range: 45,
        speed: 5.4,
        attackCooldown: 3.85,
        scale: 3.3,
        splashRadius: 44,
        cleaveCount: 6,
        knockback: 16.0,
        armorReduction: 0.22,
        knockbackImmune: true,
      },
    },
    enemyUnits: {
      melee: {
        role: 'melee',
        name: 'Lancer',
        cost: 3,
        hp: 160,
        dmg: 20,
        range: 20,
        speed: 12,
        attackCooldown: 2.2,
        scale: 0.98,
      },
      ranged: {
        role: 'ranged',
        name: 'Alchemist',
        cost: 5,
        hp: 96,
        dmg: 24,
        range: 104,
        speed: 10.5,
        attackCooldown: 2.72,
        scale: 0.94,
      },
      heavy: {
        role: 'heavy',
        name: 'Siege Dreadnought',
        cost: 42,
        hp: 1740,
        dmg: 138,
        range: 45,
        speed: 5.4,
        attackCooldown: 3.68,
        scale: 3.3,
        splashRadius: 58,
        cleaveCount: 8,
        knockback: 16.0,
        armorReduction: 0.22,
        knockbackImmune: true,
      },
    },
  },
  {
    ageIndex: 3,
    id: 'brass-skyfolk',
    name: 'Brass & Steam',
    eraTag: 'AGE IV · SOVEREIGN WATCH',
    baseName: 'Steam Fortress',
    evolveCost: 260,
    baseHpBonus: 860,
    units: {
      melee: {
        role: 'melee',
        name: 'Iron Banneret',
        cost: 8,
        hp: 615,
        dmg: 76,
        range: 27,
        speed: 11.5,
        attackCooldown: 2.2,
        scale: 1.3,
        splashRadius: 20,
        cleaveCount: 5,
        knockback: 5.5,
      },
      ranged: {
        role: 'ranged',
        name: 'Skyguard Fusilier',
        cost: 12,
        hp: 390,
        dmg: 86,
        range: 134,
        speed: 9.25,
        attackCooldown: 2.02,
        scale: 1.24,
        pierceCount: 1,
        knockback: 3.5,
      },
      heavy: {
        role: 'heavy',
        name: 'Solar Mech',
        cost: 42,
        hp: 2680,
        dmg: 212,
        range: 46,
        speed: 5.5,
        attackCooldown: 3.78,
        scale: 3.34,
        splashRadius: 46,
        cleaveCount: 6,
        knockback: 17.0,
        armorReduction: 0.23,
        knockbackImmune: true,
      },
    },
    enemyUnits: {
      melee: {
        role: 'melee',
        name: 'Dragoon',
        cost: 3,
        hp: 245,
        dmg: 31,
        range: 21,
        speed: 12.25,
        attackCooldown: 2.16,
        scale: 1.0,
      },
      ranged: {
        role: 'ranged',
        name: 'Musketeer',
        cost: 5,
        hp: 148,
        dmg: 38,
        range: 112,
        speed: 10.75,
        attackCooldown: 2.68,
        scale: 0.94,
      },
      heavy: {
        role: 'heavy',
        name: 'Furnace Titan',
        cost: 42,
        hp: 2680,
        dmg: 212,
        range: 46,
        speed: 5.5,
        attackCooldown: 3.62,
        scale: 3.34,
        splashRadius: 60,
        cleaveCount: 8,
        knockback: 17.0,
        armorReduction: 0.23,
        knockbackImmune: true,
      },
    },
  },
  {
    ageIndex: 4,
    id: 'starlight-kin',
    name: 'Starlight Kin',
    eraTag: 'AGE V · ASTRAL CROWN',
    baseName: 'Astral Citadel',
    evolveCost: 0,
    baseHpBonus: 1350,
    units: {
      melee: {
        role: 'melee',
        name: 'Sun Warden',
        cost: 8,
        hp: 940,
        dmg: 118,
        range: 28,
        speed: 11.8,
        attackCooldown: 2.16,
        scale: 1.32,
        splashRadius: 20,
        cleaveCount: 5,
        knockback: 6.0,
      },
      ranged: {
        role: 'ranged',
        name: 'Starlight Piercer',
        cost: 12,
        hp: 590,
        dmg: 132,
        range: 140,
        speed: 9.5,
        attackCooldown: 1.98,
        scale: 1.25,
        pierceCount: 1,
        knockback: 4.0,
      },
      heavy: {
        role: 'heavy',
        name: 'Astral Colossus',
        cost: 42,
        hp: 4100,
        dmg: 325,
        range: 46,
        speed: 5.6,
        attackCooldown: 3.7,
        scale: 3.38,
        splashRadius: 48,
        cleaveCount: 6,
        knockback: 18.0,
        armorReduction: 0.24,
        knockbackImmune: true,
      },
    },
    enemyUnits: {
      melee: {
        role: 'melee',
        name: 'Sunblade',
        cost: 3,
        hp: 375,
        dmg: 48,
        range: 22,
        speed: 12.5,
        attackCooldown: 2.1,
        scale: 1.02,
      },
      ranged: {
        role: 'ranged',
        name: 'Prism Bow',
        cost: 5,
        hp: 225,
        dmg: 58,
        range: 118,
        speed: 11,
        attackCooldown: 2.6,
        scale: 0.96,
      },
      heavy: {
        role: 'heavy',
        name: 'Eclipse Walker',
        cost: 42,
        hp: 4100,
        dmg: 325,
        range: 46,
        speed: 5.6,
        attackCooldown: 3.55,
        scale: 3.38,
        splashRadius: 62,
        cleaveCount: 9,
        knockback: 18.0,
        armorReduction: 0.24,
        knockbackImmune: true,
      },
    },
  },
];

interface StageWavePreset {
  trickleMelee: number;
  trickleRanged: number;
  trickleDelay: number;
  wave1: { melee: number; ranged: number; heavy: number };
  wave2: { melee: number; ranged: number; heavy: number };
  wave3: { melee: number; ranged: number; heavy: number };
  hugeIntervalScale?: number;
}

function buildPvzStageWaves(p: StageWavePreset): StageSpec['waves'] {
  // Plan B dynamic pacing: ~1.35x calmer base intervals + slightly wider formation spacing inside huge waves
  const s = (p.hugeIntervalScale ?? 1) * 1.12;
  const td = Number((p.trickleDelay * 1.35).toFixed(2));
  const groups = (
    melee: number,
    ranged: number,
    heavy: number,
    tempoMult = 1
  ) => {
    const out: Array<{ role: 'melee' | 'ranged' | 'heavy'; count: number; interval: number }> = [];
    if (heavy > 0) out.push({ role: 'heavy', count: heavy, interval: 1.15 * s * tempoMult });
    if (melee > 0) out.push({ role: 'melee', count: melee, interval: 0.44 * s * tempoMult });
    if (ranged > 0) out.push({ role: 'ranged', count: ranged, interval: 0.52 * s * tempoMult });
    return out;
  };

  return [
    { delay: 4.2, role: 'melee', count: p.trickleMelee, interval: 0.95 },
    { delay: td, role: 'ranged', count: p.trickleRanged, interval: 1.0 },
    {
      delay: 9.0,
      role: 'melee',
      count: p.wave1.melee,
      interval: 0.48 * s,
      hugeWaveIndex: 1,
      hugeWaveTitle: 'Vanguard Surge',
      groups: groups(p.wave1.melee, p.wave1.ranged, p.wave1.heavy, 1.0),
    },
    { delay: Number((td + 1.8).toFixed(2)), role: 'melee', count: p.trickleMelee, interval: 0.9 },
    { delay: td, role: 'ranged', count: p.trickleRanged, interval: 0.95 },
    {
      delay: 9.0,
      role: 'melee',
      count: p.wave2.melee,
      interval: 0.42 * s,
      hugeWaveIndex: 2,
      hugeWaveTitle: 'Warband Onslaught',
      groups: groups(p.wave2.melee, p.wave2.ranged, p.wave2.heavy, 0.9),
    },
    { delay: Number((td + 1.8).toFixed(2)), role: 'melee', count: p.trickleMelee, interval: 0.86 },
    { delay: td, role: 'ranged', count: p.trickleRanged, interval: 0.92 },
    {
      delay: 9.0,
      role: 'heavy',
      count: Math.max(1, p.wave3.heavy),
      interval: 0.9 * s,
      hugeWaveIndex: 3,
      hugeWaveTitle: 'Final Siege',
      groups: groups(p.wave3.melee, p.wave3.ranged, p.wave3.heavy, 0.78),
    },
  ];
}

export const STAGES: StageSpec[] = [
  // Chapter 1 — Stone & Reed (Escalating 1 : 1.8 : 3 Waves + 3B Sawtooth Stage Curve)
  {
    id: '1-1',
    chapter: 1,
    battle: 1,
    title: 'Willow Brook',
    enemyAgeIndex: 0,
    enemyBaseHp: 430,
    enemyHpMult: 0.88,
    enemyDmgMult: 0.88,
    startingFood: 10,
    baseFoodRate: 0.8,
    coinPerKill: 2,
    victoryBonusCoins: 20,
    waves: buildPvzStageWaves({
      trickleMelee: 1,
      trickleRanged: 1,
      trickleDelay: 7.4,
      wave1: { melee: 4, ranged: 0, heavy: 0 }, // 4
      wave2: { melee: 6, ranged: 2, heavy: 0 }, // 8
      wave3: { melee: 8, ranged: 3, heavy: 1 }, // 12 (1 Giant)
      hugeIntervalScale: 1.04,
    }),
  },
  {
    id: '1-2',
    chapter: 1,
    battle: 2,
    title: 'Mossy Ford',
    enemyAgeIndex: 0,
    enemyBaseHp: 740,
    enemyHpMult: 1.16,
    enemyDmgMult: 1.14,
    startingFood: 10,
    baseFoodRate: 0.8,
    coinPerKill: 3,
    victoryBonusCoins: 30,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.4,
      wave1: { melee: 5, ranged: 1, heavy: 0 }, // 6
      wave2: { melee: 7, ranged: 3, heavy: 1 }, // 11 (1 Giant)
      wave3: { melee: 10, ranged: 4, heavy: 2 }, // 16 (2 Giants)
      hugeIntervalScale: 0.92,
    }),
  },
  {
    id: '1-3',
    chapter: 1,
    battle: 3,
    title: 'Redstone Gate',
    enemyAgeIndex: 0,
    enemyBaseHp: 940,
    enemyHpMult: 1.06,
    enemyDmgMult: 1.05,
    startingFood: 10,
    baseFoodRate: 0.8,
    coinPerKill: 3,
    victoryBonusCoins: 36,
    waves: buildPvzStageWaves({
      trickleMelee: 1,
      trickleRanged: 1,
      trickleDelay: 6.8,
      wave1: { melee: 4, ranged: 1, heavy: 0 }, // 5
      wave2: { melee: 6, ranged: 3, heavy: 0 }, // 9
      wave3: { melee: 9, ranged: 4, heavy: 1 }, // 14 (1 Giant)
      hugeIntervalScale: 0.98,
    }),
  },

  // Chapter 2 — Timber & Bronze (Escalating 1 : 1.8 : 3 + Sawtooth)
  {
    id: '2-1',
    chapter: 2,
    battle: 1,
    title: 'Oakridge Camp',
    enemyAgeIndex: 1,
    enemyBaseHp: 1120,
    enemyHpMult: 1.1,
    enemyDmgMult: 1.08,
    startingFood: 10,
    baseFoodRate: 0.82,
    coinPerKill: 4,
    victoryBonusCoins: 44,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.6,
      wave1: { melee: 4, ranged: 2, heavy: 0 }, // 6
      wave2: { melee: 7, ranged: 3, heavy: 1 }, // 11
      wave3: { melee: 10, ranged: 5, heavy: 1 }, // 16
      hugeIntervalScale: 0.98,
    }),
  },
  {
    id: '2-2',
    chapter: 2,
    battle: 2,
    title: 'Copper Palisade',
    enemyAgeIndex: 1,
    enemyBaseHp: 1480,
    enemyHpMult: 1.3,
    enemyDmgMult: 1.26,
    startingFood: 10,
    baseFoodRate: 0.82,
    coinPerKill: 5,
    victoryBonusCoins: 60,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.0,
      wave1: { melee: 5, ranged: 2, heavy: 0 }, // 7
      wave2: { melee: 8, ranged: 4, heavy: 1 }, // 13
      wave3: { melee: 11, ranged: 6, heavy: 2 }, // 19
      hugeIntervalScale: 0.88,
    }),
  },
  {
    id: '2-3',
    chapter: 2,
    battle: 3,
    title: 'Bronze Citadel',
    enemyAgeIndex: 1,
    enemyBaseHp: 1820,
    enemyHpMult: 1.18,
    enemyDmgMult: 1.15,
    startingFood: 10,
    baseFoodRate: 0.82,
    coinPerKill: 6,
    victoryBonusCoins: 68,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.6,
      wave1: { melee: 4, ranged: 2, heavy: 0 }, // 6
      wave2: { melee: 7, ranged: 4, heavy: 1 }, // 12
      wave3: { melee: 10, ranged: 5, heavy: 1 }, // 16
      hugeIntervalScale: 0.96,
    }),
  },

  // Chapter 3 — Clockwork Guild (Escalating 1 : 1.8 : 3 + Sawtooth)
  {
    id: '3-1',
    chapter: 3,
    battle: 1,
    title: 'Verdant Pass',
    enemyAgeIndex: 2,
    enemyBaseHp: 2180,
    enemyHpMult: 1.14,
    enemyDmgMult: 1.12,
    startingFood: 10,
    baseFoodRate: 0.84,
    coinPerKill: 6,
    victoryBonusCoins: 78,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.4,
      wave1: { melee: 5, ranged: 2, heavy: 0 }, // 7
      wave2: { melee: 8, ranged: 4, heavy: 1 }, // 13
      wave3: { melee: 11, ranged: 6, heavy: 1 }, // 18
      hugeIntervalScale: 0.96,
    }),
  },
  {
    id: '3-2',
    chapter: 3,
    battle: 2,
    title: 'Vial Crossing',
    enemyAgeIndex: 2,
    enemyBaseHp: 2760,
    enemyHpMult: 1.35,
    enemyDmgMult: 1.32,
    startingFood: 10,
    baseFoodRate: 0.84,
    coinPerKill: 9,
    victoryBonusCoins: 105,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 2,
      trickleDelay: 5.8,
      wave1: { melee: 5, ranged: 3, heavy: 0 }, // 8
      wave2: { melee: 9, ranged: 5, heavy: 1 }, // 15
      wave3: { melee: 12, ranged: 7, heavy: 2 }, // 21
      hugeIntervalScale: 0.86,
    }),
  },
  {
    id: '3-3',
    chapter: 3,
    battle: 3,
    title: 'Alchemist Spire',
    enemyAgeIndex: 2,
    enemyBaseHp: 3340,
    enemyHpMult: 1.22,
    enemyDmgMult: 1.2,
    startingFood: 10,
    baseFoodRate: 0.84,
    coinPerKill: 9,
    victoryBonusCoins: 116,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.4,
      wave1: { melee: 5, ranged: 2, heavy: 0 }, // 7
      wave2: { melee: 8, ranged: 4, heavy: 1 }, // 13
      wave3: { melee: 11, ranged: 6, heavy: 1 }, // 18
      hugeIntervalScale: 0.94,
    }),
  },

  // Chapter 4 — Brass & Steam (Escalating 1 : 1.8 : 3 + Sawtooth)
  {
    id: '4-1',
    chapter: 4,
    battle: 1,
    title: 'Windmill Ridge',
    enemyAgeIndex: 3,
    enemyBaseHp: 3960,
    enemyHpMult: 1.18,
    enemyDmgMult: 1.16,
    startingFood: 10,
    baseFoodRate: 0.88,
    coinPerKill: 10,
    victoryBonusCoins: 135,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.2,
      wave1: { melee: 5, ranged: 2, heavy: 0 }, // 7
      wave2: { melee: 8, ranged: 4, heavy: 1 }, // 13
      wave3: { melee: 12, ranged: 6, heavy: 2 }, // 20
      hugeIntervalScale: 0.94,
    }),
  },
  {
    id: '4-2',
    chapter: 4,
    battle: 2,
    title: 'Copper Viaduct',
    enemyAgeIndex: 3,
    enemyBaseHp: 5040,
    enemyHpMult: 1.4,
    enemyDmgMult: 1.36,
    startingFood: 10,
    baseFoodRate: 0.88,
    coinPerKill: 14,
    victoryBonusCoins: 180,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 2,
      trickleDelay: 5.6,
      wave1: { melee: 5, ranged: 3, heavy: 1 }, // 9
      wave2: { melee: 9, ranged: 5, heavy: 1 }, // 15
      wave3: { melee: 13, ranged: 7, heavy: 2 }, // 22
      hugeIntervalScale: 0.84,
    }),
  },
  {
    id: '4-3',
    chapter: 4,
    battle: 3,
    title: 'Boiler Bastion',
    enemyAgeIndex: 3,
    enemyBaseHp: 6080,
    enemyHpMult: 1.26,
    enemyDmgMult: 1.24,
    startingFood: 10,
    baseFoodRate: 0.88,
    coinPerKill: 15,
    victoryBonusCoins: 196,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 1,
      trickleDelay: 6.2,
      wave1: { melee: 5, ranged: 3, heavy: 0 }, // 8
      wave2: { melee: 8, ranged: 5, heavy: 1 }, // 14
      wave3: { melee: 12, ranged: 6, heavy: 2 }, // 20
      hugeIntervalScale: 0.92,
    }),
  },

  // Chapter 5 — Starlight Kin (Escalating 1 : 1.8 : 3 + Sawtooth)
  {
    id: '5-1',
    chapter: 5,
    battle: 1,
    title: 'Lantern Meadow',
    enemyAgeIndex: 4,
    enemyBaseHp: 7100,
    enemyHpMult: 1.2,
    enemyDmgMult: 1.18,
    startingFood: 10,
    baseFoodRate: 0.92,
    coinPerKill: 18,
    victoryBonusCoins: 230,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 2,
      trickleDelay: 6.0,
      wave1: { melee: 5, ranged: 3, heavy: 0 }, // 8
      wave2: { melee: 9, ranged: 5, heavy: 1 }, // 15
      wave3: { melee: 13, ranged: 7, heavy: 2 }, // 22
      hugeIntervalScale: 0.92,
    }),
  },
  {
    id: '5-2',
    chapter: 5,
    battle: 2,
    title: 'Astral Causeway',
    enemyAgeIndex: 4,
    enemyBaseHp: 8900,
    enemyHpMult: 1.44,
    enemyDmgMult: 1.4,
    startingFood: 10,
    baseFoodRate: 0.92,
    coinPerKill: 24,
    victoryBonusCoins: 300,
    waves: buildPvzStageWaves({
      trickleMelee: 3,
      trickleRanged: 2,
      trickleDelay: 5.4,
      wave1: { melee: 6, ranged: 3, heavy: 1 }, // 10
      wave2: { melee: 10, ranged: 5, heavy: 2 }, // 17
      wave3: { melee: 14, ranged: 8, heavy: 2 }, // 24
      hugeIntervalScale: 0.82,
    }),
  },
  {
    id: '5-3',
    chapter: 5,
    battle: 3,
    title: 'Crown Observatory',
    enemyAgeIndex: 4,
    enemyBaseHp: 10800,
    enemyHpMult: 1.32,
    enemyDmgMult: 1.28,
    startingFood: 10,
    baseFoodRate: 0.92,
    coinPerKill: 26,
    victoryBonusCoins: 360,
    waves: buildPvzStageWaves({
      trickleMelee: 2,
      trickleRanged: 2,
      trickleDelay: 5.8,
      wave1: { melee: 5, ranged: 3, heavy: 0 }, // 8
      wave2: { melee: 9, ranged: 5, heavy: 1 }, // 15
      wave3: { melee: 13, ranged: 7, heavy: 2 }, // 22
      hugeIntervalScale: 0.9,
    }),
  },
];

export function getFoodUpgradeCost(currentLevel: number): number {
  return Math.round(10 + (currentLevel - 1) * 7 + Math.pow(currentLevel - 1, 1.35) * 2);
}

export function getBaseUpgradeCost(currentLevel: number): number {
  return Math.round(10 + (currentLevel - 1) * 7 + Math.pow(currentLevel - 1, 1.35) * 2);
}

export function computeFoodRate(baseRate: number, foodLevel: number): number {
  return Number((baseRate + (foodLevel - 1) * 0.14).toFixed(2));
}

export function getTimelineEnemyMult(timeline: number): number {
  return Number(Math.pow(1.65, Math.max(0, timeline - 1)).toFixed(2));
}

export function getTimelineAllyMult(timeline: number): number {
  return Number(Math.pow(1.42, Math.max(0, timeline - 1)).toFixed(2));
}

export function getTimelineCoinMult(timeline: number): number {
  return Number(Math.pow(1.45, Math.max(0, timeline - 1)).toFixed(2));
}

export function computeAllyBaseMaxHp(
  baseLevel: number,
  ageIndex: number,
  timeline = 1
): number {
  const ageBonus = AGES[Math.min(AGES.length - 1, ageIndex)].baseHpBonus;
  return Math.round((380 + (baseLevel - 1) * 90 + ageBonus) * getTimelineAllyMult(timeline));
}


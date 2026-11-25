import {
  AGES,
  computeAllyBaseMaxHp,
  computeFoodRate,
  getBaseUpgradeCost,
  getFoodUpgradeCost,
  getTimelineAllyMult,
  getTimelineCoinMult,
  getTimelineEnemyMult,
} from './content';
import type {
  BattleState,
  BattleUnit,
  Faction,
  SaveData,
  StageSpec,
  UnitRole,
} from './types';

export const WORLD_WIDTH = 360;
export const ALLY_BASE_X = 38;
export const ENEMY_BASE_X = 322;
export const GIANT_BEHIND_BASE_CLEARANCE = 24;
export const GIANT_BEHIND_BASE_LANE = -0.62;
const GIANT_LANE_SLOTS = [-0.14, 0.34, -0.52] as const;
const GIANT_RANGE_STAGGER = [0, 8, -6] as const;
const GIANT_LANE_MIN = -0.58;
const GIANT_LANE_MAX = 0.48;
const GIANT_TARGET_LANE_INFANTRY = 0.52;
const GIANT_TARGET_LANE_GIANT = 0.85;
const GIANT_SLAM_LANE_RADIUS = 0.58;
const MAX_ALLY_ELITES = 30;
const MAX_UNITS_PER_SIDE = 95;
const MAX_PARTICLES = 160;

export type BattleSoundEvent =
  | 'summon'
  | 'hit_light'
  | 'hit_heavy'
  | 'kill'
  | 'upgrade'
  | 'evolve'
  | 'victory'
  | 'defeat'
  | 'wave_warn'
  | 'wave_drum'
  | 'giant_stomp'
  | 'giant_slam'
  | 'charge';

export type CollisionEventKind =
  | 'frontline_engage'
  | 'melee_clash'
  | 'heavy_impact'
  | 'projectile_hit';

export interface UnitCollisionEvent {
  kind: CollisionEventKind;
  x: number;
  intensity: number;
  allyCount: number;
  enemyCount: number;
  /** -1 = pushed back toward ally base, 0 = deadlocked midfield, +1 = pushing enemy base */
  tugOfWarBalance: number;
  attackerFaction: Faction;
  attackerRole: UnitRole;
  defenderRole: UnitRole;
}

const HUGE_WAVE_WARNING_SECONDS = 3.5;

function emitUnitCollision(
  state: BattleState,
  onCollision: ((ev: UnitCollisionEvent) => void) | undefined,
  kind: CollisionEventKind,
  x: number,
  attackerFaction: Faction,
  attackerRole: UnitRole,
  defenderRole: UnitRole,
  baseIntensity: number
): void {
  if (!onCollision) return;
  let allyCount = 0;
  let enemyCount = 0;
  for (const unit of state.units) {
    if (unit.state === 'die') continue;
    if (Math.abs(unit.x - x) <= 58) {
      if (unit.faction === 'ally') allyCount += 1;
      else enemyCount += 1;
    }
  }
  const crowdBonus = Math.min(0.45, Math.max(0, allyCount + enemyCount - 2) * 0.065);
  const tugOfWarBalance = Math.max(-1, Math.min(1, (x - WORLD_WIDTH / 2) / 130));
  onCollision({
    kind,
    x,
    intensity: Math.max(0.25, Math.min(1, baseIntensity + crowdBonus)),
    allyCount,
    enemyCount,
    tugOfWarBalance,
    attackerFaction,
    attackerRole,
    defenderRole,
  });
}

function getWaveComposition(wave: StageSpec['waves'][number]): {
  melee: number;
  ranged: number;
  heavy: number;
} {
  const comp = { melee: 0, ranged: 0, heavy: 0 };
  if (wave.groups && wave.groups.length > 0) {
    for (const grp of wave.groups) {
      comp[grp.role] += grp.count;
    }
  } else {
    comp[wave.role] += wave.count;
  }
  return comp;
}

function nextRand(state: BattleState): number {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function computeStageWaveMeta(waves: StageSpec['waves']): {
  totalDuration: number;
  flags: number[];
} {
  if (waves.length === 0) return { totalDuration: 0, flags: [] };
  let elapsed = 0;
  const hugeTimes: number[] = [];
  for (const w of waves) {
    elapsed += w.delay;
    if (w.hugeWaveIndex) {
      hugeTimes.push(elapsed);
    }
  }
  const totalDuration = Math.max(1, elapsed);
  const flags = hugeTimes.map((t) => Number(Math.min(1, t / totalDuration).toFixed(4)));
  return { totalDuration, flags };
}

export function createBattleState(
  stage: StageSpec,
  save: SaveData,
  bonusFoodStart = 0,
  openingSurgeSeconds = 0
): BattleState {
  const timeline = Math.max(1, save.timeline || 1);
  const allyBaseMax = computeAllyBaseMaxHp(save.baseLevel, save.allyAgeIndex, timeline);
  const enemyBaseMax = Math.round(stage.enemyBaseHp * getTimelineEnemyMult(timeline));
  const firstWave = stage.waves[0];
  const waveMeta = computeStageWaveMeta(stage.waves);

  return {
    stage,
    timeline,
    phase: 'playing',
    time: 0,
    speedMultiplier: 1,
    food: stage.startingFood + bonusFoodStart,
    maxFood: 56 + save.allyAgeIndex * 8,
    openingSurgeTimer: Math.max(0, openingSurgeSeconds),
    openingSurgeDuration: Math.max(0, openingSurgeSeconds),
    foodLevel: save.foodLevel,
    baseLevel: save.baseLevel,
    allyAgeIndex: save.allyAgeIndex,
    coins: save.coins,
    coinsEarnedThisRun: 0,
    unitsDeployed: 0,
    enemiesDefeated: 0,
    allyBaseHp: allyBaseMax,
    allyBaseMaxHp: allyBaseMax,
    allyBaseDamageTaken: 0,
    enemyBaseHp: enemyBaseMax,
    enemyBaseMaxHp: enemyBaseMax,
    allyBaseHitFlash: 0,
    enemyBaseHitFlash: 0,
    hitstopTimer: 0,
    cameraTrauma: 0,
    units: [],
    projectiles: [],
    particles: [],
    callouts: [],
    nextId: 1,
    waveCursor: 0,
    waveTimer: firstWave ? firstWave.delay : 3,
    waveScriptDuration: waveMeta.totalDuration,
    waveProgress: 0,
    hugeWaveFlags: waveMeta.flags,
    hugeWavesTriggered: 0,
    incomingHugeWave: null,
    activeHugeWaveBanner: null,
    hugeWaveWarnedCursor: -1,
    enemyDoorAlertTimer: 0,
    waveTensionLevel: 0,
    waveDrumTimer: 0,
    tremorPulse: 0,
    slamWaves: [],
    groundCracks: [],
    allWavesDeployed: false,
    finalChargeActive: false,
    pendingSpawns: [],
    endBeatTimer: 0,
    endBeatDuration: 0.95,
    seed: 1337 + stage.chapter * 97 + stage.battle * 31 + timeline * 17,
  };
}

export function seedTitleShowcase(state: BattleState): void {
  if (state.units.length > 0) return;
  const allyAge = state.allyAgeIndex;
  const enemyAge = state.stage.enemyAgeIndex;

  // Proposal A showcase: 3 Royal Vanguard Elites (incl. towering mid-back Giant) vs 7 Hearthclan Grunts
  const allyPresets: Array<{ role: UnitRole; x: number; lane: number }> = [
    { role: 'ranged', x: 102, lane: 0.38 },
    { role: 'heavy', x: 136, lane: -0.16 },
    { role: 'melee', x: 166, lane: 0.22 },
  ];
  const enemyPresets: Array<{ role: UnitRole; x: number; lane: number }> = [
    { role: 'melee', x: 184, lane: -0.35 },
    { role: 'melee', x: 190, lane: 0.14 },
    { role: 'melee', x: 195, lane: 0.52 },
    { role: 'melee', x: 204, lane: 0.28 },
    { role: 'heavy', x: 224, lane: -0.16 },
    { role: 'ranged', x: 246, lane: -0.42 },
    { role: 'ranged', x: 258, lane: 0.34 },
  ];

  for (const preset of allyPresets) {
    const unit = buildUnit(state, 'ally', preset.role, allyAge);
    unit.x = preset.x;
    unit.laneOffset = preset.lane;
    unit.targetLaneOffset = preset.lane;
    unit.preferredLane = preset.lane;
    unit.spawnAge = 1;
    state.units.push(unit);
  }
  for (const preset of enemyPresets) {
    const unit = buildUnit(state, 'enemy', preset.role, enemyAge);
    unit.x = preset.x;
    unit.laneOffset = preset.lane;
    unit.targetLaneOffset = preset.lane;
    unit.preferredLane = preset.lane;
    unit.spawnAge = 1;
    state.units.push(unit);
  }

  state.food = 14;
  state.waveTimer = 4.0;
  stepBattle(state, 0.04);
}

function buildUnit(
  state: BattleState,
  faction: Faction,
  role: UnitRole,
  ageIndex: number
): BattleUnit {
  const safeAge = Math.min(AGES.length - 1, Math.max(0, ageIndex));
  const spec =
    faction === 'ally'
      ? AGES[safeAge].units[role]
      : AGES[safeAge].enemyUnits[role];
  const isAlly = faction === 'ally';
  const isGiant = role === 'heavy';
  const tlAlly = getTimelineAllyMult(state.timeline);
  const tlEnemy = getTimelineEnemyMult(state.timeline);
  // Keep Ally and Enemy Mechanical Giants neck-and-neck rivals (gentle stage scaling for enemy walkers)
  const stageHpMult = isGiant
    ? 1 + (state.stage.enemyHpMult - 1) * 0.35
    : state.stage.enemyHpMult;
  const stageDmgMult = isGiant
    ? 1 + (state.stage.enemyDmgMult - 1) * 0.35
    : state.stage.enemyDmgMult;
  const hpMult = faction === 'enemy' ? stageHpMult * tlEnemy : tlAlly;
  const dmgMult = faction === 'enemy' ? stageDmgMult * tlEnemy : tlAlly;

  const maxHp = Math.round(spec.hp * hpMult);
  const dmg = Math.max(1, Math.round(spec.dmg * dmgMult));

  // Personal lane preference prevents synchronized hive-mind snapping:
  // - Giants auto-assign across 3 staggered corridors (mid-back, lower-front, upper-back)
  //   plus echelon range stagger so same-faction Giants never overlap while marching or sieging
  // - Ally Ranged cycles cleanly across 3 staggered volley lanes
  // - Ally Melee has gentle individual lane spread; Enemies spread across full road
  let preferredLane: number;
  let giantRangeOffset = 0;
  if (isGiant) {
    const slotCounts = GIANT_LANE_SLOTS.map(() => 0);
    for (const existing of state.units) {
      if (existing.faction !== faction || existing.role !== 'heavy' || existing.state === 'die') {
        continue;
      }
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < GIANT_LANE_SLOTS.length; i++) {
        const d = Math.abs(existing.preferredLane - GIANT_LANE_SLOTS[i]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      slotCounts[nearestIdx] += 1;
    }
    let chosenSlot = 0;
    for (let i = 1; i < slotCounts.length; i++) {
      if (slotCounts[i] < slotCounts[chosenSlot]) {
        chosenSlot = i;
      }
    }
    const occupancy = slotCounts[chosenSlot];
    const extraLaneJitter =
      occupancy === 0 ? 0 : (occupancy % 2 === 1 ? 1 : -1) * (chosenSlot === 1 ? -0.1 : 0.1);
    preferredLane = Math.max(
      GIANT_LANE_MIN,
      Math.min(GIANT_LANE_MAX, GIANT_LANE_SLOTS[chosenSlot] + extraLaneJitter)
    );
    giantRangeOffset =
      GIANT_RANGE_STAGGER[chosenSlot] + (occupancy > 0 ? occupancy * 7 : 0);
  } else if (isAlly && role === 'ranged') {
    const slots = [-0.56, 0.08, 0.62];
    preferredLane = slots[state.nextId % slots.length] + (nextRand(state) * 0.14 - 0.07);
  } else if (isAlly) {
    const meleeSlots = [-0.46, 0.0, 0.46];
    preferredLane = meleeSlots[state.nextId % meleeSlots.length] + (nextRand(state) * 0.16 - 0.08);
  } else {
    preferredLane = nextRand(state) * 1.68 - 0.82;
  }

  // Mechanical Giants stride in from behind the left/right castles so bases are never occluded.
  // If another same-faction Giant just spawned behind the castle, queue slightly behind it.
  let spawnX = isGiant
    ? isAlly
      ? -24
      : WORLD_WIDTH + 24
    : isAlly
      ? ALLY_BASE_X - 4
      : ENEMY_BASE_X - 18;
  if (isGiant) {
    for (const existing of state.units) {
      if (existing.faction !== faction || existing.role !== 'heavy' || existing.state === 'die') {
        continue;
      }
      if (isAlly && existing.x < ALLY_BASE_X + 12) {
        spawnX = Math.min(spawnX, existing.x - 22);
      } else if (!isAlly && existing.x > ENEMY_BASE_X - 12) {
        spawnX = Math.max(spawnX, existing.x + 22);
      }
    }
  }
  const spawnLane = isGiant ? GIANT_BEHIND_BASE_LANE : isAlly ? 0 : preferredLane;

  return {
    id: state.nextId++,
    faction,
    role,
    ageIndex: safeAge,
    x: spawnX,
    laneOffset: spawnLane,
    targetLaneOffset: isGiant ? GIANT_BEHIND_BASE_LANE : preferredLane,
    preferredLane,
    spawnAge: isAlly && !isGiant ? 0 : 1,
    hp: maxHp,
    maxHp,
    dmg,
    range: Math.max(24, spec.range + giantRangeOffset),
    speed: spec.speed * (0.95 + nextRand(state) * 0.1),
    attackCooldown: spec.attackCooldown,
    cooldownTimer: nextRand(state) * 0.16,
    attackAnimTimer: 0,
    hitFlashTimer: 0,
    walkPhase: nextRand(state) * Math.PI * 2,
    state: 'walk',
    dieTimer: 0,
    scale: spec.scale,
    splashRadius: spec.splashRadius ?? 0,
    cleaveCount: spec.cleaveCount ?? 1,
    pierceCount: spec.pierceCount ?? 1,
    knockback: spec.knockback ?? 0,
    auraDefense: spec.auraDefense ?? 0,
    armorReduction: spec.armorReduction ?? 0,
    knockbackImmune: spec.knockbackImmune ?? false,
    engaged: isAlly,
    engageTimer: 0,
    aggroAlertTimer: 0,
    lockedTargetId: null,
  };
}

export function summonPlayerUnit(
  state: BattleState,
  role: UnitRole,
  onSound?: (ev: BattleSoundEvent) => void
): boolean {
  if (state.phase !== 'playing') return false;

  const ageSpec = AGES[Math.min(AGES.length - 1, state.allyAgeIndex)];
  const spec = ageSpec.units[role];
  if (state.food < spec.cost) return false;

  const allyCount = state.units.filter((u) => u.faction === 'ally' && u.state !== 'die').length;
  if (allyCount >= MAX_ALLY_ELITES) return false;

  state.food -= spec.cost;
  state.unitsDeployed++;
  const unit = buildUnit(state, 'ally', role, state.allyAgeIndex);
  state.units.push(unit);

  if (role === 'heavy') {
    state.tremorPulse = Math.max(state.tremorPulse, 0.85);
    state.slamWaves.push({
      x: 12,
      yOffset: unit.preferredLane,
      faction: 'ally',
      progress: 0,
      radius: 32,
    });
    emitBurst(state, 10, unit.preferredLane, '#E9BA58', 12);
    emitBurst(state, 10, unit.preferredLane + 0.06, '#8C745A', 8);
    onSound?.('giant_stomp');
  } else {
    emitBurst(state, ALLY_BASE_X + 2, 0, '#C98A2C', 6);
    onSound?.('summon');
  }
  return true;
}

export function upgradeFoodInBattle(
  state: BattleState,
  onSound?: (ev: BattleSoundEvent) => void
): boolean {
  if (state.phase !== 'playing') return false;
  const cost = getFoodUpgradeCost(state.foodLevel);
  if (state.coins < cost) return false;

  state.coins -= cost;
  state.foodLevel += 1;
  emitCallout(state, ALLY_BASE_X + 14, -0.4, `Food Lv.${state.foodLevel}`, 'evolve');
  onSound?.('upgrade');
  return true;
}

export function upgradeBaseInBattle(
  state: BattleState,
  onSound?: (ev: BattleSoundEvent) => void
): boolean {
  if (state.phase !== 'playing') return false;
  const cost = getBaseUpgradeCost(state.baseLevel);
  if (state.coins < cost) return false;

  state.coins -= cost;
  state.baseLevel += 1;
  const newMax = computeAllyBaseMaxHp(state.baseLevel, state.allyAgeIndex, state.timeline);
  const delta = Math.max(0, newMax - state.allyBaseMaxHp);
  state.allyBaseMaxHp = newMax;
  state.allyBaseHp = Math.min(newMax, state.allyBaseHp + delta);
  emitCallout(state, ALLY_BASE_X + 10, -0.6, `+${delta} Base HP`, 'evolve');
  onSound?.('upgrade');
  return true;
}

export function evolveAgeInBattle(
  state: BattleState,
  onSound?: (ev: BattleSoundEvent) => void
): boolean {
  if (state.phase !== 'playing') return false;
  if (state.allyAgeIndex >= AGES.length - 1) return false;

  const currentAge = AGES[state.allyAgeIndex];
  if (state.coins < currentAge.evolveCost) return false;

  state.coins -= currentAge.evolveCost;
  state.allyAgeIndex += 1;
  state.maxFood = 56 + state.allyAgeIndex * 8;

  const newMax = computeAllyBaseMaxHp(state.baseLevel, state.allyAgeIndex, state.timeline);
  const hpGain = Math.max(0, newMax - state.allyBaseMaxHp);
  state.allyBaseMaxHp = newMax;
  state.allyBaseHp = Math.min(newMax, state.allyBaseHp + hpGain + Math.round(newMax * 0.25));

  const nextAge = AGES[state.allyAgeIndex];
  emitBurst(state, ALLY_BASE_X + 12, 0, '#C98A2C', 18);
  emitCallout(state, ALLY_BASE_X + 24, -0.5, nextAge.name.toUpperCase(), 'evolve');
  onSound?.('evolve');
  return true;
}

export function stepBattle(
  state: BattleState,
  rawDt: number,
  onSound?: (ev: BattleSoundEvent) => void,
  onCollision?: (ev: UnitCollisionEvent) => void
): void {
  const realDt = Math.min(Math.max(rawDt, 0), 0.05);
  if (realDt <= 0) return;

  // Trauma decays rapidly outside pre-wave shake window; tremor decays smoothly
  const traumaDecay = state.incomingHugeWave ? 1.8 : 4.0;
  const tremorDecay = state.incomingHugeWave ? 1.6 : 2.4;
  state.cameraTrauma = Math.max(0, state.cameraTrauma - realDt * traumaDecay);
  state.tremorPulse = Math.max(0, state.tremorPulse - realDt * tremorDecay);
  state.allyBaseHitFlash = Math.max(0, state.allyBaseHitFlash - realDt);
  state.enemyBaseHitFlash = Math.max(0, state.enemyBaseHitFlash - realDt);

  if (state.phase !== 'playing') {
    state.endBeatTimer = Math.max(0, state.endBeatTimer - realDt);
    updateVisualParticles(state, realDt);
    return;
  }

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - realDt);
    updateVisualParticles(state, realDt);
    return;
  }

  const dt = realDt * state.speedMultiplier;
  state.time += dt;

  // 1. Food generation (with optional post-defeat Comeback Supply Surge x1.5)
  const surgeMult = state.openingSurgeTimer > 0 ? 1.5 : 1;
  if (state.openingSurgeTimer > 0) {
    state.openingSurgeTimer = Math.max(0, state.openingSurgeTimer - dt);
  }
  const foodRate = computeFoodRate(state.stage.baseFoodRate, state.foodLevel) * surgeMult;
  state.food = Math.min(state.maxFood, state.food + foodRate * dt);

  // 2. Enemy wave director
  stepEnemyWaves(state, dt, onSound);

  // 3. Units AI & combat
  for (const u of state.units) {
    u.hitFlashTimer = Math.max(0, u.hitFlashTimer - realDt);
    u.attackAnimTimer = Math.max(0, u.attackAnimTimer - dt);

    if (u.state === 'die') {
      u.dieTimer -= dt;
      continue;
    }

    u.spawnAge += dt;
    u.cooldownTimer = Math.max(0, u.cooldownTimer - dt);
    if ((u.aggroAlertTimer ?? 0) > 0) {
      u.aggroAlertTimer = Math.max(0, (u.aggroAlertTimer ?? 0) - dt);
    }
    if (u.faction === 'enemy' && (u.engageTimer ?? 0) > 0) {
      u.engageTimer = Math.max(0, (u.engageTimer ?? 0) - dt);
    }
    const dir = u.faction === 'ally' ? 1 : -1;

    // Enemy stateless Rush <-> Stop-and-Fight logic (zero aggro memory, zero chasing):
    // - By default enemies rush straight along their own lane toward the ally castle
    // - Taking damage, being body-blocked head-on by an ally Melee knight, or meeting an ally Giant
    //   activates a brief engageTimer so they stop to fight allies right inside their local attack range
    // - They NEVER chase or steer sideways; the moment no ally is in range, they keep walking straight to our castle
    if (u.faction === 'enemy') {
      if (u.role === 'heavy') {
        for (const ally of state.units) {
          if (ally.faction !== 'ally' || ally.role !== 'heavy' || ally.state === 'die') continue;
          const dx = (ally.x - u.x) * dir;
          if (
            dx >= -18 &&
            dx <= u.range &&
            Math.abs(ally.laneOffset - u.laneOffset) <= GIANT_TARGET_LANE_GIANT
          ) {
            triggerEnemyCombatStop(u);
            break;
          }
        }
      } else {
        for (const ally of state.units) {
          if (ally.faction !== 'ally' || ally.role !== 'melee' || ally.state === 'die') continue;
          if (Math.abs(ally.x - u.x) <= 15 && Math.abs(ally.laneOffset - u.laneOffset) <= 0.28) {
            triggerEnemyCombatStop(u);
            break;
          }
        }
      }
    }

    // Acquire opponent in range:
    // - Ally Melee: locks onto one castle-threatening, load-balanced enemy during march and stays
    //   committed along a straight diagonal intercept until entering 2D melee reach and killing it.
    // - Ally Ranged & Heavy: prioritize enemies closest to ally castle and lock until killed.
    // - Enemies: only stop to fight if recently struck/body-blocked (engageTimer > 0) AND an ally is
    //   right inside their local attack range.
    let targetUnit: BattleUnit | null = null;
    let marchLockedUnit: BattleUnit | null = null;
    let bestScore = Infinity;
    const minDx = u.role === 'ranged' ? -u.range * 0.85 : -u.range;
    const shouldTargetUnits = u.faction === 'ally' || (u.engageTimer ?? 0) > 0;

    if (u.faction === 'ally' && u.role === 'melee') {
      if (u.lockedTargetId != null) {
        const locked = state.units.find(
          (other) =>
            other.id === u.lockedTargetId &&
            other.faction === 'enemy' &&
            other.state !== 'die'
        );
        if (locked && locked.x >= u.x - 58 && locked.x - u.x <= 250) {
          marchLockedUnit = locked;
        } else {
          u.lockedTargetId = null;
        }
      }

      // If locked target is already in true 2D melee reach, engage it immediately
      if (marchLockedUnit) {
        const lockedDx = (marchLockedUnit.x - u.x) * dir;
        if (
          lockedDx >= minDx &&
          lockedDx <= u.range &&
          isInMeleeLaneReach(u, marchLockedUnit)
        ) {
          targetUnit = marchLockedUnit;
        }
      }

      // Point-blank self-defense: if an enemy collides right into our sword while we are still marching
      // toward a distant target, lock onto this colliding enemy immediately instead of walking through it
      if (!targetUnit) {
        let pointBlank: BattleUnit | null = null;
        let pointBlankScore = Infinity;
        for (const other of state.units) {
          if (other.faction !== 'enemy' || other.state === 'die') continue;
          const dx = (other.x - u.x) * dir;
          if (dx >= minDx && dx <= u.range && isInMeleeLaneReach(u, other)) {
            const laneDiff = Math.abs(other.laneOffset - u.laneOffset);
            const sc = dx + laneDiff * 10;
            if (sc < pointBlankScore) {
              pointBlankScore = sc;
              pointBlank = other;
            }
          }
        }
        if (pointBlank) {
          u.lockedTargetId = pointBlank.id;
          marchLockedUnit = pointBlank;
          targetUnit = pointBlank;
        }
      }

      // No locked march target yet -> acquire one load-balanced castle-threatening enemy cleanly
      if (!targetUnit && !marchLockedUnit) {
        const acquired = acquireAllyMarchTarget(state, u);
        if (acquired) {
          u.lockedTargetId = acquired.id;
          marchLockedUnit = acquired;
          const dx = (acquired.x - u.x) * dir;
          if (dx >= minDx && dx <= u.range && isInMeleeLaneReach(u, acquired)) {
            targetUnit = acquired;
          }
        }
      }
    } else if (u.faction === 'ally' && u.lockedTargetId != null) {
      const locked = state.units.find(
        (other) =>
          other.id === u.lockedTargetId &&
          other.faction !== u.faction &&
          other.state !== 'die'
      );
      if (locked) {
        const lockedDx = (locked.x - u.x) * dir;
        const keepBuffer = u.role === 'heavy' ? 22 : 24;
        const inHeavyLane = u.role !== 'heavy' || isInHeavyLaneReach(u, locked, 0.06);
        if (lockedDx >= minDx && lockedDx <= u.range && inHeavyLane) {
          targetUnit = locked;
        } else if (lockedDx < minDx - 8 || lockedDx > u.range + keepBuffer || !inHeavyLane) {
          u.lockedTargetId = null;
        }
      } else {
        u.lockedTargetId = null;
      }
    }

    if (
      !targetUnit &&
      shouldTargetUnits &&
      !(u.faction === 'ally' && u.role === 'melee') &&
      (u.faction !== 'ally' || u.lockedTargetId == null)
    ) {
      for (const other of state.units) {
        if (other.faction === u.faction || other.state === 'die') continue;
        const dx = (other.x - u.x) * dir;
        if (dx >= minDx && dx <= u.range) {
          const laneDiff = Math.abs(other.laneOffset - u.laneOffset);
          if (u.faction === 'enemy' && u.role === 'melee' && laneDiff > 0.55) {
            continue;
          }
          if (u.role === 'heavy' && !isInHeavyLaneReach(u, other)) {
            continue;
          }
          const score = dx + laneDiff * 2.5;
          if (score < bestScore) {
            bestScore = score;
            targetUnit = other;
          }
        }
      }
      if (u.faction === 'ally' && targetUnit) {
        u.lockedTargetId = targetUnit.id;
      }
    }

    // Enemies never chase: if actively fighting an ally who leaves range or dies, drop engagement immediately
    // and resume marching straight toward the ally castle along their own lane
    if (u.faction === 'enemy') {
      if (targetUnit) {
        u.engaged = true;
        u.engageTimer = Math.max(u.engageTimer ?? 0, 1.4);
      } else {
        if (u.engaged) {
          u.engaged = false;
          u.engageTimer = 0;
        }
      }
    }

    const oppBaseEdge = u.faction === 'ally' ? ENEMY_BASE_X - 18 : ALLY_BASE_X + 18;
    const distToBase = (oppBaseEdge - u.x) * dir;
    const canHitBase = !targetUnit && distToBase <= u.range;

    if (targetUnit || canHitBase) {
      const wasWalking = u.state === 'walk';
      u.state = 'attack';

      // Gentle deadzoned lane settle during melee duel (only nudges if visibly off-center, zero jitter)
      if (targetUnit && u.faction === 'ally' && u.role === 'melee') {
        const fightSlot = ((u.id % 3) - 1) * 0.09;
        const idealLane = Math.max(-0.85, Math.min(0.85, targetUnit.laneOffset + fightSlot));
        const laneDelta = idealLane - u.laneOffset;
        if (Math.abs(laneDelta) > 0.14) {
          const step = Math.min(Math.abs(laneDelta), 0.34 * dt);
          u.laneOffset = Math.max(-0.88, Math.min(0.88, u.laneOffset + Math.sign(laneDelta) * step));
        }
      }

      // First contact when advancing melee/heavy troops collide with an opposing line
      if (wasWalking && targetUnit && u.role !== 'ranged') {
        const clashX = (u.x + targetUnit.x) * 0.5;
        const isHeavyEngage = u.role === 'heavy' || targetUnit.role === 'heavy';
        emitUnitCollision(
          state,
          onCollision,
          'frontline_engage',
          clashX,
          u.faction,
          u.role,
          targetUnit.role,
          isHeavyEngage ? 0.78 : 0.56
        );
      }

      if (u.cooldownTimer <= 0) {
        u.cooldownTimer = u.attackCooldown;
        u.attackAnimTimer = u.role === 'heavy' ? 0.52 : 0.26;

        if (u.role === 'ranged') {
          const LANE_TO_WORLD_X = 68;
          const sx = u.x;
          const sy = u.laneOffset;
          const isAllyShot = u.faction === 'ally';
          const baseTx = targetUnit ? targetUnit.x : oppBaseEdge;
          const aimY = targetUnit ? targetUnit.laneOffset : 0;
          const isPiercingAlly = isAllyShot && u.pierceCount > 1;
          let tx = baseTx;
          let ty = aimY;
          if (isPiercingAlly && targetUnit) {
            const vx = baseTx - sx;
            const vy = aimY - sy;
            const aimDist2D = Math.hypot(vx, vy * LANE_TO_WORLD_X);
            let maxS = 1 + 95 / Math.max(12, aimDist2D);
            if (vx > 0.001) {
              maxS = Math.min(maxS, (ENEMY_BASE_X - 14 - sx) / vx);
            } else if (vx < -0.001) {
              maxS = Math.min(maxS, (ALLY_BASE_X + 6 - sx) / vx);
            }
            if (vy > 0.001) {
              maxS = Math.min(maxS, (0.98 - sy) / vy);
            } else if (vy < -0.001) {
              maxS = Math.min(maxS, (-0.98 - sy) / vy);
            }
            const finalS = Math.max(1.0, maxS);
            tx = sx + vx * finalS;
            ty = sy + vy * finalS;
          }
          const travelDist2D = Math.hypot(tx - sx, (ty - sy) * LANE_TO_WORLD_X);
          state.projectiles.push({
            id: state.nextId++,
            faction: u.faction,
            ageIndex: u.ageIndex,
            x: sx,
            yOffset: sy,
            startX: sx,
            targetX: tx,
            targetYOffset: ty,
            progress: 0,
            duration: Math.max(0.14, travelDist2D / (isAllyShot ? 245 : 185)),
            dmg: u.dmg,
            arcHeight: isAllyShot
              ? 4.5 + travelDist2D * 0.035
              : 16 + travelDist2D * 0.13,
            pierceRemaining: Math.max(1, u.pierceCount),
            hitUnitIds: [],
            aimedAtBase: !targetUnit,
          });
        } else if (targetUnit) {
          applyUnitHit(state, u, targetUnit, onSound, onCollision);
        } else if (canHitBase) {
          const hitBase: Faction = u.faction === 'ally' ? 'enemy' : 'ally';
          const isGiant = u.role === 'heavy';
          let siegeDmg = isGiant ? Math.round(u.dmg * 1.35) : u.dmg;
          if (u.faction === 'ally' && state.finalChargeActive) {
            siegeDmg = Math.round(siegeDmg * 1.5);
          }
          applyBaseHit(state, hitBase, siegeDmg, isGiant, onSound);
        }
      }
    } else {
      u.state = 'walk';
      const moveSpeed =
        u.faction === 'ally' && state.finalChargeActive ? u.speed * 1.8 : u.speed;
      const prevPhase = u.walkPhase;
      let stepX = dir * moveSpeed * dt;
      if (u.faction === 'ally' && u.role === 'melee' && marchLockedUnit) {
        // Intercept locked enemy cleanly in 2D without overshooting past it while closing vertical distance
        const interceptX = marchLockedUnit.x - Math.min(12, u.range * 0.65);
        if (u.x < interceptX - 2) {
          stepX = Math.min(moveSpeed * dt, interceptX - u.x);
        } else if (u.x > marchLockedUnit.x + Math.min(10, u.range * 0.55)) {
          // Locked enemy slipped slightly behind -> turn to intercept and finish it
          stepX = -Math.min(moveSpeed * 0.85 * dt, u.x - marchLockedUnit.x);
        } else {
          // Already horizontally aligned -> hold X while gliding smoothly vertically into melee reach
          stepX = 0;
        }
      }
      u.x += stepX;
      u.walkPhase += moveSpeed * dt * (u.role === 'heavy' ? 0.34 : 0.45);

      // Weighty Mechanical Colossus hydraulic footstep dust, smokestack exhaust & micro-tremor
      if (
        u.role === 'heavy' &&
        u.x >= -10 &&
        u.x <= WORLD_WIDTH + 10 &&
        Math.floor(prevPhase / Math.PI) !== Math.floor(u.walkPhase / Math.PI)
      ) {
        state.tremorPulse = Math.max(state.tremorPulse, 0.24);
        emitBurst(state, u.x, u.laneOffset + 0.08, '#9A8366', 3);
        if (u.faction === 'enemy') {
          // Dark coal smoke + hot ember from enemy siege walker smokestacks
          emitBurst(state, u.x + 6, u.laneOffset - 0.72, '#4A3E3A', 3);
          emitBurst(state, u.x + 4, u.laneOffset - 0.65, '#E06A3B', 1);
        } else {
          // Warm brass steam puff from ally colossus vents
          emitBurst(state, u.x - 5, u.laneOffset - 0.55, '#F3D37A', 2);
        }
      }

      if (u.faction === 'ally') {
        if (u.role === 'heavy' && u.x < ALLY_BASE_X + GIANT_BEHIND_BASE_CLEARANCE) {
          // Ally Colossus strides cleanly BEHIND the ally castle before curving onto the road
          u.laneOffset = GIANT_BEHIND_BASE_LANE;
          u.targetLaneOffset = GIANT_BEHIND_BASE_LANE;
        } else if (u.role !== 'heavy' && u.x <= ALLY_BASE_X + 1) {
          // Small allies stay centered inside doorway arch while pushing out
          u.laneOffset = 0;
        } else {
          const desiredLane = computeAllyDesiredLane(state, u, marchLockedUnit);
          u.targetLaneOffset = desiredLane;
          const curvingOutFromBase =
            u.role === 'heavy' && Math.abs(u.laneOffset - desiredLane) > 0.14;
          const maxLatSpeed = state.finalChargeActive
            ? 0.95
            : curvingOutFromBase
              ? 0.58
              : u.role === 'heavy'
                ? 0.34
                : u.role === 'ranged'
                  ? 0.34
                  : marchLockedUnit
                    ? 0.78
                    : 0.52;
          const delta = desiredLane - u.laneOffset;
          const deadzone = u.role === 'heavy' ? 0.02 : 0.04;
          if (Math.abs(delta) > deadzone) {
            const maxStep = maxLatSpeed * dt;
            if (Math.abs(delta) <= maxStep) {
              u.laneOffset = desiredLane;
            } else {
              u.laneOffset += Math.sign(delta) * maxStep;
            }
            u.laneOffset = Math.max(-0.88, Math.min(0.88, u.laneOffset));
          }
        }
      } else if (u.role === 'heavy') {
        // Enemy Siege Walker strides BEHIND the enemy tower, then curves smoothly onto its assigned lane
        if (u.x > ENEMY_BASE_X - GIANT_BEHIND_BASE_CLEARANCE) {
          u.laneOffset = GIANT_BEHIND_BASE_LANE;
          u.targetLaneOffset = GIANT_BEHIND_BASE_LANE;
        } else {
          const desiredLane = Math.max(
            GIANT_LANE_MIN,
            Math.min(GIANT_LANE_MAX, u.preferredLane)
          );
          u.targetLaneOffset = desiredLane;
          const delta = desiredLane - u.laneOffset;
          const maxStep = 0.58 * dt;
          if (Math.abs(delta) <= maxStep) {
            u.laneOffset = desiredLane;
          } else {
            u.laneOffset += Math.sign(delta) * maxStep;
          }
        }
      }
    }
  }

  // 3b. Lightweight 2D soft-separation between same-faction Giants so they never fuse into one silhouette
  applyGiantSoftSeparation(state, dt);

  // 4. Projectiles (narrow-corridor 2D segment-sweep deep-piercing arrows slice reliably in any direction)
  const ARROW_HIT_X = 11;
  const ARROW_HIT_LANE = 0.28;
  const ARROW_HIT_LANE_GIANT = 0.44;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    const prevT = Math.min(1, p.progress);
    const prevX = p.startX + (p.targetX - p.startX) * prevT;
    const prevY = p.yOffset + (p.targetYOffset - p.yOffset) * prevT;

    p.progress += dt / p.duration;
    const t = Math.min(1, p.progress);
    p.x = p.startX + (p.targetX - p.startX) * t;
    const curY = p.yOffset + (p.targetYOffset - p.yOffset) * t;

    if (p.faction === 'ally' && p.pierceRemaining > 0) {
      const segDx = p.x - prevX;
      const segDy = curY - prevY;
      const scoredHits: Array<{ unit: BattleUnit; along: number; distSq: number }> = [];

      for (const u of state.units) {
        if (u.faction !== 'enemy' || u.state === 'die' || p.hitUnitIds.includes(u.id)) {
          continue;
        }
        const laneTol = u.role === 'heavy' ? ARROW_HIT_LANE_GIANT : ARROW_HIT_LANE;
        const sxN = segDx / ARROW_HIT_X;
        const syN = segDy / laneTol;
        const segLenSq = sxN * sxN + syN * syN;
        const uProj =
          segLenSq > 1e-6
            ? Math.max(
                0,
                Math.min(
                  1,
                  (((u.x - prevX) / ARROW_HIT_X) * sxN + ((u.laneOffset - prevY) / laneTol) * syN) /
                    segLenSq
                )
              )
            : 1;
        const closestX = prevX + segDx * uProj;
        const closestY = prevY + segDy * uProj;
        const nx = (u.x - closestX) / ARROW_HIT_X;
        const ny = (u.laneOffset - closestY) / laneTol;
        const distSq = nx * nx + ny * ny;
        if (distSq <= 1.0) {
          scoredHits.push({ unit: u, along: uProj, distSq });
        }
      }

      // Hit enemies in strict order along the arrow's actual 2D flight segment
      scoredHits.sort((a, b) => a.along - b.along || a.distSq - b.distSq);

      for (const { unit: hit } of scoredHits) {
        if (p.pierceRemaining <= 0) break;
        const hitOrder = p.hitUnitIds.length;
        p.hitUnitIds.push(hit.id);
        const isFirst = hitOrder === 0;
        // Progressive 15% per-rank pierce falloff (100% -> 85% -> 72% -> 61% -> 52%)
        const falloff = Math.pow(0.85, hitOrder);
        const hitDmg = Math.max(1, Math.round(p.dmg * falloff));
        damageUnit(state, hit, hitDmg, isFirst, onSound);
        if (isFirst) {
          emitUnitCollision(
            state,
            onCollision,
            'projectile_hit',
            hit.x,
            p.faction,
            'ranged',
            hit.role,
            0.35
          );
        } else {
          // Subtle golden pierce spark showing the arrow tore cleanly into deeper ranks
          emitBurst(state, hit.x, hit.laneOffset, '#E9BA58', 3);
        }
        if (!hit.knockbackImmune) {
          hit.x = Math.min(ENEMY_BASE_X - 16, hit.x + (isFirst ? 2.4 : 1.5));
        }
        p.pierceRemaining -= 1;
      }

      if (p.pierceRemaining <= 0) {
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    if (p.progress >= 1) {
      if (p.faction === 'enemy') {
        let hitTarget: BattleUnit | null = null;
        let minScore = 24;
        for (const u of state.units) {
          if (u.faction === p.faction || u.state === 'die') continue;
          const dx = Math.abs(u.x - p.targetX);
          const dy = Math.abs(u.laneOffset - p.targetYOffset);
          if (dx <= 18 && dy <= 0.55) {
            const score = dx + dy * 14;
            if (score < minScore) {
              minScore = score;
              hitTarget = u;
            }
          }
        }
        if (hitTarget) {
          damageUnit(state, hitTarget, p.dmg, false, onSound);
          emitUnitCollision(
            state,
            onCollision,
            'projectile_hit',
            hitTarget.x,
            p.faction,
            'ranged',
            hitTarget.role,
            0.32
          );
        } else {
          const baseEdge = ALLY_BASE_X + 18;
          if (Math.abs(p.targetX - baseEdge) < 38) {
            applyBaseHit(state, 'ally', p.dmg, false, onSound);
          }
        }
      } else if (p.aimedAtBase && p.pierceRemaining > 0 && p.hitUnitIds.length === 0) {
        const enemyBaseEdge = ENEMY_BASE_X - 18;
        if (Math.abs(p.targetX - enemyBaseEdge) < 52) {
          const baseDmg = state.finalChargeActive ? Math.round(p.dmg * 1.5) : p.dmg;
          applyBaseHit(state, 'enemy', baseDmg, false, onSound);
        }
      }
      state.projectiles.splice(i, 1);
    }
  }

  // 5. Prune finished KO animations
  state.units = state.units.filter((u) => !(u.state === 'die' && u.dieTimer <= 0));

  // 6. Visual particles & callouts
  updateVisualParticles(state, dt);

  // 7. Win / Loss resolution (0.95s dramatic collapse / golden dawnbreak beat before modal)
  if (state.enemyBaseHp <= 0) {
    state.enemyBaseHp = 0;
    state.phase = 'victory';
    state.endBeatDuration = 0.95;
    state.endBeatTimer = 0.95;
    state.waveTensionLevel = 0;
    state.incomingHugeWave = null;
    state.activeHugeWaveBanner = null;
    const victoryCoins = Math.round(
      state.stage.victoryBonusCoins * getTimelineCoinMult(state.timeline)
    );
    state.coins += victoryCoins;
    state.coinsEarnedThisRun += victoryCoins;
    state.cameraTrauma = 0;
    emitBurst(state, ENEMY_BASE_X - 8, 0, '#E9BA58', 22);
    emitBurst(state, ENEMY_BASE_X - 6, -0.25, '#FFF3C4', 14);
    emitBurst(state, ENEMY_BASE_X - 10, 0.15, '#9B754E', 10);
    onSound?.('victory');
  } else if (state.allyBaseHp <= 0) {
    state.allyBaseHp = 0;
    state.phase = 'defeat';
    state.endBeatDuration = 0.95;
    state.endBeatTimer = 0.95;
    state.incomingHugeWave = null;
    state.activeHugeWaveBanner = null;
    const defeatCoins = Math.max(
      8,
      Math.round(state.stage.victoryBonusCoins * 0.35 * getTimelineCoinMult(state.timeline))
    );
    state.coins += defeatCoins;
    state.coinsEarnedThisRun += defeatCoins;
    state.cameraTrauma = 0;
    emitBurst(state, ALLY_BASE_X + 8, 0, '#A4423C', 20);
    emitBurst(state, ALLY_BASE_X + 6, -0.2, '#4A3A32', 14);
    onSound?.('defeat');
  }
}

function applyGiantSoftSeparation(state: BattleState, dt: number): void {
  const MIN_DX = 26;
  const MIN_DY = 0.4;
  const factions: Faction[] = ['ally', 'enemy'];

  for (const faction of factions) {
    const giants = state.units.filter(
      (u) =>
        u.faction === faction &&
        u.role === 'heavy' &&
        u.state !== 'die' &&
        (faction === 'ally'
          ? u.x >= ALLY_BASE_X + GIANT_BEHIND_BASE_CLEARANCE
          : u.x <= ENEMY_BASE_X - GIANT_BEHIND_BASE_CLEARANCE)
    );
    if (giants.length < 2) continue;

    const dir = faction === 'ally' ? 1 : -1;
    const oppBaseEdge = faction === 'ally' ? ENEMY_BASE_X - 18 : ALLY_BASE_X + 18;

    for (let i = 0; i < giants.length; i++) {
      for (let j = i + 1; j < giants.length; j++) {
        const a = giants[i];
        const b = giants[j];
        const dx = a.x - b.x;
        const dy = a.laneOffset - b.laneOffset;
        const nx = dx / MIN_DX;
        const ny = dy / MIN_DY;
        const dist = Math.hypot(nx, ny);
        if (dist >= 1) continue;

        const overlap = 1 - dist;
        const sepDirY =
          Math.abs(dy) >= 0.03
            ? Math.sign(dy)
            : Math.abs(a.preferredLane - b.preferredLane) >= 0.05
              ? Math.sign(a.preferredLane - b.preferredLane)
              : a.id < b.id
                ? -1
                : 1;

        // Primary separation along road depth (Y) keeps Giants side-by-side in crisp 2.5D layering
        const pushY = sepDirY * (0.42 + overlap * 0.95) * dt;
        a.laneOffset = Math.max(GIANT_LANE_MIN, Math.min(GIANT_LANE_MAX, a.laneOffset + pushY));
        b.laneOffset = Math.max(GIANT_LANE_MIN, Math.min(GIANT_LANE_MAX, b.laneOffset - pushY));

        // Secondary gentle X stagger (especially helpful when 4+ Giants crowd all 3 depth lanes)
        const sepDirX = Math.abs(dx) >= 1 ? Math.sign(dx) : a.id < b.id ? dir : -dir;
        const pushX = sepDirX * (6 + overlap * 14) * dt;

        const nudgeGiantX = (g: BattleUnit, deltaX: number) => {
          let nextX = Math.max(ALLY_BASE_X + 18, Math.min(ENEMY_BASE_X - 18, g.x + deltaX));
          // Prevent soft-separation from pushing a castle-sieging Giant back out of attack range
          if (g.state === 'attack') {
            const wasInBaseRange = (oppBaseEdge - g.x) * dir <= g.range;
            if (wasInBaseRange) {
              const maxRetreatDist = g.range - 2;
              if ((oppBaseEdge - nextX) * dir > maxRetreatDist) {
                nextX = oppBaseEdge - dir * maxRetreatDist;
              }
            }
          }
          g.x = nextX;
        };

        nudgeGiantX(a, pushX);
        nudgeGiantX(b, -pushX);
      }
    }
  }
}

function isInMeleeLaneReach(attacker: BattleUnit, target: BattleUnit): boolean {
  if (attacker.role !== 'melee') return true;
  const maxLaneDiff =
    attacker.faction === 'ally'
      ? target.role === 'heavy'
        ? 0.48
        : 0.34
      : 0.55;
  return Math.abs(target.laneOffset - attacker.laneOffset) <= maxLaneDiff;
}

function isInHeavyLaneReach(
  attacker: BattleUnit,
  target: BattleUnit,
  extraGrace = 0
): boolean {
  if (attacker.role !== 'heavy') return true;
  const maxLaneDiff =
    (target.role === 'heavy' ? GIANT_TARGET_LANE_GIANT : GIANT_TARGET_LANE_INFANTRY) + extraGrace;
  return Math.abs(target.laneOffset - attacker.laneOffset) <= maxLaneDiff;
}

/**
 * Selects ONE castle-threatening enemy for an ally melee soldier to lock onto while marching.
 * Balances castle-defense urgency (smallest x) with load balancing across teammates and local lane comfort,
 * eliminating per-frame cluster re-scoring and vertical flickering.
 */
function acquireAllyMarchTarget(state: BattleState, ally: BattleUnit): BattleUnit | null {
  let candidates = state.units.filter(
    (e) =>
      e.faction === 'enemy' &&
      e.state !== 'die' &&
      e.x - ally.x >= -48 &&
      e.x - ally.x <= 210
  );
  if (candidates.length === 0) {
    candidates = state.units.filter((e) => e.faction === 'enemy' && e.state !== 'die');
  }
  if (candidates.length === 0) return null;

  // Map enemyId -> count of other ally melee units already locked onto it
  const lockerCounts = new Map<number, number>();
  const lockedEnemyRefs: BattleUnit[] = [];
  for (const mate of state.units) {
    if (
      mate.id === ally.id ||
      mate.faction !== 'ally' ||
      mate.role !== 'melee' ||
      mate.state === 'die' ||
      mate.lockedTargetId == null
    ) {
      continue;
    }
    lockerCounts.set(mate.lockedTargetId, (lockerCounts.get(mate.lockedTargetId) ?? 0) + 1);
    const mateTarget = candidates.find((c) => c.id === mate.lockedTargetId);
    if (mateTarget) lockedEnemyRefs.push(mateTarget);
  }

  let best: BattleUnit | null = null;
  let bestScore = Infinity;

  for (const enemy of candidates) {
    const directLockers = lockerCounts.get(enemy.id) ?? 0;
    let flankLockers = 0;
    for (const ref of lockedEnemyRefs) {
      if (
        ref.id !== enemy.id &&
        Math.abs(ref.laneOffset - enemy.laneOffset) < 0.35 &&
        Math.abs(ref.x - enemy.x) < 42
      ) {
        flankLockers += 1;
      }
    }

    const castleThreat = enemy.x;
    const lockerPenalty =
      directLockers * (enemy.role === 'heavy' ? 22 : 52) + flankLockers * 18;
    const laneCost =
      Math.abs(enemy.laneOffset - ally.laneOffset) * 26 +
      Math.abs(enemy.laneOffset - ally.preferredLane) * 8;
    const forwardDist = Math.max(0, enemy.x - ally.x) * 0.22;
    const score = castleThreat + lockerPenalty + laneCost + forwardDist;

    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }

  return best;
}

/**
 * Rock-Steady Squad Lane Steering for Royal Vanguard allies (zero per-frame rescoring or sepNudge jitter):
 * - Giant (heavy): holds its individually assigned staggered depth corridor.
 * - Melee (Oathblade): marches in a straight diagonal line toward its march-locked enemy until killed,
 *   or advances along its calm personal vanguard lane when the road is clear.
 * - Ranged (Royal Longbow): holds its staggered 3-lane volley corridor with only a subtle, continuous
 *   drift (±0.16) toward the enemy front line (piercing arrows already aim accurately in full 2D).
 */
function computeAllyDesiredLane(
  state: BattleState,
  ally: BattleUnit,
  marchLockedUnit?: BattleUnit | null
): number {
  // 1. Giants hold their individually assigned staggered corridor so they never stack or jitter
  if (ally.role === 'heavy') {
    return Math.max(GIANT_LANE_MIN, Math.min(GIANT_LANE_MAX, ally.preferredLane));
  }

  // 2. Melee follows its single locked target smoothly (with tiny per-unit fight slot so mates fan out cleanly)
  if (ally.role === 'melee') {
    const locked =
      marchLockedUnit ??
      (ally.lockedTargetId != null
        ? state.units.find(
            (e) => e.id === ally.lockedTargetId && e.faction === 'enemy' && e.state !== 'die'
          ) ?? null
        : null);
    if (locked) {
      const fightSlot = ((ally.id % 3) - 1) * 0.09;
      return Math.max(-0.85, Math.min(0.85, locked.laneOffset + fightSlot));
    }
    return state.finalChargeActive ? 0 : Math.max(-0.6, Math.min(0.6, ally.preferredLane * 0.45));
  }

  // 3. Ranged stays anchored to its personal 3-lane volley corridor with gentle continuous bias
  const nearbyEnemies = state.units.filter(
    (e) =>
      e.faction === 'enemy' &&
      e.state !== 'die' &&
      e.x - ally.x >= -36 &&
      e.x - ally.x <= 240
  );
  if (nearbyEnemies.length === 0) {
    return Math.max(-0.65, Math.min(0.65, ally.preferredLane * 0.65));
  }

  let weightedLane = 0;
  let totalWeight = 0;
  for (const e of nearbyEnemies) {
    const w = e.role === 'heavy' ? 1.8 : 1.0;
    weightedLane += e.laneOffset * w;
    totalWeight += w;
  }
  const avgEnemyLane = totalWeight > 0 ? weightedLane / totalWeight : ally.preferredLane;
  const drift = Math.max(-0.18, Math.min(0.18, (avgEnemyLane - ally.preferredLane) * 0.35));
  return Math.max(-0.82, Math.min(0.82, ally.preferredLane + drift));
}

function stepEnemyWaves(
  state: BattleState,
  dt: number,
  onSound?: (ev: BattleSoundEvent) => void
): void {
  for (let i = state.pendingSpawns.length - 1; i >= 0; i--) {
    const item = state.pendingSpawns[i];
    if (state.time >= item.spawnAt) {
      const enemyCount = state.units.filter((u) => u.faction === 'enemy' && u.state !== 'die').length;
      if (enemyCount < MAX_UNITS_PER_SIDE) {
        const spawned = buildUnit(state, 'enemy', item.role, state.stage.enemyAgeIndex);
        state.units.push(spawned);
        if (item.role === 'heavy') {
          state.tremorPulse = Math.max(state.tremorPulse, 0.92);
          state.slamWaves.push({
            x: WORLD_WIDTH - 10,
            yOffset: -0.16,
            faction: 'enemy',
            progress: 0,
            radius: 34,
          });
          emitBurst(state, WORLD_WIDTH - 10, -0.16, '#8C745A', 12);
          emitBurst(state, WORLD_WIDTH - 10, -0.1, '#A4423C', 6);
          onSound?.('giant_stomp');
        }
      }
      state.pendingSpawns.splice(i, 1);
    }
  }

  const waves = state.stage.waves;
  if (waves.length === 0) return;

  if (state.activeHugeWaveBanner) {
    state.activeHugeWaveBanner.timer -= dt;
    if (state.activeHugeWaveBanner.timer <= 0) {
      state.activeHugeWaveBanner = null;
    }
  }

  // Stop spawning permanently once all scripted waves (including Huge Wave 3) are deployed
  if (state.waveCursor < waves.length) {
    const upcoming = waves[state.waveCursor];
    const inHugeWarningWindow = Boolean(
      upcoming.hugeWaveIndex && state.waveTimer > 0 && state.waveTimer <= HUGE_WAVE_WARNING_SECONDS
    );

    // Plan B dynamic pacing:
    // 1. Wait until current wave finishes exiting the enemy gate (pendingSpawns empty) before ticking next wave
    // 2. Keep the 3.5s Huge Wave warning countdown & initial opening grace period at steady 1.0x
    // 3. Slow down under heavy enemy pressure (0.4x / 0.7x) to prevent double-wave pileups,
    //    and fast-forward (2.2x) when the player clears the field so there is no awkward dead air
    let paceMult = 1.0;
    if (state.pendingSpawns.length > 0) {
      paceMult = 0;
    } else if (!inHugeWarningWindow && state.waveCursor > 0) {
      let livingEnemies = 0;
      let enemyPressure = 0;
      for (const u of state.units) {
        if (u.faction === 'enemy' && u.state !== 'die') {
          livingEnemies += 1;
          enemyPressure += u.role === 'heavy' ? 3 : 1;
        }
      }
      if (livingEnemies === 0) {
        paceMult = 2.2;
      } else if (enemyPressure >= 6) {
        paceMult = 0.4;
      } else if (enemyPressure >= 3) {
        paceMult = 0.7;
      }
    }

    if (paceMult > 0) {
      state.waveTimer -= dt * paceMult;
    }

    // Keep wave progress bar mathematically synchronized with the 3 Huge Wave flags
    if (state.waveScriptDuration > 0) {
      let completedDelay = 0;
      for (let i = 0; i < state.waveCursor; i++) {
        completedDelay += waves[i].delay;
      }
      const currentDelay = Math.max(0.01, upcoming.delay);
      const currentElapsed = Math.max(0, currentDelay - Math.max(0, state.waveTimer));
      state.waveProgress = Math.min(
        1,
        (completedDelay + currentElapsed) / state.waveScriptDuration
      );
    } else {
      state.waveProgress = 1;
    }

    // 3.5s pre-wave warning countdown: darkening sky + crimson heartbeat vignette + enemy composition preview
    if (upcoming.hugeWaveIndex && state.waveTimer > 0 && state.waveTimer <= HUGE_WAVE_WARNING_SECONDS) {
      const composition = getWaveComposition(upcoming);
      const urgency = 1 - Math.max(0, state.waveTimer / HUGE_WAVE_WARNING_SECONDS);
      state.incomingHugeWave = {
        index: upcoming.hugeWaveIndex,
        title: upcoming.hugeWaveTitle ?? 'Huge Wave',
        countdown: state.waveTimer,
        duration: HUGE_WAVE_WARNING_SECONDS,
        composition,
      };
      // Smooth ramp up to full sky-darkening / heartbeat tension
      state.waveTensionLevel = Math.min(1, Math.max(state.waveTensionLevel + dt * 0.85, 0.35 + urgency * 0.65));

      const hasGiant = composition.heavy > 0;
      const warnElapsed = HUGE_WAVE_WARNING_SECONDS - state.waveTimer;
      const shakeWindow = HUGE_WAVE_WARNING_SECONDS * 0.5; // Half-duration pre-wave shake (~1.75s)
      const inShakeWindow = warnElapsed >= 0 && warnElapsed <= shakeWindow;

      if (inShakeWindow) {
        const shakeProgress = warnElapsed / shakeWindow;
        // Gentle bell-shaped pre-wave rumble (strongest mid-alert, fades cleanly by 1.75s)
        const envelope = Math.sin(Math.min(1, shakeProgress) * Math.PI * 0.85 + 0.15);
        const gentleShake = (hasGiant ? 0.68 : 0.58) * envelope;
        state.cameraTrauma = Math.max(state.cameraTrauma, gentleShake);
        state.tremorPulse = Math.max(state.tremorPulse, 0.42 + envelope * 0.35);
      } else {
        // After the 1.75s shake window, screen stays steady while darkening & flashing continue
        state.cameraTrauma = 0;
      }

      if (state.hugeWaveWarnedCursor !== state.waveCursor) {
        state.hugeWaveWarnedCursor = state.waveCursor;
        state.waveDrumTimer = hasGiant ? 0.72 : 0.68;
        state.tremorPulse = 1;
        state.cameraTrauma = Math.max(state.cameraTrauma, hasGiant ? 0.68 : 0.58);
        onSound?.('wave_warn');
      } else {
        // W1: Accelerating war-drum audio beats (shake only while inside the 1.75s window)
        state.waveDrumTimer -= dt;
        if (state.waveDrumTimer <= 0) {
          state.waveDrumTimer = Math.max(
            hasGiant ? 0.38 : 0.34,
            (hasGiant ? 0.76 : 0.7) - urgency * 0.36
          );
          state.tremorPulse = 1;
          if (inShakeWindow) {
            state.cameraTrauma = Math.max(state.cameraTrauma, hasGiant ? 0.72 : 0.62);
          }
          onSound?.('wave_drum');
        }
      }

      state.enemyDoorAlertTimer -= dt;
      if (state.enemyDoorAlertTimer <= 0) {
        state.enemyDoorAlertTimer = 0.22;
        emitBurst(state, ENEMY_BASE_X - 10, (nextRand(state) - 0.5) * 0.55, '#9A8366', 4);
      }
    } else {
      state.incomingHugeWave = null;
      state.cameraTrauma = 0;
      state.enemyDoorAlertTimer = 0;
      const targetTension = state.activeHugeWaveBanner ? 0.55 : 0;
      if (state.waveTensionLevel > targetTension) {
        state.waveTensionLevel = Math.max(targetTension, state.waveTensionLevel - dt * 0.65);
      }
    }

    if (state.waveTimer <= 0) {
      const wave = waves[state.waveCursor];

      if (wave.groups && wave.groups.length > 0) {
        let groupOffset = 0;
        for (const grp of wave.groups) {
          for (let idx = 0; idx < grp.count; idx++) {
            state.pendingSpawns.push({
              role: grp.role,
              spawnAt: state.time + groupOffset + idx * grp.interval,
            });
          }
          groupOffset += 0.35;
        }
      } else {
        for (let idx = 0; idx < wave.count; idx++) {
          state.pendingSpawns.push({
            role: wave.role,
            spawnAt: state.time + idx * wave.interval,
          });
        }
      }

      if (wave.hugeWaveIndex) {
        const composition = getWaveComposition(wave);
        state.hugeWavesTriggered = Math.max(state.hugeWavesTriggered, wave.hugeWaveIndex);
        state.incomingHugeWave = null;
        state.waveTensionLevel = 0.92;
        state.tremorPulse = 0.85;
        state.cameraTrauma = 0;
        onSound?.('wave_drum');
        state.activeHugeWaveBanner = {
          index: wave.hugeWaveIndex,
          title: wave.hugeWaveTitle ?? 'Huge Wave',
          timer: 1.8,
          composition,
        };
        emitBurst(state, ENEMY_BASE_X - 10, 0, '#C98A2C', 14);
        emitBurst(state, ENEMY_BASE_X - 12, 0.1, '#7D6A5C', 10);
      }

      state.waveCursor += 1;
      if (state.waveCursor >= waves.length) {
        state.allWavesDeployed = true;
        state.waveProgress = 1;
        state.waveTimer = 0;
      } else {
        state.waveTimer = waves[state.waveCursor].delay;
      }
    }
  } else {
    state.incomingHugeWave = null;
    state.enemyDoorAlertTimer = 0;
    state.allWavesDeployed = true;
    state.waveProgress = 1;
    if (state.waveTensionLevel > 0) {
      state.waveTensionLevel = Math.max(
        0,
        state.waveTensionLevel - dt * (state.activeHugeWaveBanner ? 0.35 : 0.75)
      );
    }

    // Proposal C1: Trigger Final Charge once all 3 waves are deployed and every living enemy is cleared
    if (!state.finalChargeActive && state.pendingSpawns.length === 0) {
      const hasLivingEnemy = state.units.some(
        (u) => u.faction === 'enemy' && u.state !== 'die'
      );
      if (!hasLivingEnemy) {
        state.finalChargeActive = true;
        state.activeHugeWaveBanner = null;
        state.waveTensionLevel = 0;
        const chargeOrigin = state.units.find(
          (u) => u.faction === 'ally' && u.state !== 'die'
        );
        emitCallout(
          state,
          chargeOrigin ? chargeOrigin.x : ALLY_BASE_X + 36,
          -0.65,
          'FINAL CHARGE!',
          'evolve'
        );
        for (const ally of state.units) {
          if (ally.faction === 'ally' && ally.state !== 'die') {
            emitBurst(state, ally.x, ally.laneOffset, '#E9BA58', 6);
          }
        }
        onSound?.('charge');
      }
    }
  }
}

function applyUnitHit(
  state: BattleState,
  attacker: BattleUnit,
  primaryTarget: BattleUnit,
  onSound?: (ev: BattleSoundEvent) => void,
  onCollision?: (ev: UnitCollisionEvent) => void
): void {
  const dir = attacker.faction === 'ally' ? 1 : -1;
  const isGiant = attacker.role === 'heavy';
  damageUnit(state, primaryTarget, attacker.dmg, isGiant, onSound);

  if (attacker.knockback > 0 && primaryTarget.state !== 'die') {
    const kbMult = primaryTarget.knockbackImmune ? (isGiant ? 0.45 : 0) : 1;
    if (kbMult > 0) {
      const minX = Math.min(primaryTarget.x, ALLY_BASE_X + 16);
      const maxX = Math.max(primaryTarget.x, ENEMY_BASE_X - 16);
      primaryTarget.x = Math.min(
        maxX,
        Math.max(minX, primaryTarget.x + dir * attacker.knockback * kbMult)
      );
    }
  }

  // Seismic Giant Ground-Slam Shockwave VFX, Ink Ground Cracks & Tremor
  if (isGiant) {
    state.tremorPulse = Math.max(state.tremorPulse, 0.78);
    state.slamWaves.push({
      x: primaryTarget.x,
      yOffset: primaryTarget.laneOffset,
      faction: attacker.faction,
      progress: 0,
      radius: Math.max(32, attacker.splashRadius * 0.85),
    });
    if (state.groundCracks.length >= 10) state.groundCracks.shift();
    state.groundCracks.push({
      x: primaryTarget.x,
      yOffset: primaryTarget.laneOffset,
      life: 1.35,
      maxLife: 1.35,
      seed: Math.floor(nextRand(state) * 1000),
    });
    emitBurst(
      state,
      primaryTarget.x,
      primaryTarget.laneOffset,
      attacker.faction === 'ally' ? '#E9BA58' : '#C25B4A',
      12
    );
    emitBurst(state, primaryTarget.x, primaryTarget.laneOffset + 0.08, '#8C745A', 8);
    onSound?.('giant_slam');
  }

  let extraHits = 0;
  if (attacker.splashRadius > 0) {
    const maxExtra = Math.max(0, attacker.cleaveCount - 1);
    // Both Melee knights and Colossal Giants cleave realistic 2D elliptical pockets around impact
    // so flanking troops on the far road edge can genuinely bypass a lone Giant.
    const MELEE_CLEAVE_LANE_RADIUS = 0.42;
    const baseLaneRadius = isGiant ? GIANT_SLAM_LANE_RADIUS : MELEE_CLEAVE_LANE_RADIUS;

    const cleaveTargets = state.units
      .filter((other) => {
        if (
          other.id === primaryTarget.id ||
          other.faction === attacker.faction ||
          other.state === 'die'
        ) {
          return false;
        }
        const laneRadius =
          isGiant && other.role === 'heavy' ? baseLaneRadius + 0.22 : baseLaneRadius;
        const nx = (other.x - primaryTarget.x) / attacker.splashRadius;
        const ny = (other.laneOffset - primaryTarget.laneOffset) / laneRadius;
        return nx * nx + ny * ny <= 1.0;
      })
      .sort((a, b) => {
        const aLaneRad = isGiant && a.role === 'heavy' ? baseLaneRadius + 0.22 : baseLaneRadius;
        const bLaneRad = isGiant && b.role === 'heavy' ? baseLaneRadius + 0.22 : baseLaneRadius;
        const ax = (a.x - primaryTarget.x) / attacker.splashRadius;
        const ay = (a.laneOffset - primaryTarget.laneOffset) / aLaneRad;
        const bx = (b.x - primaryTarget.x) / attacker.splashRadius;
        const by = (b.laneOffset - primaryTarget.laneOffset) / bLaneRad;
        return ax * ax + ay * ay - (bx * bx + by * by);
      });

    const limit = maxExtra > 0 ? maxExtra : cleaveTargets.length;
    const cleaveDmg = Math.max(
      1,
      Math.round(attacker.dmg * (isGiant ? 0.78 : attacker.faction === 'ally' ? 0.72 : 0.6))
    );

    const actualCleaveCount = Math.min(limit, cleaveTargets.length);
    extraHits = actualCleaveCount;
    for (let i = 0; i < actualCleaveCount; i++) {
      const other = cleaveTargets[i];
      damageUnit(state, other, cleaveDmg, false);
      if (attacker.knockback > 0 && other.state !== 'die') {
        const kbMult = other.knockbackImmune ? (isGiant ? 0.35 : 0) : 0.85;
        if (kbMult > 0) {
          other.x = Math.min(
            ENEMY_BASE_X - 16,
            Math.max(ALLY_BASE_X + 16, other.x + dir * attacker.knockback * kbMult)
          );
        }
      }
    }

    if (attacker.faction === 'ally' && !isGiant && cleaveTargets.length > 0) {
      emitBurst(state, primaryTarget.x, primaryTarget.laneOffset, '#F9F3E6', 4);
    }
  }

  const isHeavyImpact = isGiant || primaryTarget.role === 'heavy' || extraHits >= 2;
  emitUnitCollision(
    state,
    onCollision,
    isHeavyImpact ? 'heavy_impact' : 'melee_clash',
    (attacker.x + primaryTarget.x) * 0.5,
    attacker.faction,
    attacker.role,
    primaryTarget.role,
    isHeavyImpact ? 0.76 : 0.48 + Math.min(0.22, extraHits * 0.08)
  );
}

function getDamageReduction(state: BattleState, target: BattleUnit): number {
  let reduction = target.armorReduction || 0;
  if (target.faction === 'ally') {
    for (const u of state.units) {
      if (u.faction !== 'ally' || u.state === 'die' || u.auraDefense <= 0) continue;
      if (Math.abs(u.x - target.x) <= 32) {
        reduction = Math.max(reduction, u.auraDefense);
      }
    }
  }
  return Math.min(0.6, reduction);
}

function triggerEnemyCombatStop(target: BattleUnit): void {
  if (target.faction !== 'enemy' || target.state === 'die') return;
  if ((target.engageTimer ?? 0) <= 0 && !target.engaged) {
    target.aggroAlertTimer = 0.45;
  }
  target.engageTimer = 1.8;
}

function damageUnit(
  state: BattleState,
  target: BattleUnit,
  rawDmg: number,
  isHeavy: boolean,
  onSound?: (ev: BattleSoundEvent) => void
): void {
  const reduction = getDamageReduction(state, target);
  const dmg =
    reduction > 0
      ? Math.max(1, Math.round(rawDmg * (1 - reduction)))
      : rawDmg;

  target.hp -= dmg;
  target.hitFlashTimer = 0.08;
  if (target.faction === 'enemy' && target.hp > 0) {
    triggerEnemyCombatStop(target);
  }
  emitCallout(state, target.x, target.laneOffset, `-${dmg}`, isHeavy ? 'crit' : 'damage');
  emitBurst(
    state,
    target.x,
    target.laneOffset,
    target.faction === 'ally' ? '#7BA8B0' : '#D47B6A',
    isHeavy ? 6 : 3
  );

  if (isHeavy) {
    state.hitstopTimer = Math.max(state.hitstopTimer, 0.032);
    onSound?.('hit_heavy');
  } else {
    onSound?.('hit_light');
  }

  if (target.hp <= 0 && target.state !== 'die') {
    target.hp = 0;
    target.state = 'die';
    target.dieTimer = target.role === 'heavy' ? 0.52 : 0.34;

    if (target.faction === 'enemy') {
      const perKill = Math.max(
        1,
        Math.round(state.stage.coinPerKill * getTimelineCoinMult(state.timeline))
      );
      const reward = target.role === 'heavy' ? perKill * 3 : perKill;
      state.coins += reward;
      state.coinsEarnedThisRun += reward;
      state.enemiesDefeated += 1;
      emitCallout(state, target.x, target.laneOffset - 0.3, `+${reward}`, 'coin');
      onSound?.('kill');
    }
  }
}

function applyBaseHit(
  state: BattleState,
  baseFaction: Faction,
  dmg: number,
  isGiant: boolean,
  onSound?: (ev: BattleSoundEvent) => void
): void {
  if (baseFaction === 'enemy') {
    state.enemyBaseHp = Math.max(0, state.enemyBaseHp - dmg);
    state.enemyBaseHitFlash = 0.11;
    emitCallout(state, ENEMY_BASE_X - 12, -0.2, `-${dmg}`, isGiant ? 'crit' : 'damage');
    emitBurst(state, ENEMY_BASE_X - 14, 0, '#C98A2C', isGiant ? 12 : 4);
    if (isGiant) {
      state.slamWaves.push({
        x: ENEMY_BASE_X - 16,
        yOffset: 0,
        faction: 'ally',
        progress: 0,
        radius: 40,
      });
      if (state.groundCracks.length >= 10) state.groundCracks.shift();
      state.groundCracks.push({
        x: ENEMY_BASE_X - 16,
        yOffset: 0,
        life: 1.35,
        maxLife: 1.35,
        seed: Math.floor(nextRand(state) * 1000),
      });
    }
  } else {
    state.allyBaseHp = Math.max(0, state.allyBaseHp - dmg);
    state.allyBaseDamageTaken += dmg;
    state.allyBaseHitFlash = 0.11;
    emitCallout(state, ALLY_BASE_X + 12, -0.2, `-${dmg}`, isGiant ? 'crit' : 'damage');
    emitBurst(state, ALLY_BASE_X + 14, 0, '#A4423C', isGiant ? 12 : 4);
    if (isGiant) {
      state.slamWaves.push({
        x: ALLY_BASE_X + 16,
        yOffset: 0,
        faction: 'enemy',
        progress: 0,
        radius: 40,
      });
      if (state.groundCracks.length >= 10) state.groundCracks.shift();
      state.groundCracks.push({
        x: ALLY_BASE_X + 16,
        yOffset: 0,
        life: 1.35,
        maxLife: 1.35,
        seed: Math.floor(nextRand(state) * 1000),
      });
    }
  }
  if (isGiant) {
    state.tremorPulse = Math.max(state.tremorPulse, 0.8);
    onSound?.('giant_slam');
  } else {
    onSound?.('hit_light');
  }
}

function emitBurst(
  state: BattleState,
  x: number,
  yOffset: number,
  color: string,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
    const angle = nextRand(state) * Math.PI * 2;
    const speed = 18 + nextRand(state) * 46;
    state.particles.push({
      x,
      yOffset,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 18,
      life: 0.35 + nextRand(state) * 0.2,
      maxLife: 0.55,
      size: 2.2 + nextRand(state) * 2.2,
      color,
    });
  }
}

function emitCallout(
  state: BattleState,
  x: number,
  yOffset: number,
  text: string,
  tone: 'damage' | 'crit' | 'coin' | 'evolve'
): void {
  if (state.callouts.length > 34) state.callouts.shift();
  state.callouts.push({
    id: state.nextId++,
    x,
    yOffset,
    text,
    life: tone === 'evolve' ? 1.1 : 0.65,
    maxLife: tone === 'evolve' ? 1.1 : 0.65,
    tone,
  });
}

function updateVisualParticles(state: BattleState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.yOffset += pt.vy * dt * 0.04;
    pt.vy += 125 * dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.callouts.length - 1; i >= 0; i--) {
    const c = state.callouts[i];
    c.life -= dt;
    if (c.life <= 0) state.callouts.splice(i, 1);
  }

  for (let i = state.slamWaves.length - 1; i >= 0; i--) {
    const sw = state.slamWaves[i];
    sw.progress += dt * 2.6;
    if (sw.progress >= 1) state.slamWaves.splice(i, 1);
  }

  for (let i = state.groundCracks.length - 1; i >= 0; i--) {
    const gc = state.groundCracks[i];
    gc.life -= dt;
    if (gc.life <= 0) state.groundCracks.splice(i, 1);
  }
}

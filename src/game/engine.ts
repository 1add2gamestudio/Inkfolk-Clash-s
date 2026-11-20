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
  // - Giants walk along mid-back spine (-0.16) so they tower behind brawling footmen
  // - Ally Ranged cycles cleanly across 3 staggered volley lanes
  // - Ally Melee has gentle individual lane spread; Enemies spread across full road
  let preferredLane: number;
  if (isGiant) {
    preferredLane = -0.16;
  } else if (isAlly && role === 'ranged') {
    const slots = [-0.56, 0.08, 0.62];
    preferredLane = slots[state.nextId % slots.length] + (nextRand(state) * 0.14 - 0.07);
  } else if (isAlly) {
    preferredLane = nextRand(state) * 1.15 - 0.52;
  } else {
    preferredLane = nextRand(state) * 1.68 - 0.82;
  }

  // Mechanical Giants stride in from behind the left/right castles so bases are never occluded
  const spawnX = isGiant
    ? isAlly
      ? -24
      : WORLD_WIDTH + 24
    : isAlly
      ? ALLY_BASE_X - 4
      : ENEMY_BASE_X - 18;
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
    range: spec.range,
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
      yOffset: -0.16,
      faction: 'ally',
      progress: 0,
      radius: 32,
    });
    emitBurst(state, 10, -0.16, '#E9BA58', 12);
    emitBurst(state, 10, -0.1, '#8C745A', 8);
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
    const dir = u.faction === 'ally' ? 1 : -1;

    // Acquire closest opponent in range
    let targetUnit: BattleUnit | null = null;
    let bestDist = Infinity;

    for (const other of state.units) {
      if (other.faction === u.faction || other.state === 'die') continue;
      const dx = (other.x - u.x) * dir;
      if (dx >= -10 && dx <= u.range && dx < bestDist) {
        bestDist = dx;
        targetUnit = other;
      }
    }

    const oppBaseEdge = u.faction === 'ally' ? ENEMY_BASE_X - 18 : ALLY_BASE_X + 18;
    const distToBase = (oppBaseEdge - u.x) * dir;
    const canHitBase = !targetUnit && distToBase <= u.range;

    if (targetUnit || canHitBase) {
      const wasWalking = u.state === 'walk';
      u.state = 'attack';

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
          const baseTx = targetUnit ? targetUnit.x : oppBaseEdge;
          const tx =
            u.faction === 'ally' && u.pierceCount > 1
              ? Math.min(ENEMY_BASE_X - 16, baseTx + 44)
              : baseTx;
          const ty = targetUnit ? targetUnit.laneOffset : 0;
          const travelDist = Math.abs(tx - u.x);
          state.projectiles.push({
            id: state.nextId++,
            faction: u.faction,
            ageIndex: u.ageIndex,
            x: u.x,
            yOffset: u.laneOffset,
            startX: u.x,
            targetX: tx,
            targetYOffset: ty,
            progress: 0,
            duration: Math.max(0.22, travelDist / (u.faction === 'ally' ? 230 : 180)),
            dmg: u.dmg,
            arcHeight:
              u.faction === 'ally'
                ? 5 + travelDist * 0.045
                : 16 + travelDist * 0.13,
            pierceRemaining: u.pierceCount,
            hitUnitIds: [],
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
      u.x += dir * moveSpeed * dt;
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
          const desiredLane = computeAllyDesiredLane(state, u);
          u.targetLaneOffset = desiredLane;
          const curvingOutFromBase = u.role === 'heavy' && u.laneOffset < -0.26;
          // Capped smooth diagonal march speed (eliminates sudden synchronized sideways snapping)
          const maxLatSpeed = state.finalChargeActive
            ? 0.95
            : curvingOutFromBase
              ? 0.56
              : u.role === 'heavy'
                ? 0.22
                : u.role === 'ranged'
                  ? 0.42
                  : 0.65;
          const delta = desiredLane - u.laneOffset;
          const maxStep = maxLatSpeed * dt;
          if (Math.abs(delta) <= maxStep) {
            u.laneOffset = desiredLane;
          } else {
            u.laneOffset += Math.sign(delta) * maxStep;
          }
          u.laneOffset = Math.max(-0.88, Math.min(0.88, u.laneOffset));
        }
      } else if (u.role === 'heavy') {
        // Enemy Siege Walker strides BEHIND the enemy tower, then curves smoothly onto -0.16 spine
        if (u.x > ENEMY_BASE_X - GIANT_BEHIND_BASE_CLEARANCE) {
          u.laneOffset = GIANT_BEHIND_BASE_LANE;
          u.targetLaneOffset = GIANT_BEHIND_BASE_LANE;
        } else {
          const desiredLane = -0.16;
          u.targetLaneOffset = desiredLane;
          const delta = desiredLane - u.laneOffset;
          const maxStep = 0.56 * dt;
          if (Math.abs(delta) <= maxStep) {
            u.laneOffset = desiredLane;
          } else {
            u.laneOffset += Math.sign(delta) * maxStep;
          }
        }
      }
    }
  }

  // 4. Projectiles (piercing arrows slice through multiple enemy grunts in flight)
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.progress += dt / p.duration;
    p.x = p.startX + (p.targetX - p.startX) * Math.min(1, p.progress);

    if (p.faction === 'ally' && p.pierceRemaining > 0) {
      const candidates = state.units
        .filter(
          (u) =>
            u.faction === 'enemy' &&
            u.state !== 'die' &&
            !p.hitUnitIds.includes(u.id) &&
            Math.abs(u.x - p.x) <= 13
        )
        .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));

      for (const hit of candidates) {
        if (p.pierceRemaining <= 0) break;
        p.hitUnitIds.push(hit.id);
        const isFirst = p.hitUnitIds.length === 1;
        const hitDmg = isFirst ? p.dmg : Math.max(1, Math.round(p.dmg * 0.78));
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
        }
        if (!hit.knockbackImmune) {
          hit.x = Math.min(ENEMY_BASE_X - 16, hit.x + 2.2);
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
        let minDx = 20;
        for (const u of state.units) {
          if (u.faction === p.faction || u.state === 'die') continue;
          const d = Math.abs(u.x - p.targetX);
          if (d < minDx) {
            minDx = d;
            hitTarget = u;
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
      } else if (p.pierceRemaining > 0) {
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
    state.cameraTrauma = 0;
    emitBurst(state, ALLY_BASE_X + 8, 0, '#A4423C', 20);
    emitBurst(state, ALLY_BASE_X + 6, -0.2, '#4A3A32', 14);
    onSound?.('defeat');
  }
}

/**
 * Organic Anti-Flicker Squad Steering for Royal Vanguard allies:
 * - Giant (heavy): steady mid-back regal corridor (-0.16 ± 0.08) so Giants stride majestically
 *   behind brawling footmen without obscuring them.
 * - Ranged (Royal Longbow): holds personal staggered 3-lane volley formation, making only gentle
 *   local adjustments toward enemies along its firing corridor.
 * - Melee (Oathblade): evaluates nearby enemy clusters with Slot Saturation (penalizing clusters
 *   already claimed by other allies) + Hysteresis (preventing synchronized army-wide flips).
 * - Clear field (Final Charge): converges cleanly to center lane (Giants hold -0.16).
 */
function computeAllyDesiredLane(state: BattleState, ally: BattleUnit): number {
  // 1. Giants hold the regal mid-back road spine so they never jitter or hide footmen
  if (ally.role === 'heavy') {
    const enemyGiant = state.units.find(
      (e) => e.faction === 'enemy' && e.role === 'heavy' && e.state !== 'die'
    );
    if (enemyGiant) {
      return Math.max(-0.24, Math.min(-0.08, enemyGiant.laneOffset));
    }
    return -0.16;
  }

  const vision = ally.role === 'ranged' ? 240 : 155;
  let enemies = state.units.filter(
    (e) =>
      e.faction === 'enemy' &&
      e.state !== 'die' &&
      e.x - ally.x >= -16 &&
      e.x - ally.x <= vision
  );

  if (enemies.length === 0) {
    enemies = state.units.filter((e) => e.faction === 'enemy' && e.state !== 'die');
  }

  // Clear field -> converge smoothly on enemy base doorway center
  if (enemies.length === 0) {
    return 0;
  }

  let bestLane = ally.targetLaneOffset;

  if (ally.role === 'ranged') {
    // Ranged stays anchored near its personal staggered lane, adjusting only gently toward dense lines
    let bestScore = -Infinity;
    for (let step = -4; step <= 4; step++) {
      const candidate = step * 0.2;
      let score = 0;
      for (const e of enemies) {
        const dy = Math.abs(e.laneOffset - candidate);
        if (dy <= 0.36) {
          const roleWeight = e.role === 'heavy' ? 1.8 : 1.0;
          score += roleWeight * (1 - dy / 0.45);
        }
      }
      // Strong anchor to personal volley lane + smooth hysteresis to current target
      score -= Math.abs(candidate - ally.preferredLane) * 0.65;
      score -= Math.abs(candidate - ally.targetLaneOffset) * 0.25;
      if (score > bestScore) {
        bestScore = score;
        bestLane = candidate;
      }
    }
  } else {
    // Melee: cluster density divided by ally slot saturation + hysteresis so squads split organically
    const scoreLaneAt = (lane: number, anchorX: number): number => {
      let clusterScore = 0;
      for (const other of enemies) {
        const dx = Math.abs(other.x - anchorX);
        const dy = Math.abs(other.laneOffset - lane);
        if (dx <= 44 && dy <= 0.52) {
          const baseWeight = other.role === 'heavy' ? 2.4 : 1.0;
          const distFactor = 1.35 / (1 + Math.max(0, other.x - ally.x) / 95);
          clusterScore += baseWeight * distFactor;
        }
      }
      if (clusterScore <= 0) return 0;

      // Slot Saturation: penalize lanes already claimed by nearby allied melee units
      let committedMates = 0;
      for (const mate of state.units) {
        if (
          mate.id === ally.id ||
          mate.faction !== 'ally' ||
          mate.role !== 'melee' ||
          mate.state === 'die'
        ) {
          continue;
        }
        if (
          Math.abs(mate.targetLaneOffset - lane) < 0.34 &&
          Math.abs(mate.x - ally.x) < 90
        ) {
          committedMates += 1;
        }
      }

      const saturated = clusterScore / (1 + committedMates * 0.85);
      // Mild personal preference keeps tie-breaks organic
      const personalBias = Math.abs(lane - ally.preferredLane) * 0.14;
      return saturated - personalBias;
    };

    let bestScore = -Infinity;
    let candidateLane = ally.targetLaneOffset;

    for (const anchor of enemies) {
      let weightedLaneSum = 0;
      let weightTotal = 0;
      for (const other of enemies) {
        const dx = Math.abs(other.x - anchor.x);
        const dy = Math.abs(other.laneOffset - anchor.laneOffset);
        if (dx <= 44 && dy <= 0.52) {
          const w = other.role === 'heavy' ? 2.4 : 1.0;
          weightedLaneSum += other.laneOffset * w;
          weightTotal += w;
        }
      }
      if (weightTotal <= 0) continue;
      const laneCenter = weightedLaneSum / weightTotal;
      const sc = scoreLaneAt(laneCenter, anchor.x);
      if (sc > bestScore) {
        bestScore = sc;
        candidateLane = laneCenter;
      }
    }

    // Hysteresis: keep current targetLaneOffset unless new cluster clearly outperforms it
    const nearestOnCurrent = enemies.find(
      (e) => Math.abs(e.laneOffset - ally.targetLaneOffset) <= 0.48
    );
    const currentScore = nearestOnCurrent
      ? scoreLaneAt(ally.targetLaneOffset, nearestOnCurrent.x)
      : -1;
    bestLane =
      bestScore > currentScore + 0.32 || currentScore <= 0
        ? candidateLane
        : ally.targetLaneOffset;
  }

  // Gentle vertical separation from immediately adjacent allies
  let sepNudge = 0;
  for (const mate of state.units) {
    if (mate.id === ally.id || mate.faction !== 'ally' || mate.state === 'die') continue;
    if (mate.role === 'heavy') continue;
    if (Math.abs(mate.x - ally.x) < 16) {
      const dy = ally.laneOffset - mate.laneOffset;
      if (Math.abs(dy) < 0.24) {
        const pushDir = dy === 0 ? (ally.id % 2 === 0 ? 1 : -1) : Math.sign(dy);
        sepNudge += pushDir * 0.11;
      }
    }
  }

  return Math.max(-0.85, Math.min(0.85, bestLane + Math.max(-0.2, Math.min(0.2, sepNudge))));
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

  if (state.waveCursor < waves.length && state.waveScriptDuration > 0) {
    state.waveProgress = Math.min(1, state.time / state.waveScriptDuration);
  } else {
    state.waveProgress = 1;
  }

  // Stop spawning permanently once all scripted waves (including Huge Wave 3) are deployed
  if (state.waveCursor < waves.length) {
    state.waveTimer -= dt;

    // 3.5s pre-wave warning countdown: darkening sky + crimson heartbeat vignette + enemy composition preview
    const upcoming = waves[state.waveCursor];
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
    const cleaveTargets = state.units
      .filter(
        (other) =>
          other.id !== primaryTarget.id &&
          other.faction !== attacker.faction &&
          other.state !== 'die' &&
          Math.abs(other.x - primaryTarget.x) <= attacker.splashRadius
      )
      .sort((a, b) => Math.abs(a.x - primaryTarget.x) - Math.abs(b.x - primaryTarget.x));

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

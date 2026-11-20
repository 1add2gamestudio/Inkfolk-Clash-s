import { ART_STYLE_MAP, type ArtStyleId, type UnitArchetype, type UnitRole } from './stylesConfig';

export type Faction = 'ally' | 'enemy';
export type UnitAnimState = 'walk' | 'attack' | 'die';

export interface SimUnit {
  id: number;
  faction: Faction;
  role: UnitRole;
  x: number; // world X in [38..322]
  laneOffset: number; // depth jitter in [-1, 1]
  hp: number;
  maxHp: number;
  dmg: number;
  range: number;
  speed: number;
  attackCooldown: number;
  cooldownTimer: number;
  attackAnimTimer: number;
  hitFlashTimer: number;
  walkPhase: number;
  state: UnitAnimState;
  dieTimer: number;
  scale: number;
}

export interface SimProjectile {
  id: number;
  faction: Faction;
  x: number;
  yOffset: number;
  startX: number;
  targetX: number;
  progress: number;
  duration: number;
  dmg: number;
  arcHeight: number;
}

export interface SimParticle {
  x: number;
  yOffset: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface SimFloatingText {
  id: number;
  x: number;
  yOffset: number;
  text: string;
  life: number;
  maxLife: number;
  isCrit: boolean;
}

export interface PreviewSimState {
  styleId: ArtStyleId;
  time: number;
  speedMultiplier: 1 | 2;
  food: number;
  maxFood: number;
  foodRate: number;
  coins: number;
  allyBaseHp: number;
  allyBaseMaxHp: number;
  enemyBaseHp: number;
  enemyBaseMaxHp: number;
  allyBaseHitFlash: number;
  enemyBaseHitFlash: number;
  units: SimUnit[];
  projectiles: SimProjectile[];
  particles: SimParticle[];
  floatingTexts: SimFloatingText[];
  nextId: number;
  enemyWaveTimer: number;
  autoAllyTimer: number;
  waveIndex: number;
  seed: number;
}

export const WORLD_WIDTH = 360;
export const ALLY_BASE_X = 36;
export const ENEMY_BASE_X = 324;
const MAX_ACTIVE_UNITS = 110;

function nextRand(state: PreviewSimState): number {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function createPreviewSim(styleId: ArtStyleId): PreviewSimState {
  const sim: PreviewSimState = {
    styleId,
    time: 0,
    speedMultiplier: 1,
    food: 14,
    maxFood: 30,
    foodRate: 2.2,
    coins: 48,
    allyBaseHp: 500,
    allyBaseMaxHp: 500,
    enemyBaseHp: 500,
    enemyBaseMaxHp: 500,
    allyBaseHitFlash: 0,
    enemyBaseHitFlash: 0,
    units: [],
    projectiles: [],
    particles: [],
    floatingTexts: [],
    nextId: 1,
    enemyWaveTimer: 1.6,
    autoAllyTimer: 1.1,
    waveIndex: 1,
    seed: 948271,
  };

  // Seed an active mid-lane clash immediately so every style opens alive
  seedInitialSkirmish(sim);
  return sim;
}

function seedInitialSkirmish(sim: PreviewSimState): void {
  const allyRoles: UnitRole[] = ['melee', 'melee', 'melee', 'ranged', 'ranged', 'heavy', 'melee', 'melee'];
  const enemyRoles: UnitRole[] = ['melee', 'melee', 'melee', 'ranged', 'ranged', 'heavy', 'melee', 'melee'];

  allyRoles.forEach((role, idx) => {
    const u = buildUnit(sim, 'ally', role);
    u.x = 110 + (idx % 4) * 14 + nextRand(sim) * 8;
    sim.units.push(u);
  });

  enemyRoles.forEach((role, idx) => {
    const u = buildUnit(sim, 'enemy', role);
    u.x = 248 - (idx % 4) * 14 - nextRand(sim) * 8;
    sim.units.push(u);
  });
}

function buildUnit(sim: PreviewSimState, faction: Faction, role: UnitRole): SimUnit {
  const spec = ART_STYLE_MAP[sim.styleId];
  const arch: UnitArchetype = spec.units[role];
  const laneOffset = nextRand(sim) * 2 - 1;
  return {
    id: sim.nextId++,
    faction,
    role,
    x: faction === 'ally' ? ALLY_BASE_X + 16 : ENEMY_BASE_X - 16,
    laneOffset,
    hp: arch.hp,
    maxHp: arch.hp,
    dmg: arch.dmg,
    range: arch.range,
    speed: arch.speed * (0.94 + nextRand(sim) * 0.12),
    attackCooldown: arch.attackCooldown,
    cooldownTimer: nextRand(sim) * 0.25,
    attackAnimTimer: 0,
    hitFlashTimer: 0,
    walkPhase: nextRand(sim) * Math.PI * 2,
    state: 'walk',
    dieTimer: 0,
    scale: arch.scale,
  };
}

export function spawnPlayerUnit(sim: PreviewSimState, role: UnitRole, spendFood = true): boolean {
  const spec = ART_STYLE_MAP[sim.styleId];
  const cost = spec.units[role].cost;
  if (spendFood && sim.food < cost) {
    return false;
  }
  if (sim.units.length >= MAX_ACTIVE_UNITS) {
    return false;
  }
  if (spendFood) {
    sim.food = Math.max(0, sim.food - cost);
  }
  const u = buildUnit(sim, 'ally', role);
  sim.units.push(u);
  spawnBurstParticles(sim, u.x, u.laneOffset, spec.palette.allySecondary, 5);
  return true;
}

export function spawnSwarmBurst(sim: PreviewSimState): void {
  const spec = ART_STYLE_MAP[sim.styleId];
  const pattern: UnitRole[] = ['melee', 'melee', 'melee', 'ranged', 'ranged', 'heavy', 'melee', 'ranged'];
  for (const role of pattern) {
    if (sim.units.length >= MAX_ACTIVE_UNITS) break;
    const u = buildUnit(sim, 'ally', role);
    u.x = ALLY_BASE_X + 10 + nextRand(sim) * 26;
    sim.units.push(u);
  }
  for (let i = 0; i < 6; i++) {
    if (sim.units.length >= MAX_ACTIVE_UNITS) break;
    const role: UnitRole = i === 5 ? 'heavy' : i % 3 === 0 ? 'ranged' : 'melee';
    const eu = buildUnit(sim, 'enemy', role);
    eu.x = ENEMY_BASE_X - 10 - nextRand(sim) * 24;
    sim.units.push(eu);
  }
  spawnBurstParticles(sim, ALLY_BASE_X + 20, 0, spec.palette.accent, 10);
}

function spawnBurstParticles(
  sim: PreviewSimState,
  x: number,
  yOffset: number,
  color: string,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    if (sim.particles.length > 140) sim.particles.shift();
    const angle = nextRand(sim) * Math.PI * 2;
    const spd = 18 + nextRand(sim) * 44;
    sim.particles.push({
      x,
      yOffset,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 14,
      life: 0.35 + nextRand(sim) * 0.2,
      maxLife: 0.55,
      size: 2.2 + nextRand(sim) * 2.2,
      color,
    });
  }
}

function pushFloatingText(sim: PreviewSimState, x: number, yOffset: number, dmg: number, isCrit = false): void {
  if (sim.floatingTexts.length > 32) sim.floatingTexts.shift();
  sim.floatingTexts.push({
    id: sim.nextId++,
    x,
    yOffset,
    text: `-${Math.round(dmg)}`,
    life: 0.65,
    maxLife: 0.65,
    isCrit,
  });
}

export function stepPreviewSim(sim: PreviewSimState, rawDt: number): void {
  const dt = Math.min(Math.max(rawDt, 0), 0.05) * sim.speedMultiplier;
  if (dt <= 0) return;

  const spec = ART_STYLE_MAP[sim.styleId];
  sim.time += dt;

  // Food & flash decay
  sim.food = Math.min(sim.maxFood, sim.food + sim.foodRate * dt);
  sim.allyBaseHitFlash = Math.max(0, sim.allyBaseHitFlash - dt);
  sim.enemyBaseHitFlash = Math.max(0, sim.enemyBaseHitFlash - dt);

  // Auto director keeps the battle bustling for preview evaluation
  sim.autoAllyTimer -= dt;
  if (sim.autoAllyTimer <= 0) {
    sim.autoAllyTimer = 1.35 + nextRand(sim) * 0.7;
    const allyCount = sim.units.filter((u) => u.faction === 'ally' && u.state !== 'die').length;
    if (allyCount < 24) {
      const roll = nextRand(sim);
      const role: UnitRole = roll < 0.55 ? 'melee' : roll < 0.86 ? 'ranged' : 'heavy';
      if (sim.units.length < MAX_ACTIVE_UNITS) {
        sim.units.push(buildUnit(sim, 'ally', role));
      }
    }
  }

  sim.enemyWaveTimer -= dt;
  if (sim.enemyWaveTimer <= 0) {
    sim.enemyWaveTimer = 2.6 + nextRand(sim) * 1.1;
    const enemyCount = sim.units.filter((u) => u.faction === 'enemy' && u.state !== 'die').length;
    if (enemyCount < 24) {
      const batch = 2 + (sim.waveIndex % 3);
      for (let i = 0; i < batch; i++) {
        if (sim.units.length >= MAX_ACTIVE_UNITS) break;
        const roll = nextRand(sim);
        const role: UnitRole = roll < 0.54 ? 'melee' : roll < 0.85 ? 'ranged' : 'heavy';
        const eu = buildUnit(sim, 'enemy', role);
        eu.x = ENEMY_BASE_X - 14 - i * 4;
        sim.units.push(eu);
      }
      sim.waveIndex++;
    }
  }

  // Update units
  for (const unit of sim.units) {
    unit.hitFlashTimer = Math.max(0, unit.hitFlashTimer - dt);
    unit.attackAnimTimer = Math.max(0, unit.attackAnimTimer - dt);

    if (unit.state === 'die') {
      unit.dieTimer -= dt;
      continue;
    }

    unit.cooldownTimer = Math.max(0, unit.cooldownTimer - dt);
    const dir = unit.faction === 'ally' ? 1 : -1;

    // Find closest living enemy unit ahead (or within range)
    let targetUnit: SimUnit | null = null;
    let bestDist = Infinity;

    for (const other of sim.units) {
      if (other.faction === unit.faction || other.state === 'die') continue;
      const dx = (other.x - unit.x) * dir;
      if (dx >= -8 && dx <= unit.range && dx < bestDist) {
        bestDist = dx;
        targetUnit = other;
      }
    }

    const enemyBaseEdge = unit.faction === 'ally' ? ENEMY_BASE_X - 18 : ALLY_BASE_X + 18;
    const distToBase = (enemyBaseEdge - unit.x) * dir;
    const canHitBase = !targetUnit && distToBase <= unit.range;

    if (targetUnit || canHitBase) {
      unit.state = 'attack';
      if (unit.cooldownTimer <= 0) {
        unit.cooldownTimer = unit.attackCooldown;
        unit.attackAnimTimer = 0.22;

        if (unit.role === 'ranged') {
          const tx = targetUnit ? targetUnit.x : enemyBaseEdge;
          const ty = targetUnit ? targetUnit.laneOffset : 0;
          sim.projectiles.push({
            id: sim.nextId++,
            faction: unit.faction,
            x: unit.x,
            yOffset: unit.laneOffset,
            startX: unit.x,
            targetX: tx,
            progress: 0,
            duration: Math.max(0.18, Math.abs(tx - unit.x) / 220),
            dmg: unit.dmg,
            arcHeight: 16 + Math.abs(tx - unit.x) * 0.12,
          });
          // Store target yOffset implicitly via nearest lookup on impact
          void ty;
        } else if (targetUnit) {
          applyDamageToUnit(sim, targetUnit, unit.dmg);
        } else if (canHitBase) {
          applyDamageToBase(sim, unit.faction === 'ally' ? 'enemy' : 'ally', unit.dmg);
        }
      }
    } else {
      unit.state = 'walk';
      unit.x += dir * unit.speed * dt;
      unit.walkPhase += unit.speed * dt * 0.34;
    }
  }

  // Update projectiles
  for (let i = sim.projectiles.length - 1; i >= 0; i--) {
    const p = sim.projectiles[i];
    p.progress += dt / p.duration;
    p.x = p.startX + (p.targetX - p.startX) * Math.min(1, p.progress);

    if (p.progress >= 1) {
      // Find closest enemy near targetX
      let hitTarget: SimUnit | null = null;
      let minDx = 20;
      for (const u of sim.units) {
        if (u.faction === p.faction || u.state === 'die') continue;
        const d = Math.abs(u.x - p.targetX);
        if (d < minDx) {
          minDx = d;
          hitTarget = u;
        }
      }
      if (hitTarget) {
        applyDamageToUnit(sim, hitTarget, p.dmg);
      } else {
        const hitBaseFaction: Faction = p.faction === 'ally' ? 'enemy' : 'ally';
        const baseX = hitBaseFaction === 'enemy' ? ENEMY_BASE_X - 18 : ALLY_BASE_X + 18;
        if (Math.abs(p.targetX - baseX) < 36) {
          applyDamageToBase(sim, hitBaseFaction, p.dmg);
        }
      }
      sim.projectiles.splice(i, 1);
    }
  }

  // Prune dead units whose KO animation finished
  sim.units = sim.units.filter((u) => !(u.state === 'die' && u.dieTimer <= 0));

  // Update particles
  for (let i = sim.particles.length - 1; i >= 0; i--) {
    const pt = sim.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.yOffset += pt.vy * dt * 0.04;
    pt.vy += 120 * dt;
    if (pt.life <= 0) {
      sim.particles.splice(i, 1);
    }
  }

  // Update floating damage texts
  for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
    const ft = sim.floatingTexts[i];
    ft.life -= dt;
    if (ft.life <= 0) {
      sim.floatingTexts.splice(i, 1);
    }
  }

  // Keep bases healthy in endless showcase preview (replenish smoothly when low)
  if (sim.allyBaseHp < 90) sim.allyBaseHp = sim.allyBaseMaxHp;
  if (sim.enemyBaseHp < 90) {
    sim.enemyBaseHp = sim.enemyBaseMaxHp;
    sim.coins += 12;
    spawnBurstParticles(sim, ENEMY_BASE_X - 10, 0, spec.palette.accent, 14);
  }
}

function applyDamageToUnit(sim: PreviewSimState, target: SimUnit, dmg: number): void {
  const spec = ART_STYLE_MAP[sim.styleId];
  target.hp -= dmg;
  target.hitFlashTimer = 0.09;
  const isHeavyHit = dmg >= 20;
  pushFloatingText(sim, target.x, target.laneOffset, dmg, isHeavyHit);
  spawnBurstParticles(
    sim,
    target.x,
    target.laneOffset,
    target.faction === 'ally' ? spec.palette.allySecondary : spec.palette.enemySecondary,
    isHeavyHit ? 6 : 3
  );
  if (target.hp <= 0 && target.state !== 'die') {
    target.hp = 0;
    target.state = 'die';
    target.dieTimer = 0.32;
    if (target.faction === 'enemy') {
      sim.coins += target.role === 'heavy' ? 4 : 1;
    }
  }
}

function applyDamageToBase(sim: PreviewSimState, baseFaction: Faction, dmg: number): void {
  const spec = ART_STYLE_MAP[sim.styleId];
  if (baseFaction === 'enemy') {
    sim.enemyBaseHp = Math.max(0, sim.enemyBaseHp - dmg);
    sim.enemyBaseHitFlash = 0.11;
    pushFloatingText(sim, ENEMY_BASE_X - 14, -0.2, dmg, dmg >= 20);
    spawnBurstParticles(sim, ENEMY_BASE_X - 14, 0, spec.palette.accent, 5);
  } else {
    sim.allyBaseHp = Math.max(0, sim.allyBaseHp - dmg);
    sim.allyBaseHitFlash = 0.11;
    pushFloatingText(sim, ALLY_BASE_X + 14, -0.2, dmg, dmg >= 20);
    spawnBurstParticles(sim, ALLY_BASE_X + 14, 0, spec.palette.enemySecondary, 5);
  }
}

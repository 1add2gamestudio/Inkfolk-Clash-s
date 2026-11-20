export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';

export type UnitRole = 'melee' | 'ranged' | 'heavy';
export type Faction = 'ally' | 'enemy';

export interface UnitSpec {
  role: UnitRole;
  name: string;
  cost: number;
  hp: number;
  dmg: number;
  range: number;
  speed: number;
  attackCooldown: number;
  scale: number;
  splashRadius?: number;
  cleaveCount?: number; // max enemies struck per melee swing (1 = single target)
  pierceCount?: number; // max enemies pierced by a ranged projectile
  knockback?: number; // world-unit pushback on hit
  auraDefense?: number; // legacy/optional aura defense
  armorReduction?: number; // 0..0.5 innate flat damage reduction (Giants)
  knockbackImmune?: boolean; // immune to knockback from non-Giant units
}

export interface AgeSpec {
  ageIndex: number; // 0..4
  id: string;
  name: string;
  eraTag: string;
  baseName: string;
  evolveCost: number; // Coins needed to advance to next age (0 for max age)
  baseHpBonus: number;
  units: Record<UnitRole, UnitSpec>; // Player Royal Vanguard Elites
  enemyUnits: Record<UnitRole, UnitSpec>; // Enemy Hearthclan Swarm Grunts
}

export interface WaveGroup {
  role: UnitRole;
  count: number;
  interval: number;
}

export interface WaveEntry {
  delay: number; // seconds from battle start or previous wave
  role: UnitRole;
  count: number;
  interval: number;
  hugeWaveIndex?: 1 | 2 | 3;
  hugeWaveTitle?: 'Vanguard Surge' | 'Warband Onslaught' | 'Final Siege';
  groups?: WaveGroup[];
}

export interface StageSpec {
  id: string;
  chapter: number; // 1..5
  battle: number; // 1..3
  title: string;
  enemyAgeIndex: number;
  enemyBaseHp: number;
  enemyHpMult: number;
  enemyDmgMult: number;
  startingFood: number;
  baseFoodRate: number;
  coinPerKill: number;
  victoryBonusCoins: number;
  waves: WaveEntry[];
}

export interface BattleUnit {
  id: number;
  faction: Faction;
  role: UnitRole;
  ageIndex: number;
  x: number; // 0..360 world units
  laneOffset: number; // -1..1 depth
  targetLaneOffset: number;
  preferredLane: number; // personal lane anchor to prevent hive-mind flickering
  spawnAge: number; // seconds since spawn (small allies fade in over 0.25s)
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
  state: 'walk' | 'attack' | 'die';
  dieTimer: number;
  scale: number;
  splashRadius: number;
  cleaveCount: number;
  pierceCount: number;
  knockback: number;
  auraDefense: number;
  armorReduction: number;
  knockbackImmune: boolean;
}

export interface SlamWave {
  x: number;
  yOffset: number;
  faction: Faction;
  progress: number;
  radius: number;
}

export interface GroundCrack {
  x: number;
  yOffset: number;
  life: number;
  maxLife: number;
  seed: number;
}

export interface BattleProjectile {
  id: number;
  faction: Faction;
  ageIndex: number;
  x: number;
  yOffset: number;
  startX: number;
  targetX: number;
  targetYOffset: number;
  progress: number;
  duration: number;
  dmg: number;
  arcHeight: number;
  pierceRemaining: number;
  hitUnitIds: number[];
}

export interface BattleParticle {
  x: number;
  yOffset: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FloatingCallout {
  id: number;
  x: number;
  yOffset: number;
  text: string;
  life: number;
  maxLife: number;
  tone: 'damage' | 'crit' | 'coin' | 'evolve';
}

export interface WaveComposition {
  melee: number;
  ranged: number;
  heavy: number;
}

export interface HugeWaveAlert {
  index: 1 | 2 | 3;
  title: string;
  countdown: number;
  duration: number;
  composition: WaveComposition;
}

export interface ActiveHugeWaveBanner {
  index: 1 | 2 | 3;
  title: string;
  timer: number;
  composition: WaveComposition;
}

export interface BattleState {
  stage: StageSpec;
  timeline: number;
  phase: 'playing' | 'victory' | 'defeat';
  time: number;
  speedMultiplier: 1 | 2;
  food: number;
  maxFood: number;
  openingSurgeTimer: number;
  openingSurgeDuration: number;
  foodLevel: number;
  baseLevel: number;
  allyAgeIndex: number;
  coins: number;
  coinsEarnedThisRun: number;
  unitsDeployed: number;
  enemiesDefeated: number;
  allyBaseHp: number;
  allyBaseMaxHp: number;
  enemyBaseHp: number;
  enemyBaseMaxHp: number;
  allyBaseHitFlash: number;
  enemyBaseHitFlash: number;
  hitstopTimer: number;
  cameraTrauma: number;
  units: BattleUnit[];
  projectiles: BattleProjectile[];
  particles: BattleParticle[];
  callouts: FloatingCallout[];
  nextId: number;
  waveCursor: number;
  waveTimer: number;
  waveScriptDuration: number;
  waveProgress: number;
  hugeWaveFlags: number[];
  hugeWavesTriggered: number;
  incomingHugeWave: HugeWaveAlert | null;
  activeHugeWaveBanner: ActiveHugeWaveBanner | null;
  hugeWaveWarnedCursor: number;
  enemyDoorAlertTimer: number;
  waveTensionLevel: number; // 0..1 pre-wave W1 tension intensity
  waveDrumTimer: number;
  tremorPulse: number; // 0..1 seismic ground tremor pulse on drumbeats & giant stomps
  slamWaves: SlamWave[];
  groundCracks: GroundCrack[];
  allWavesDeployed: boolean;
  finalChargeActive: boolean;
  pendingSpawns: Array<{ role: UnitRole; spawnAt: number }>;
  endBeatTimer: number;
  endBeatDuration: number;
  seed: number;
}

export interface SaveData {
  timeline: number; // 1, 2, 3... infinite loops
  highestUnlockedStageIdx: number; // 0..14
  clearedStageIds: string[];
  coins: number;
  foodLevel: number;
  baseLevel: number;
  allyAgeIndex: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  adsRemoved: boolean;
  seenGroupTip: boolean;
  unlockedCgIds: string[];
  claimedAchievementIds: string[];
}

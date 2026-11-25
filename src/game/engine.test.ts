import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGES,
  STAGES,
  computeFoodRate,
  getBaseUpgradeCost,
  getFoodUpgradeCost,
  getTimelineAllyMult,
  getTimelineCoinMult,
  getTimelineEnemyMult,
} from './content';
import { DEFAULT_SAVE, advanceTimelineSave } from './storage';
import { BATTLE_CGS, selectBattleCg } from './cgCatalog';
import {
  createBattleState,
  evolveAgeInBattle,
  seedTitleShowcase,
  stepBattle,
  summonPlayerUnit,
  upgradeBaseInBattle,
  upgradeFoodInBattle,
} from './engine';

test('food cadence gates summoning while allowing instant group deploys without cooldown', () => {
  const save = { ...DEFAULT_SAVE };
  const state = createBattleState(STAGES[0], save);
  assert.equal(state.food, 10);
  assert.equal(computeFoodRate(STAGES[0].baseFoodRate, 1), 0.8);

  // Deploy first Oathblade (costs 8 Food -> 2 Food remaining)
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  assert.equal(state.food, 2);
  assert.equal(state.unitsDeployed, 1);
  assert.ok(state.units[0].speed < 22, 'Proposal 1 reduces march speed for deliberate line clashes');

  // Cannot deploy again when food is below unit cost
  assert.equal(summonPlayerUnit(state, 'melee'), false);

  // With sufficient food saved up, players can immediately deploy a squad back-to-back with no cooldown
  state.food = 30;
  assert.equal(summonPlayerUnit(state, 'ranged'), true);
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  assert.equal(state.food, 10);
  assert.equal(state.unitsDeployed, 3);
});

test('Oathblade melee cleave hits multiple grouped enemy grunts and knocks them back', () => {
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 20;
  assert.equal(summonPlayerUnit(state, 'melee'), true);

  const knight = state.units[0];
  knight.x = 150;
  knight.cooldownTimer = 0;

  // Spawn 4 grouped enemy clubkins in cleave splash radius
  const age0Enemy = AGES[0].enemyUnits.melee;
  for (let i = 0; i < 4; i++) {
    state.units.push({
      id: state.nextId++,
      faction: 'enemy',
      role: 'melee',
      ageIndex: 0,
      x: 162 + i * 3,
      laneOffset: 0,
      targetLaneOffset: 0,
      preferredLane: 0,
      spawnAge: 1,
      hp: age0Enemy.hp,
      maxHp: age0Enemy.hp,
      dmg: age0Enemy.dmg,
      range: age0Enemy.range,
      speed: 0,
      attackCooldown: 1,
      cooldownTimer: 1,
      attackAnimTimer: 0,
      hitFlashTimer: 0,
      walkPhase: 0,
      state: 'walk',
      dieTimer: 0,
      scale: age0Enemy.scale,
      splashRadius: 0,
      cleaveCount: 1,
      pierceCount: 1,
      knockback: 0,
      auraDefense: 0,
      armorReduction: 0,
      knockbackImmune: false,
    });
  }

  stepBattle(state, 0.05);
  const enemies = state.units.filter((u) => u.faction === 'enemy');
  const damaged = enemies.filter((u) => u.hp < u.maxHp);
  assert.equal(damaged.length, knight.cleaveCount, 'cleave hits up to cleaveCount grouped grunts');
  assert.ok(damaged.every((u) => u.x > 162), 'knockback pushes cleaved enemy pack backward');
});

test('Royal Longbow arrow is single-target (vanishes on first enemy hit) and still lands if target is knocked back', () => {
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 20;
  assert.equal(summonPlayerUnit(state, 'ranged'), true);
  const archer = state.units[0];
  archer.x = 100;
  archer.laneOffset = 0;
  archer.cooldownTimer = 0;

  const enemySpec = AGES[0].enemyUnits.melee;
  for (let i = 0; i < 3; i++) {
    state.units.push({
      id: state.nextId++,
      faction: 'enemy',
      role: 'melee',
      ageIndex: 0,
      x: 150 + i * 16,
      laneOffset: 0,
      targetLaneOffset: 0,
      preferredLane: 0,
      spawnAge: 1,
      hp: 60,
      maxHp: 60,
      dmg: 1,
      range: 10,
      speed: 0,
      attackCooldown: 10,
      cooldownTimer: 10,
      attackAnimTimer: 0,
      hitFlashTimer: 0,
      walkPhase: 0,
      state: 'walk',
      dieTimer: 0,
      scale: enemySpec.scale,
      splashRadius: 0,
      cleaveCount: 1,
      pierceCount: 1,
      knockback: 0,
      auraDefense: 0,
      armorReduction: 0,
      knockbackImmune: false,
    });
  }

  // Fire one shot and simulate front enemy being knocked back slightly while arrow is mid-flight
  stepBattle(state, 0.05);
  const frontEnemy = state.units.find((u) => u.faction === 'enemy')!;
  frontEnemy.x += 12;
  for (let i = 0; i < 12; i++) stepBattle(state, 0.05);
  const damagedCount = state.units.filter((u) => u.faction === 'enemy' && u.hp < 60).length;
  assert.equal(damagedCount, 1, `single-target arrow should hit only first enemy even after knockback, hit ${damagedCount}`);
});

test('high-cost Giant (42 Food) has super-armor, knockback immunity vs grunts, and seismic ground-slam AoE', () => {
  const events: string[] = [];
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 41;
  assert.equal(summonPlayerUnit(state, 'heavy', (ev) => events.push(ev)), false, 'requires 42 Food');

  state.food = 42;
  assert.equal(summonPlayerUnit(state, 'heavy', (ev) => events.push(ev)), true, 'summons Giant at 42 Food');
  assert.ok(events.includes('giant_stomp'), 'plays deep giant_stomp cue on entrance');
  assert.ok(state.slamWaves.length >= 1, 'emits stomp shockwave ring on entrance');

  const giant = state.units[0];
  assert.equal(giant.x, -24, 'Ally Brass Mech walks in from off-screen left behind castle');
  assert.equal(giant.laneOffset, -0.62, 'Mech starts on behind-base back lane so castle is never occluded');
  assert.ok(giant.scale >= 3.2, `Mech towers at colossal Zomboss scale (>=3.2), got ${giant.scale}`);

  // Verify 100% symmetrical Ally vs Enemy Giant combat stats across all 5 Ages
  for (const age of AGES) {
    assert.equal(age.units.heavy.hp, age.enemyUnits.heavy.hp, `${age.id} Giant HP parity`);
    assert.equal(age.units.heavy.dmg, age.enemyUnits.heavy.dmg, `${age.id} Giant DMG parity`);
    assert.equal(age.units.heavy.range, age.enemyUnits.heavy.range, `${age.id} Giant range parity`);
    assert.equal(age.units.heavy.speed, age.enemyUnits.heavy.speed, `${age.id} Giant speed parity`);
    assert.equal(age.units.heavy.armorReduction, age.enemyUnits.heavy.armorReduction, `${age.id} Giant armor parity`);
    assert.equal(age.units.heavy.scale, age.enemyUnits.heavy.scale, `${age.id} Giant scale parity`);
  }

  giant.x = 150;
  giant.laneOffset = -0.16;
  giant.cooldownTimer = 1; // Let enemy grunt strike first so Giant's knockback doesn't push it out of range
  const startHp = giant.hp;

  // Enemy grunt hits Giant -> reduced by Giant innate armorReduction (20%), no knockback
  state.units.push({
    id: state.nextId++,
    faction: 'enemy',
    role: 'melee',
    ageIndex: 0,
    x: 168,
    laneOffset: 0,
    targetLaneOffset: 0,
    preferredLane: 0,
    spawnAge: 1,
    hp: 200,
    maxHp: 200,
    dmg: 20,
    range: 24,
    speed: 0,
    attackCooldown: 5,
    cooldownTimer: 0,
    attackAnimTimer: 0,
    hitFlashTimer: 0,
    walkPhase: 0,
    state: 'attack',
    dieTimer: 0,
    scale: 1.0,
    splashRadius: 0,
    cleaveCount: 1,
    pierceCount: 1,
    knockback: 8,
    auraDefense: 0,
    armorReduction: 0,
    knockbackImmune: false,
  });

  // Extra grouped enemies behind primary target to test Giant seismic slam
  for (let i = 0; i < 4; i++) {
    state.units.push({
      id: state.nextId++,
      faction: 'enemy',
      role: 'melee',
      ageIndex: 0,
      x: 174 + i * 4,
      laneOffset: 0,
      targetLaneOffset: 0,
      preferredLane: 0,
      spawnAge: 1,
      hp: 120,
      maxHp: 120,
      dmg: 1,
      range: 10,
      speed: 0,
      attackCooldown: 10,
      cooldownTimer: 10,
      attackAnimTimer: 0,
      hitFlashTimer: 0,
      walkPhase: 0,
      state: 'walk',
      dieTimer: 0,
      scale: 1.0,
      splashRadius: 0,
      cleaveCount: 1,
      pierceCount: 1,
      knockback: 0,
      auraDefense: 0,
      armorReduction: 0,
      knockbackImmune: false,
    });
  }

  // Step 1: Enemy grunt strikes Giant
  stepBattle(state, 0.05, (ev) => events.push(ev));
  assert.equal(startHp - giant.hp, 16, 'Giant innate 20% armor reduces 20 raw dmg to 16');
  assert.equal(giant.x, 150, 'Giant resists knockback from regular grunts');

  // Step 2: Giant swings back with seismic ground-slam AoE
  giant.cooldownTimer = 0;
  stepBattle(state, 0.05, (ev) => events.push(ev));
  assert.ok(events.includes('giant_slam'), 'Giant hammer hit emits seismic giant_slam audio');
  assert.ok(state.groundCracks.length >= 1, 'Giant ground-slam leaves lingering ink cracks on the road');
  const hitEnemies = state.units.filter((u) => u.faction === 'enemy' && u.hp < u.maxHp).length;
  assert.equal(hitEnemies, 5, 'Giant seismic ground-slam cleaves entire enemy pack');
});

test('in-battle food and base upgrades spend coins and immediately boost stats', () => {
  const save = { ...DEFAULT_SAVE, coins: 40 };
  const state = createBattleState(STAGES[0], save);
  const foodCost = getFoodUpgradeCost(1);
  const baseCost = getBaseUpgradeCost(1);
  const oldMaxHp = state.allyBaseMaxHp;

  assert.equal(upgradeFoodInBattle(state), true);
  assert.equal(state.foodLevel, 2);
  assert.equal(state.coins, 40 - foodCost);

  assert.equal(upgradeBaseInBattle(state), true);
  assert.equal(state.baseLevel, 2);
  assert.equal(state.coins, 40 - foodCost - baseCost);
  assert.ok(state.allyBaseMaxHp > oldMaxHp);
});

test('evolving age unlocks next tier Royal Vanguards and boosts base HP', () => {
  const save = { ...DEFAULT_SAVE, coins: 60 };
  const state = createBattleState(STAGES[0], save);
  const oldMaxHp = state.allyBaseMaxHp;

  assert.equal(evolveAgeInBattle(state), true);
  assert.equal(state.allyAgeIndex, 1);
  assert.ok(state.allyBaseMaxHp > oldMaxHp);
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  assert.equal(state.units[0].ageIndex, 1);
});

test('victory and defeat conditions trigger cleanly with zero-hp bases', () => {
  const save = { ...DEFAULT_SAVE, coins: 0 };
  const winState = createBattleState(STAGES[0], save);
  winState.food = 56;
  assert.equal(summonPlayerUnit(winState, 'heavy'), true);
  for (let i = 0; i < 60; i++) stepBattle(winState, 0.05);
  assert.equal(summonPlayerUnit(winState, 'melee'), true);
  for (let i = 0; i < 100; i++) stepBattle(winState, 0.05);
  assert.equal(summonPlayerUnit(winState, 'ranged'), true);
  for (let i = 0; i < 1800 && winState.phase === 'playing'; i++) {
    // Reinforce steadily once natural food accumulates like a real player push
    if (winState.food >= 12 && winState.units.filter((u) => u.faction === 'ally').length < 5) {
      summonPlayerUnit(winState, winState.unitsDeployed % 2 === 0 ? 'melee' : 'ranged');
    }
    stepBattle(winState, 0.05);
  }
  assert.equal(winState.phase, 'victory');
  assert.equal(winState.enemyBaseHp, 0);
  assert.ok(winState.time >= 20 && winState.time <= 75, `expected deliberate march & siege duration, got ${winState.time.toFixed(1)}s`);
  assert.ok(winState.coinsEarnedThisRun >= STAGES[0].victoryBonusCoins);

  // Defeat test when player does nothing on Stage 1-3
  const loseState = createBattleState(STAGES[2], { ...DEFAULT_SAVE });
  for (let i = 0; i < 1800 && loseState.phase === 'playing'; i++) {
    stepBattle(loseState, 0.05);
  }
  assert.equal(loseState.phase, 'defeat');
  assert.equal(loseState.allyBaseHp, 0);
});

test('seedTitleShowcase populates a 3 Royal Vanguard vs 7 Hearthclan Grunt clash', () => {
  const state = createBattleState(STAGES[0], { ...DEFAULT_SAVE });
  seedTitleShowcase(state);
  const allies = state.units.filter((u) => u.faction === 'ally');
  const enemies = state.units.filter((u) => u.faction === 'enemy');
  assert.equal(allies.length, 3);
  assert.equal(enemies.length, 7);
  assert.ok(allies.some((u) => u.x > 140));
  assert.ok(enemies.some((u) => u.x < 210));
  assert.equal(state.unitsDeployed, 0);
});

test('selectBattleCg picks all 3 victory and 3 defeat CGs based on castle HP loss tiers', () => {
  // Victory CG III: full HP (no damage taken)
  assert.equal(
    selectBattleCg('victory', {
      allyBaseHpRatio: 1,
      allyBaseDamageTaken: 0,
      enemyBaseHpRatio: 0,
    }).id,
    'victory_astral_crown'
  );
  // Victory CG II: 1%–40% ally castle HP lost (or healed back after taking damage)
  assert.equal(
    selectBattleCg('victory', {
      allyBaseHpRatio: 0.6,
      allyBaseDamageTaken: 160,
      enemyBaseHpRatio: 0,
    }).id,
    'victory_swarm_surge'
  );
  // Victory CG I: >40% ally castle HP lost
  assert.equal(
    selectBattleCg('victory', {
      allyBaseHpRatio: 0.45,
      allyBaseDamageTaken: 220,
      enemyBaseHpRatio: 0,
    }).id,
    'victory_banner_dawn'
  );

  // Defeat CG III (most devastating): enemy tower untouched at 100% HP
  assert.equal(
    selectBattleCg('defeat', {
      allyBaseHpRatio: 0,
      enemyBaseHpRatio: 1,
    }).id,
    'defeat_siege_eclipse'
  );
  // Defeat CG I (moderate retreat): enemy tower lost 1%–40% HP
  assert.equal(
    selectBattleCg('defeat', {
      allyBaseHpRatio: 0,
      enemyBaseHpRatio: 0.65,
    }).id,
    'defeat_rain_retreat'
  );
  // Defeat CG II (lightest/narrowest defeat): enemy tower lost >40% HP
  assert.equal(
    selectBattleCg('defeat', {
      allyBaseHpRatio: 0,
      enemyBaseHpRatio: 0.42,
    }).id,
    'defeat_inches_short'
  );
});

test('Timeline loop scaling strengthens enemies, grants Vanguard blessing, and preserves coins across resets', () => {
  const tl1Save = {
    ...DEFAULT_SAVE,
    timeline: 1,
    highestUnlockedStageIdx: 14,
    clearedStageIds: STAGES.map((s) => s.id),
    coins: 320,
    foodLevel: 4,
    baseLevel: 5,
    allyAgeIndex: 4,
    unlockedCgIds: ['victory_astral_crown'],
    claimedAchievementIds: ['victory_astral_crown'],
    adsRemoved: true,
  };

  const tl1Battle = createBattleState(STAGES[0], tl1Save);
  assert.equal(tl1Battle.timeline, 1);
  assert.equal(tl1Battle.enemyBaseMaxHp, STAGES[0].enemyBaseHp);

  const tl2Save = advanceTimelineSave(tl1Save);
  assert.equal(tl2Save.timeline, 2);
  assert.equal(tl2Save.highestUnlockedStageIdx, 0);
  assert.equal(tl2Save.clearedStageIds.length, 0);
  assert.equal(tl2Save.foodLevel, 1);
  assert.equal(tl2Save.baseLevel, 1);
  assert.equal(tl2Save.allyAgeIndex, 0);
  assert.equal(tl2Save.coins, 320);
  assert.deepEqual(tl2Save.unlockedCgIds, ['victory_astral_crown']);
  assert.deepEqual(tl2Save.claimedAchievementIds, ['victory_astral_crown']);
  assert.equal(tl2Save.adsRemoved, true);

  const tl2Battle = createBattleState(STAGES[0], tl2Save);
  assert.equal(tl2Battle.timeline, 2);
  assert.equal(
    tl2Battle.enemyBaseMaxHp,
    Math.round(STAGES[0].enemyBaseHp * getTimelineEnemyMult(2))
  );
  assert.equal(
    tl2Battle.allyBaseMaxHp,
    Math.round(380 * getTimelineAllyMult(2))
  );

  // Summon an Oathblade on Timeline 2 and verify Vanguard blessing scaling
  tl2Battle.food = 20;
  assert.equal(summonPlayerUnit(tl2Battle, 'melee'), true);
  assert.equal(
    tl2Battle.units[0].maxHp,
    Math.round(AGES[0].units.melee.hp * getTimelineAllyMult(2))
  );

  // Verify Timeline 2 victory coins scale up
  tl2Battle.enemyBaseHp = 0;
  stepBattle(tl2Battle, 0.05);
  assert.equal(tl2Battle.phase, 'victory');
  assert.equal(
    tl2Battle.coinsEarnedThisRun,
    Math.round(STAGES[0].victoryBonusCoins * getTimelineCoinMult(2))
  );
});

test('allies emerge from base doorway (ALLY_BASE_X - 4, lane 0) and spread smoothly over 0.25s+', () => {
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 20;
  assert.equal(summonPlayerUnit(state, 'melee'), true);

  const ally = state.units[0];
  assert.equal(ally.x, 34, 'spawns behind base doorway curtain (ALLY_BASE_X - 4)');
  assert.equal(ally.laneOffset, 0, 'starts centered in house doorway');
  assert.equal(ally.spawnAge, 0, 'starts at 0s spawn age for 0.25s fade-in');

  // Walk past 0.25s and out the doorway
  for (let i = 0; i < 60; i++) stepBattle(state, 0.05);
  assert.ok(ally.spawnAge >= 0.25, 'completes 0.25s doorway fade-in');
  assert.ok(ally.x > 46, 'marches out of house toward battle');
});

test('PvZ 3-wave progress bar triggers 3.5s W1 tremors, war-drums, T2 scout counts, and 3 escalating Huge Waves', () => {
  const events: string[] = [];
  const state = createBattleState(STAGES[1], { ...DEFAULT_SAVE }); // Stage 1-2 has escalating waves + Giants
  state.allyBaseHp = 50000;
  state.allyBaseMaxHp = 50000;
  assert.equal(state.hugeWaveFlags.length, 3);
  assert.equal(state.waveProgress, 0);

  let sawWarning = false;
  let peakTension = 0;
  let peakTremor = 0;
  let sawWave1Comp: { melee: number; ranged: number; heavy: number } | null = null;
  let sawWave2Comp: { melee: number; ranged: number; heavy: number } | null = null;
  for (let i = 0; i < 4500 && state.phase === 'playing'; i++) {
    stepBattle(state, 0.05, (ev) => events.push(ev));
    peakTension = Math.max(peakTension, state.waveTensionLevel);
    peakTremor = Math.max(peakTremor, state.tremorPulse);
    if (state.incomingHugeWave) {
      sawWarning = true;
      assert.ok(state.incomingHugeWave.countdown <= 3.5);
      if (state.incomingHugeWave.index === 1 && !sawWave1Comp) {
        sawWave1Comp = { ...state.incomingHugeWave.composition };
      }
      if (state.incomingHugeWave.index === 2 && !sawWave2Comp) {
        sawWave2Comp = { ...state.incomingHugeWave.composition };
      }
    }
    if (state.hugeWavesTriggered >= 3) break;
  }

  assert.equal(sawWarning, true, 'triggers 3.5s pre-wave countdown warning');
  assert.ok(peakTension >= 0.9, `expected tension to reach >=0.9, got ${peakTension}`);
  assert.ok(peakTremor >= 0.9, `expected W1 ground tremor pulse >=0.9, got ${peakTremor}`);
  assert.ok(events.includes('wave_warn'), 'emits wave_warn horn cue');
  assert.ok(events.includes('wave_drum'), 'emits seismic wave_drum cue');
  assert.deepEqual(sawWave1Comp, { melee: 5, ranged: 1, heavy: 0 }, 'previews exact Stage 1-2 Wave 1 counts');
  assert.deepEqual(sawWave2Comp, { melee: 7, ranged: 3, heavy: 1 }, 'previews exact Stage 1-2 Wave 2 Giant counts');
  assert.equal(state.hugeWavesTriggered, 3, 'unleashes all 3 huge waves');
  assert.equal(state.waveProgress, 1, 'progress bar reaches 100% by Final Siege');
});

test('3B sawtooth stage difficulty & strict 1 < 2 << 3 wave escalation across all 15 stages', () => {
  const waveTotal = (w: (typeof STAGES)[number]['waves'][number]) =>
    w.groups ? w.groups.reduce((s, g) => s + g.count, 0) : w.count;

  for (const s of STAGES) {
    const hugeWaves = s.waves.filter((w) => w.hugeWaveIndex);
    assert.equal(hugeWaves.length, 3, `${s.id} has 3 huge waves`);
    const [n1, n2, n3] = hugeWaves.map(waveTotal);
    assert.ok(n2 >= Math.floor(n1 * 1.6), `${s.id} Wave 2 (${n2}) escalates sharply over Wave 1 (${n1})`);
    assert.ok(n3 >= Math.floor(n2 * 1.3), `${s.id} Wave 3 (${n3}) escalates sharply over Wave 2 (${n2})`);
  }

  for (let ch = 0; ch < 5; ch++) {
    const b1 = STAGES[ch * 3];
    const b2 = STAGES[ch * 3 + 1];
    const b3 = STAGES[ch * 3 + 2];

    const countGiants = (s: (typeof STAGES)[number]) =>
      s.waves.reduce((sum, w) => {
        if (w.groups) {
          return sum + w.groups.filter((g) => g.role === 'heavy').reduce((a, g) => a + g.count, 0);
        }
        return sum + (w.role === 'heavy' ? w.count : 0);
      }, 0);

    assert.ok(b2.enemyHpMult > b1.enemyHpMult, `${b2.id} spikes enemyHpMult over ${b1.id}`);
    assert.ok(countGiants(b2) > countGiants(b1), `${b2.id} spikes Giant threat over ${b1.id}`);
    assert.ok(b3.enemyHpMult < b2.enemyHpMult, `${b3.id} dips enemyHpMult slightly from ${b2.id}`);
    assert.ok(countGiants(b3) < countGiants(b2), `${b3.id} eases Giant count from ${b2.id}`);
    assert.ok(b3.enemyBaseHp > b2.enemyBaseHp, `${b3.id} shifts weight to chapter-end base HP`);
  }
});

test('C1 stops all enemy spawns after Wave 3 and activates Final Charge (+80% speed, +50% siege dmg) when field clears', () => {
  const events: string[] = [];
  const state = createBattleState(STAGES[0], { ...DEFAULT_SAVE });
  state.allyBaseHp = 50000;
  state.allyBaseMaxHp = 50000;
  state.enemyBaseHp = 5000;
  state.enemyBaseMaxHp = 5000;

  // Run until Wave 3 has finished deploying and all pending spawns are flushed
  for (let i = 0; i < 4500 && !(state.allWavesDeployed && state.pendingSpawns.length === 0); i++) {
    stepBattle(state, 0.05, (ev) => events.push(ev));
  }
  assert.equal(state.allWavesDeployed, true, 'all 3 waves deployed');
  assert.equal(state.pendingSpawns.length, 0, 'no pending spawns remain');

  // Clear all enemies from the field
  state.units = state.units.filter((u) => u.faction !== 'enemy');
  state.food = 20;
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  const knight = state.units[0];
  const baseSpeed = knight.speed;
  const startX = knight.x;

  // Step 1 second: no new enemies spawn, Final Charge activates, and knight marches at 1.8x speed
  for (let i = 0; i < 20; i++) {
    stepBattle(state, 0.05, (ev) => events.push(ev));
  }

  assert.equal(state.finalChargeActive, true, 'Final Charge triggers once field is cleared after Wave 3');
  assert.ok(events.includes('charge'), 'emits charge sound event');
  assert.equal(
    state.units.filter((u) => u.faction === 'enemy').length,
    0,
    'enemy base permanently stops spawning after Wave 3'
  );
  assert.equal(state.pendingSpawns.length, 0, 'no loop-back waves ever queued');

  const movedDist = knight.x - startX;
  assert.ok(
    movedDist > baseSpeed * 1.65,
    `expected ~1.8x charge move speed (${(baseSpeed * 1.8).toFixed(1)}), got ${movedDist.toFixed(1)}`
  );

  // Place knight in front of enemy base and verify +50% siege damage
  knight.x = 290;
  knight.cooldownTimer = 0;
  const hpBefore = state.enemyBaseHp;
  stepBattle(state, 0.05);
  assert.equal(
    hpBefore - state.enemyBaseHp,
    Math.round(knight.dmg * 1.5),
    'Final Charge boosts siege damage to enemy base by +50%'
  );
});

test('allies lock cleanly onto castle-threatening enemies without vertical flickering and settle calmly when field clears', () => {
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 48;
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  assert.equal(summonPlayerUnit(state, 'ranged'), true);
  const knight = state.units.find((u) => u.role === 'melee')!;
  const archer = state.units.find((u) => u.role === 'ranged')!;
  knight.x = 70;
  knight.laneOffset = 0;
  knight.preferredLane = 0;
  archer.x = 42;
  archer.laneOffset = 0.08;
  archer.preferredLane = 0.08;

  const makeEnemy = (x: number, lane: number, role: 'melee' | 'heavy' = 'melee') => ({
    id: state.nextId++,
    faction: 'enemy' as const,
    role,
    ageIndex: 0,
    x,
    laneOffset: lane,
    targetLaneOffset: lane,
    preferredLane: lane,
    spawnAge: 1,
    hp: 300,
    maxHp: 300,
    dmg: 1,
    range: 10,
    speed: 0,
    attackCooldown: 10,
    cooldownTimer: 10,
    attackAnimTimer: 0,
    hitFlashTimer: 0,
    walkPhase: 0,
    state: 'walk' as const,
    dieTimer: 0,
    scale: 1,
    splashRadius: 0,
    cleaveCount: 1,
    pierceCount: 1,
    knockback: 0,
    auraDefense: 0,
    armorReduction: 0,
    knockbackImmune: false,
  });

  // Closest castle threat in lower lane (+0.7) plus enemies behind it
  state.units.push(
    makeEnemy(170, 0.7, 'melee'),
    makeEnemy(210, -0.7, 'melee'),
    makeEnemy(215, 0.68, 'melee'),
    makeEnemy(222, 0.75, 'melee')
  );

  let reversals = 0;
  let lastDir = 0;
  for (let i = 0; i < 50; i++) {
    const prevY = knight.laneOffset;
    stepBattle(state, 0.05);
    const dy = knight.laneOffset - prevY;
    if (Math.abs(dy) > 0.004) {
      const dir = Math.sign(dy);
      if (lastDir !== 0 && dir !== lastDir) reversals += 1;
      lastDir = dir;
    }
  }
  assert.ok(knight.laneOffset > 0.45, `melee should lock and intercept closest +0.7 threat, got ${knight.laneOffset.toFixed(2)}`);
  assert.ok(reversals <= 1, `melee march should have zero flickering reversals, got ${reversals}`);
  assert.ok(archer.laneOffset > 0.12, `ranged should gently drift toward enemy front, got ${archer.laneOffset.toFixed(2)}`);

  // Clear all enemies -> melee glides calmly toward personal forward lane near center
  state.units = state.units.filter((u) => u.faction === 'ally');
  for (let i = 0; i < 55; i++) stepBattle(state, 0.05);
  assert.ok(Math.abs(knight.laneOffset) < 0.35, `knight should settle near center lane, got ${knight.laneOffset.toFixed(2)}`);
});

test('slot saturation splits allied melee squads organically across two enemy flanks without synchronized snapping', () => {
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 30;
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  const [m1, m2] = state.units;
  m1.x = 70;
  m1.laneOffset = 0;
  m1.targetLaneOffset = 0;
  m1.preferredLane = -0.2;
  m2.x = 72;
  m2.laneOffset = 0;
  m2.targetLaneOffset = 0;
  m2.preferredLane = 0.2;

  const makeEnemy = (x: number, lane: number) => ({
    id: state.nextId++,
    faction: 'enemy' as const,
    role: 'melee' as const,
    ageIndex: 0,
    x,
    laneOffset: lane,
    targetLaneOffset: lane,
    preferredLane: lane,
    spawnAge: 1,
    hp: 300,
    maxHp: 300,
    dmg: 1,
    range: 10,
    speed: 0,
    attackCooldown: 10,
    cooldownTimer: 10,
    attackAnimTimer: 0,
    hitFlashTimer: 0,
    walkPhase: 0,
    state: 'walk' as const,
    dieTimer: 0,
    scale: 1,
    splashRadius: 0,
    cleaveCount: 1,
    pierceCount: 1,
    knockback: 0,
    auraDefense: 0,
    armorReduction: 0,
    knockbackImmune: false,
  });

  // Two equal-sized packs: 2 enemies in upper flank (-0.68), 2 enemies in lower flank (+0.68)
  state.units.push(
    makeEnemy(200, -0.68),
    makeEnemy(206, -0.64),
    makeEnemy(200, 0.68),
    makeEnemy(206, 0.64)
  );

  for (let i = 0; i < 36; i++) stepBattle(state, 0.05);
  assert.ok(
    (m1.laneOffset < -0.35 && m2.laneOffset > 0.35) ||
      (m2.laneOffset < -0.35 && m1.laneOffset > 0.35),
    `expected melee pair to split across flanks, got m1=${m1.laneOffset.toFixed(2)}, m2=${m2.laneOffset.toFixed(2)}`
  );
});

test('victory sets 0.95s golden dawnbreak beat and clears storm tension immediately', () => {
  const state = createBattleState(STAGES[0], { ...DEFAULT_SAVE });
  state.waveTensionLevel = 0.85;
  state.enemyBaseHp = 0;
  stepBattle(state, 0.05);
  assert.equal(state.phase, 'victory');
  assert.equal(state.endBeatDuration, 0.95);
  assert.equal(state.endBeatTimer, 0.95);
  assert.equal(state.waveTensionLevel, 0);
});

test('all 6 battle chronicle CGs define achievement metadata with zero achievement coin bounties', () => {
  assert.equal(BATTLE_CGS.length, 6);
  for (const cg of BATTLE_CGS) {
    assert.ok(cg.achievementName.trim().length > 0, `${cg.id} has achievementName`);
    assert.equal(cg.rewardCoins, 0, `${cg.id} does not grant separate achievement coin bounty`);
    assert.ok(cg.triggerRule.trim().length > 0, `${cg.id} has unlock condition`);
  }
});

test('M1 post-defeat Comeback Supply Surge grants +18 starting food and 15s x1.5 food rate before reverting', () => {
  const normal = createBattleState({ ...STAGES[1], waves: [] }, { ...DEFAULT_SAVE }, 0, 0);
  const surged = createBattleState({ ...STAGES[1], waves: [] }, { ...DEFAULT_SAVE }, 18, 15);
  assert.equal(surged.food, normal.food + 18);
  assert.equal(surged.openingSurgeTimer, 15);

  const foodBeforeNormal = normal.food;
  const foodBeforeSurged = surged.food;
  for (let i = 0; i < 200; i++) {
    stepBattle(normal, 0.05); // 10s elapsed
    stepBattle(surged, 0.05);
  }
  const gainedNormal = normal.food - foodBeforeNormal;
  const gainedSurged = surged.food - foodBeforeSurged;
  assert.ok(
    Math.abs(gainedSurged - gainedNormal * 1.5) < 0.05,
    `expected 1.5x food gain during surge (${(gainedNormal * 1.5).toFixed(2)}), got ${gainedSurged.toFixed(2)}`
  );
  assert.ok(surged.openingSurgeTimer > 4.5 && surged.openingSurgeTimer < 5.5);

  // Advance another 6s -> surge expires and returns to 1.0x food rate
  for (let i = 0; i < 120; i++) stepBattle(surged, 0.05);
  assert.equal(surged.openingSurgeTimer, 0);

  // Verify M1 tightened difficulty curve on spike stages (1-2..5-2)
  assert.ok(STAGES[1].enemyHpMult >= 1.15, 'Stage 1-2 spike enforces M1 challenge');
  assert.ok(STAGES[4].enemyHpMult >= 1.28, 'Stage 2-2 spike enforces M1 challenge');
  assert.ok(STAGES[13].enemyHpMult >= 1.4, 'Stage 5-2 spike enforces M1 challenge');
});

test('pre-wave shake lasts half the warning window (1.75s) with gentler trauma and zero shake at all other times', () => {
  const events: string[] = [];
  const state = createBattleState(STAGES[1], { ...DEFAULT_SAVE });
  state.allyBaseHp = 50000;
  state.allyBaseMaxHp = 50000;

  // Non-pre-wave actions (Giant summon, Age evolve) must NOT shake the screen
  state.food = 50;
  state.coins = 500;
  assert.equal(summonPlayerUnit(state, 'heavy'), true);
  assert.equal(state.cameraTrauma, 0, 'summoning Giant produces zero screen shake');
  assert.equal(evolveAgeInBattle(state), true);
  assert.equal(state.cameraTrauma, 0, 'evolving Age produces zero screen shake');

  let firstHalfPeak = 0;
  let secondHalfMax = 0;
  let unleashTrauma = -1;
  let wasWarning = false;

  for (let i = 0; i < 1200 && state.phase === 'playing'; i++) {
    stepBattle(state, 0.05, (ev) => events.push(ev));
    if (state.incomingHugeWave && state.incomingHugeWave.index === 1) {
      wasWarning = true;
      const elapsed = state.incomingHugeWave.duration - state.incomingHugeWave.countdown;
      if (elapsed <= state.incomingHugeWave.duration * 0.5) {
        firstHalfPeak = Math.max(firstHalfPeak, state.cameraTrauma);
      } else {
        secondHalfMax = Math.max(secondHalfMax, state.cameraTrauma);
      }
    } else if (wasWarning && state.hugeWavesTriggered >= 1) {
      unleashTrauma = state.cameraTrauma;
      break;
    }
  }

  assert.ok(
    firstHalfPeak >= 0.45 && firstHalfPeak <= 0.75,
    `expected gentle pre-wave shake peak in [0.45, 0.75], got ${firstHalfPeak.toFixed(3)}`
  );
  assert.equal(secondHalfMax, 0, 'shake stops cleanly after the first half (1.75s) of warning');
  assert.equal(unleashTrauma, 0, 'zero screen shake on wave unleash');
  assert.ok(events.includes('wave_warn'), 'emits wave_warn cue');

  // Victory also produces zero screen shake
  state.enemyBaseHp = 0;
  stepBattle(state, 0.05);
  assert.equal(state.cameraTrauma, 0, 'victory produces zero screen shake');
});






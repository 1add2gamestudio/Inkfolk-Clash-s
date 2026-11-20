import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from './content';
import { DEFAULT_SAVE } from './storage';
import {
  createBattleState,
  stepBattle,
  summonPlayerUnit,
  type UnitCollisionEvent,
} from './engine';
import type { RandomizedBattleSfxPayload } from './audio';
import { createCollisionAudioDirector } from './useBattleCollisionAudio';

function makeSeededRand(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('stepBattle emits frontline_engage, melee_clash, heavy_impact, and projectile_hit collision events', () => {
  const state = createBattleState({ ...STAGES[0], waves: [] }, { ...DEFAULT_SAVE });
  state.food = 100;
  assert.equal(summonPlayerUnit(state, 'melee'), true);
  assert.equal(summonPlayerUnit(state, 'ranged'), true);
  assert.equal(summonPlayerUnit(state, 'heavy'), true);

  const knight = state.units.find((u) => u.role === 'melee')!;
  const archer = state.units.find((u) => u.role === 'ranged')!;
  const giant = state.units.find((u) => u.role === 'heavy')!;

  knight.x = 160;
  knight.cooldownTimer = 0;
  archer.x = 95;
  archer.cooldownTimer = 0;
  giant.x = 152;
  giant.cooldownTimer = 0.06;

  // Place opposing enemy grunts just within engagement range
  for (let i = 0; i < 3; i++) {
    state.units.push({
      id: state.nextId++,
      faction: 'enemy',
      role: 'melee',
      ageIndex: 0,
      x: 176 + i * 6,
      laneOffset: 0,
      targetLaneOffset: 0,
      preferredLane: 0,
      spawnAge: 1,
      hp: 300,
      maxHp: 300,
      dmg: 4,
      range: 18,
      speed: 0,
      attackCooldown: 1.2,
      cooldownTimer: 0.4,
      attackAnimTimer: 0,
      hitFlashTimer: 0,
      walkPhase: 0,
      state: 'walk',
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
  }

  const collisions: UnitCollisionEvent[] = [];
  for (let i = 0; i < 16; i++) {
    stepBattle(state, 0.05, undefined, (ev) => collisions.push(ev));
  }

  const kinds = new Set(collisions.map((c) => c.kind));
  assert.ok(kinds.has('frontline_engage'), 'emits frontline_engage when lines first meet');
  assert.ok(
    kinds.has('melee_clash') || kinds.has('heavy_impact'),
    'emits melee_clash or heavy_impact on close-quarters hits'
  );
  assert.ok(kinds.has('heavy_impact'), 'emits heavy_impact when Giant or multi-cleave hits');
  assert.ok(kinds.has('projectile_hit'), 'emits projectile_hit when arrow pierces enemy');

  const sample = collisions[0];
  assert.ok(sample.allyCount >= 1 && sample.enemyCount >= 1, 'tracks local clash unit counts');
  assert.ok(
    sample.tugOfWarBalance >= -1 && sample.tugOfWarBalance <= 1,
    'normalizes tugOfWarBalance into [-1, 1]'
  );
});

test('collision audio director triggers randomized steel clashes, war drums, and battle shouts with anti-spam cooldowns', () => {
  let clockMs = 1000;
  const played: RandomizedBattleSfxPayload[] = [];
  const director = createCollisionAudioDirector({
    onPlay: (p) => played.push(p),
    random: makeSeededRand(1337),
    now: () => clockMs,
  });

  // Burst of rapid collisions at the same timestamp -> cooldown prevents audio spam
  const makeClash = (
    kind: UnitCollisionEvent['kind'],
    x: number,
    attackerFaction: 'ally' | 'enemy' = 'ally',
    attackerRole: 'melee' | 'heavy' = 'melee'
  ): UnitCollisionEvent => ({
    kind,
    x,
    intensity: kind === 'heavy_impact' ? 0.9 : 0.65,
    allyCount: 3,
    enemyCount: 4,
    tugOfWarBalance: (x - 180) / 130,
    attackerFaction,
    attackerRole,
    defenderRole: 'melee',
  });

  // 5 collisions within 20ms should only trigger 1 steel clash (cooldown-gated)
  for (let i = 0; i < 5; i++) {
    director.handleCollision(makeClash('frontline_engage', 190));
    clockMs += 4;
  }
  const steelInBurst = played.filter((p) => p.category === 'steel_clash').length;
  assert.equal(steelInBurst, 1, 'cooldown prevents steel clash spam within 20ms');

  // Simulate 12 seconds of ongoing tug-of-war battle shifting across the battlefield
  for (let step = 0; step < 30; step++) {
    clockMs += 400;
    const x = step % 2 === 0 ? 110 + (step % 5) * 30 : 250 - (step % 4) * 25;
    const kind: UnitCollisionEvent['kind'] =
      step % 5 === 0
        ? 'frontline_engage'
        : step % 4 === 0
          ? 'heavy_impact'
          : 'melee_clash';
    director.handleCollision(
      makeClash(kind, x, step % 2 === 0 ? 'ally' : 'enemy', step % 6 === 0 ? 'heavy' : 'melee')
    );
  }

  const steelEvents = played.filter((p) => p.category === 'steel_clash');
  const drumEvents = played.filter((p) => p.category === 'war_drum');
  const shoutEvents = played.filter((p) => p.category === 'battle_shout');

  assert.ok(steelEvents.length >= 10, `expected >= 10 steel clashes, got ${steelEvents.length}`);
  assert.ok(drumEvents.length >= 4, `expected >= 4 war drum pulses, got ${drumEvents.length}`);
  assert.ok(shoutEvents.length >= 3, `expected >= 3 battle shouts, got ${shoutEvents.length}`);

  // Verify randomization produces multiple variants and never repeats the same variant back-to-back
  assert.ok(new Set(steelEvents.map((e) => e.variant)).size >= 3, 'randomizes across steel variants');
  assert.ok(new Set(drumEvents.map((e) => e.variant)).size >= 2, 'randomizes across drum variants');
  assert.ok(new Set(shoutEvents.map((e) => e.variant)).size >= 2, 'randomizes across shout variants');

  for (let i = 1; i < steelEvents.length; i++) {
    assert.notEqual(
      steelEvents[i].variant,
      steelEvents[i - 1].variant,
      'never repeats identical steel clash variant consecutively'
    );
  }

  // Verify stereo panning maps left/right battlefield coordinates cleanly
  assert.ok(
    played.some((e) => e.pan < -0.1) && played.some((e) => e.pan > 0.1),
    'pans collision sounds across left and right stereo field'
  );

  // Verify disabling mutes all collision SFX immediately
  const countBeforeMute = played.length;
  director.setEnabled(false);
  clockMs += 3000;
  director.handleCollision(makeClash('heavy_impact', 200, 'ally', 'heavy'));
  assert.equal(played.length, countBeforeMute, 'setEnabled(false) silences all collision SFX');
});

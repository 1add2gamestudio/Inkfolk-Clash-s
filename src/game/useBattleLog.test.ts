import assert from 'node:assert/strict';
import test from 'node:test';
import { STAGES } from './content';
import { createBattleState } from './engine';
import { DEFAULT_SAVE } from './storage';
import {
  BattleLogRecorder,
  MAX_BATTLE_LOG_ENTRIES,
  formatBattleTimestamp,
} from './useBattleLog';

test('BattleLogRecorder records Unit Clash!, Critical Hit!, and Wave Incoming! with anti-spam cooldowns', () => {
  const recorder = new BattleLogRecorder();
  const state = createBattleState(STAGES[1], { ...DEFAULT_SAVE });

  // 1. Unit Clash! from frontline collision (throttled within 2.6s)
  assert.equal(
    recorder.recordCollision(
      {
        kind: 'frontline_engage',
        x: 180,
        intensity: 0.7,
        allyCount: 3,
        enemyCount: 5,
        tugOfWarBalance: 0,
        attackerFaction: 'ally',
        attackerRole: 'melee',
        defenderRole: 'melee',
      },
      4.2
    ),
    true
  );
  assert.equal(
    recorder.recordCollision(
      {
        kind: 'melee_clash',
        x: 184,
        intensity: 0.6,
        allyCount: 3,
        enemyCount: 5,
        tugOfWarBalance: 0,
        attackerFaction: 'enemy',
        attackerRole: 'melee',
        defenderRole: 'melee',
      },
      5.0
    ),
    false,
    'suppresses duplicate Unit Clash! within cooldown window'
  );

  // 2. Critical Hit! from heavy impact
  assert.equal(
    recorder.recordCollision(
      {
        kind: 'heavy_impact',
        x: 190,
        intensity: 0.9,
        allyCount: 4,
        enemyCount: 5,
        tugOfWarBalance: 0.1,
        attackerFaction: 'ally',
        attackerRole: 'heavy',
        defenderRole: 'melee',
      },
      6.1
    ),
    true
  );

  // 3. Wave Incoming! from wave_warn sound event
  state.time = 12.4;
  state.incomingHugeWave = {
    index: 1,
    title: 'Vanguard Surge',
    countdown: 3.5,
    duration: 3.5,
    composition: { melee: 5, ranged: 1, heavy: 0 },
  };
  assert.equal(recorder.recordSound('wave_warn', state), true);

  const entries = recorder.getEntries();
  assert.equal(entries.length, 3);
  assert.equal(entries[0].label, 'Unit Clash!');
  assert.equal(entries[1].label, 'Critical Hit!');
  assert.equal(entries[2].label, 'Wave Incoming!');
  assert.equal(entries[2].detail, 'Wave 1/3 · Vanguard Surge');
  assert.equal(formatBattleTimestamp(entries[2].timeSec), '0:12');
});

test('BattleLogRecorder caps visible feed at MAX_BATTLE_LOG_ENTRIES and resets cleanly on new match', () => {
  const recorder = new BattleLogRecorder();
  const state = createBattleState(STAGES[0], { ...DEFAULT_SAVE });

  recorder.reset('Battle Started', '1-1 · Willow Brook');
  for (let i = 1; i <= 6; i++) {
    state.time = i * 5;
    recorder.recordSound('hit_heavy', state);
  }

  const entries = recorder.getEntries();
  assert.equal(entries.length, MAX_BATTLE_LOG_ENTRIES);
  assert.equal(entries[entries.length - 1].timeSec, 30);

  recorder.reset('Battle Started', '1-2 · Ashbridge');
  assert.equal(recorder.getEntries().length, 1);
  assert.equal(recorder.getEntries()[0].detail, '1-2 · Ashbridge');
});

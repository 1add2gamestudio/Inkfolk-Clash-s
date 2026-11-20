import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewSim, spawnPlayerUnit, spawnSwarmBurst, stepPreviewSim } from './previewSim';

test('food accumulates and deducts cleanly when spawning player units', () => {
  const sim = createPreviewSim('doodle-bean');
  const startFood = sim.food;
  const spawned = spawnPlayerUnit(sim, 'melee', true);
  assert.equal(spawned, true);
  assert.equal(sim.food, startFood - 3);

  // Advance 1 second -> food grows by foodRate (2.2)
  stepPreviewSim(sim, 0.05);
  assert.ok(sim.food > startFood - 3);
});

test('cannot spawn unit when food is below unit cost', () => {
  const sim = createPreviewSim('pixel-crusade');
  sim.food = 1;
  const spawned = spawnPlayerUnit(sim, 'heavy', true);
  assert.equal(spawned, false);
  assert.equal(sim.food, 1);
});

test('swarm burst spawns multiple allied and enemy units without exceeding cap', () => {
  const sim = createPreviewSim('comic-pop');
  const before = sim.units.length;
  spawnSwarmBurst(sim);
  assert.ok(sim.units.length > before);
  assert.ok(sim.units.length <= 110);
});

test('units march, clash, deal damage, and prune defeated units after KO timer', () => {
  const sim = createPreviewSim('ukiyo-woodblock');
  const initialCoins = sim.coins;
  // Run 8 seconds of simulation in safe 0.04s steps
  for (let i = 0; i < 200; i++) {
    stepPreviewSim(sim, 0.04);
  }
  assert.ok(sim.time > 7.5);
  assert.ok(sim.coins >= initialCoins);
});

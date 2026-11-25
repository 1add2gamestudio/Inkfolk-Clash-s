import { ALLY_BASE_X, ENEMY_BASE_X, GIANT_BEHIND_BASE_CLEARANCE } from './engine';
import type { BattleProjectile, BattleState, BattleUnit } from './types';

export const INK_PALETTE = {
  skyTop: '#F3ECE0',
  skyBottom: '#E0D5C1',
  hills: 'rgba(130, 152, 136, 0.56)',
  meadow: '#A6B191',
  road: '#C9B79C',
  roadEdge: 'rgba(58, 43, 35, 0.42)',
  shadow: 'rgba(58, 43, 35, 0.2)',
  ink: '#3A2B23',
  allyPrimary: '#2E6F7E',
  allySecondary: '#7BA8B0',
  allyCapeDark: '#19434D',
  allySteel: '#D7E0E6',
  allySteelShade: '#9FB1BD',
  enemyPrimary: '#A4423C',
  enemySecondary: '#D47B6A',
  gold: '#C98A2C',
  goldBright: '#E9BA58',
  parchment: '#F9F3E6',
  skin: '#F5DEC4',
};

export function renderBattleCanvas(
  ctx: CanvasRenderingContext2D,
  state: BattleState,
  width: number,
  height: number
): void {
  const horizonY = height * 0.41;
  const laneTopY = height * 0.46;
  const laneBottomY = height * 0.67;
  const scaleX = width / 360;

  // Gentle pre-wave tremor ONLY during incomingHugeWave (no rotation, zero shake at all other times)
  const canShake = state.phase === 'playing' && Boolean(state.incomingHugeWave);
  const traumaSq = canShake ? state.cameraTrauma * state.cameraTrauma : 0;
  const shakeMag = traumaSq * 3.6;
  const shakeX =
    shakeMag > 0.05
      ? (Math.sin(state.time * 44) * 0.65 + Math.sin(state.time * 21 + 1.1) * 0.35) * shakeMag
      : 0;
  const shakeY =
    shakeMag > 0.05
      ? (Math.cos(state.time * 37) * 0.6 + Math.sin(state.time * 17 + 2.4) * 0.4) * shakeMag * 0.65
      : 0;

  ctx.save();
  if (shakeX !== 0 || shakeY !== 0) {
    ctx.translate(shakeX, shakeY);
  }

  const endProgress =
    state.phase === 'victory' || state.phase === 'defeat'
      ? Math.min(
          1,
          Math.max(
            0,
            (state.endBeatDuration - state.endBeatTimer) / Math.max(0.01, state.endBeatDuration)
          )
        )
      : 0;
  const vicT = state.phase === 'victory' ? endProgress : 0;
  const defT = state.phase === 'defeat' ? endProgress : 0;

  // 1. Cold-press sky wash (extra bleed margins so strong full-screen shakes never expose edges)
  const skyGrad = ctx.createLinearGradient(0, -18, 0, horizonY + 14);
  skyGrad.addColorStop(0, INK_PALETTE.skyTop);
  skyGrad.addColorStop(1, INK_PALETTE.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-20, -20, width + 40, horizonY + 34);

  // Warm sun wash (blazes gold on Victory)
  const sunX = width * 0.72 + Math.sin(state.time * 0.2) * 3;
  const sunY = horizonY - 82;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = vicT > 0 ? 'rgba(245, 200, 92, 0.45)' : 'rgba(218, 165, 86, 0.24)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34 + vicT * 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = vicT > 0 ? 'rgba(255, 238, 178, 0.92)' : 'rgba(235, 198, 120, 0.65)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 19 + vicT * 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Victory Dawnbreak Sunbeams angling down across the valley
  if (vicT > 0.01) {
    const beamAlpha = Math.sin(Math.min(1, vicT * 1.15) * Math.PI * 0.85) * 0.34;
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const topX = width * (0.42 + i * 0.17);
      const beamW = 28 + (i % 2) * 14;
      const beamGrad = ctx.createLinearGradient(topX, 0, topX - 75, height * 0.72);
      beamGrad.addColorStop(0, `rgba(255, 232, 152, ${beamAlpha.toFixed(3)})`);
      beamGrad.addColorStop(0.65, `rgba(233, 186, 88, ${(beamAlpha * 0.55).toFixed(3)})`);
      beamGrad.addColorStop(1, 'rgba(233, 186, 88, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(topX - beamW * 0.5, -10);
      ctx.lineTo(topX + beamW * 0.5, -10);
      ctx.lineTo(topX - 55 + beamW * 1.1, height * 0.75);
      ctx.lineTo(topX - 85 - beamW * 0.4, height * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Soft watercolor hills
  ctx.fillStyle = INK_PALETTE.hills;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.bezierCurveTo(
    width * 0.24,
    horizonY - 62,
    width * 0.54,
    horizonY - 20,
    width,
    horizonY - 50
  );
  ctx.lineTo(width, horizonY + 10);
  ctx.lineTo(0, horizonY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK_PALETTE.roadEdge;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Cypress silhouettes along ridge
  ctx.fillStyle = 'rgba(72, 92, 78, 0.65)';
  for (let i = 0; i < 6; i++) {
    const tx = 36 + i * (width * 0.17);
    const th = 18 + (i % 2) * 5;
    ctx.beginPath();
    ctx.ellipse(tx, horizonY - th * 0.6, 6.5, th, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK_PALETTE.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 2. Meadow ground & hand-inked valley road (expanded bleed for strong earthquake shakes)
  ctx.fillStyle = INK_PALETTE.meadow;
  ctx.fillRect(-20, horizonY, width + 40, height - horizonY + 40);

  ctx.fillStyle = '#8F9C7B';
  ctx.fillRect(-20, horizonY - 3, width + 40, 5);

  const trackY = laneTopY - 6;
  const trackH = laneBottomY - laneTopY + 16;
  ctx.fillStyle = INK_PALETTE.road;
  ctx.fillRect(-20, trackY, width + 40, trackH);

  // Subtle wavy pen-ink road edges
  ctx.strokeStyle = INK_PALETTE.roadEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-20, trackY);
  for (let x = -20; x <= width + 20; x += 24) {
    ctx.lineTo(x, trackY + Math.sin(x * 0.08) * 1.4);
  }
  ctx.moveTo(-20, trackY + trackH);
  for (let x = -20; x <= width + 20; x += 24) {
    ctx.lineTo(x, trackY + trackH + Math.cos(x * 0.08) * 1.4);
  }
  ctx.stroke();

  // Organic scattered multi-faceted road stones & gravel clusters (bounce & rattle during seismic tremors!)
  const tremor = Math.min(1, Math.max(0, state.tremorPulse || 0));
  const incomingHasGiant = Boolean(
    state.incomingHugeWave && state.incomingHugeWave.composition.heavy > 0
  );
  const pebbleBounceBase =
    tremor > 0.02
      ? Math.sin(tremor * Math.PI) * (incomingHasGiant ? 8.2 : 5.4)
      : 0;

  for (const stone of ROAD_STONE_FIELD) {
    const px = stone.nx * width;
    const py = trackY + 6 + stone.ny * (trackH - 12);
    const rightWeight = 0.42 + 0.58 * stone.nx;
    // Smaller gravel bounces higher than heavy cobblestones
    const massFactor = stone.size < 2.9 ? 1.25 : stone.size > 4.6 ? 0.52 : 0.88;
    const hop = pebbleBounceBase * rightWeight * massFactor * (0.72 + (stone.seed % 5) * 0.11);
    drawOrganicRoadStone(ctx, px, py, stone.size, stone.seed, stone.toneIdx, hop);
  }

  // W1: Seismic ground ripples expanding leftward from enemy gate on drumbeats
  const baseY = (laneTopY + laneBottomY) * 0.5 + 8;
  const allyX = ALLY_BASE_X * scaleX;
  const enemyX = ENEMY_BASE_X * scaleX;

  if (state.incomingHugeWave && tremor > 0.02) {
    const rippleP = 1 - tremor;
    const maxR = incomingHasGiant ? 165 : 115;
    const r = 18 + rippleP * maxR;
    const alpha = tremor * (incomingHasGiant ? 0.52 : 0.36);
    ctx.save();
    ctx.strokeStyle = incomingHasGiant
      ? `rgba(180, 90, 42, ${alpha.toFixed(3)})`
      : `rgba(88, 68, 52, ${alpha.toFixed(3)})`;
    ctx.lineWidth = incomingHasGiant ? 2.4 : 1.7;
    ctx.beginPath();
    ctx.ellipse(enemyX - 10, baseY + 2, r, r * 0.26, 0, Math.PI * 0.45, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }

  // Persistent Ink Ground Cracks left on the valley road by Giant slams
  const laneCenterY = (laneTopY + laneBottomY) * 0.5;
  const laneHalfH = (laneBottomY - laneTopY) * 0.48;
  for (const gc of state.groundCracks) {
    const gx = gc.x * scaleX;
    const gy = laneCenterY + gc.yOffset * laneHalfH + 3;
    const alpha = Math.min(1, (gc.life / gc.maxLife) * 1.4) * 0.72;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.strokeStyle = `rgba(42, 30, 24, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let b = 0; b < 5; b++) {
      const ang = (b * 1.26 + (gc.seed % 11) * 0.17) % (Math.PI * 2);
      const len1 = 9 + ((gc.seed + b * 7) % 8);
      const len2 = len1 + 7 + ((gc.seed + b * 13) % 8);
      const x1 = Math.cos(ang) * len1;
      const y1 = Math.sin(ang) * len1 * 0.36;
      const x2 = Math.cos(ang + 0.25) * len2;
      const y2 = Math.sin(ang + 0.25) * len2 * 0.36;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Ground-Slam Shockwave Rings from Giant Stomps & Hammer Slams
  for (const sw of state.slamWaves) {
    const sx = sw.x * scaleX;
    const sy = laneCenterY + sw.yOffset * laneHalfH + 2;
    const p = Math.min(1, Math.max(0, sw.progress));
    const r = (10 + p * sw.radius) * scaleX;
    const alpha = (1 - p) * 0.78;
    ctx.save();
    ctx.strokeStyle =
      sw.faction === 'ally'
        ? `rgba(233, 186, 88, ${alpha.toFixed(3)})`
        : `rgba(164, 66, 60, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 3.2 * (1 - p * 0.6);
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(58, 43, 35, ${(alpha * 0.55).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 0.72, r * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // W1: Colossal Giant Silhouette peeking from right edge behind enemy tower when Giants are incoming!
  if (state.incomingHugeWave && incomingHasGiant && vicT === 0) {
    const urgency =
      1 -
      Math.max(
        0,
        Math.min(1, state.incomingHugeWave.countdown / Math.max(0.1, state.incomingHugeWave.duration))
      );
    drawLoomingGiantSilhouette(ctx, enemyX + 16, baseY, urgency, state.time, tremor);
  }

  // 2.8 Behind-Base Entrance Layer: Giants striding in behind their castles never occlude the bases!
  const isBehindBaseGiant = (u: BattleUnit): boolean =>
    u.role === 'heavy' &&
    ((u.faction === 'ally' && u.x < ALLY_BASE_X + GIANT_BEHIND_BASE_CLEARANCE) ||
      (u.faction === 'enemy' && u.x > ENEMY_BASE_X - GIANT_BEHIND_BASE_CLEARANCE));

  const behindBaseUnits = state.units
    .filter(isBehindBaseGiant)
    .sort((a, b) => a.laneOffset - b.laneOffset);
  const frontRoadUnits = state.units
    .filter((u) => !isBehindBaseGiant(u))
    .sort((a, b) => a.laneOffset - b.laneOffset);

  for (const unit of behindBaseUnits) {
    const ux = unit.x * scaleX;
    const uy = laneCenterY + unit.laneOffset * laneHalfH;
    if (unit.faction === 'ally') {
      drawAllyMechColossus(ctx, unit, ux, uy, state.time, state.finalChargeActive, vicT);
    } else {
      drawEnemySiegeWalker(ctx, unit, ux, uy, state.time);
    }
  }

  // 3. Bases (drawn IN FRONT of entering Giants for true 2.5D fortress-dock depth!)
  drawTribalBase(
    ctx,
    'ally',
    state.allyAgeIndex,
    allyX,
    baseY,
    state.allyBaseHitFlash > 0,
    state.allyBaseHp / state.allyBaseMaxHp,
    state.allyBaseHp,
    state.time,
    false,
    defT
  );
  drawTribalBase(
    ctx,
    'enemy',
    state.stage.enemyAgeIndex,
    enemyX,
    baseY,
    state.enemyBaseHitFlash > 0,
    state.enemyBaseHp / state.enemyBaseMaxHp,
    state.enemyBaseHp,
    state.time,
    Boolean(state.incomingHugeWave),
    vicT
  );

  // 4. Units on main battlefield sorted by lane depth
  for (const unit of frontRoadUnits) {
    const ux = unit.x * scaleX;
    const uy = laneCenterY + unit.laneOffset * laneHalfH;
    if (unit.role === 'heavy') {
      if (unit.faction === 'ally') {
        drawAllyMechColossus(ctx, unit, ux, uy, state.time, state.finalChargeActive, vicT);
      } else {
        drawEnemySiegeWalker(ctx, unit, ux, uy, state.time);
      }
    } else if (unit.faction === 'ally') {
      drawRoyalVanguardUnit(ctx, unit, ux, uy, state.time, state.finalChargeActive, vicT);
    } else {
      drawHearthclanGrunt(ctx, unit, ux, uy);
    }

    // Minimalist ink '!' cue (0.45s fade) when a castle-rushing enemy is struck/intercepted into combat
    if (unit.faction === 'enemy' && unit.state !== 'die' && (unit.aggroAlertTimer ?? 0) > 0) {
      const alertT = Math.min(1, (unit.aggroAlertTimer ?? 0) / 0.45);
      const pop = (1 - alertT) * 5;
      const headOffset = unit.role === 'heavy' ? 86 : 30 * unit.scale;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alertT * 1.45);
      ctx.translate(ux, uy - headOffset - pop);
      ctx.font = '900 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.strokeText('!', 0, 0);
      ctx.fillStyle = '#F5C16C';
      ctx.fillText('!', 0, 0);
      ctx.restore();
    }
  }

  // 5. Projectiles
  for (const p of state.projectiles) {
    drawInkProjectile(ctx, p, scaleX, laneCenterY, laneHalfH);
  }

  // 6. Watercolor particles
  for (const pt of state.particles) {
    const px = pt.x * scaleX;
    const py = laneCenterY + pt.yOffset * laneHalfH - 12;
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(px, py, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 7. Floating callouts (-dmg / +coins / evolve)
  for (const c of state.callouts) {
    const cx = c.x * scaleX;
    const rise = (1 - c.life / c.maxLife) * (c.tone === 'evolve' ? 28 : 20);
    const cy = laneCenterY + c.yOffset * laneHalfH - 28 - rise;
    const alpha = Math.min(1, (c.life / c.maxLife) * 1.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    if (c.tone === 'evolve') {
      ctx.font = '800 13px "Fraunces", Georgia, serif';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.strokeText(c.text, cx, cy);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillText(c.text, cx, cy);
    } else if (c.tone === 'coin') {
      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.strokeText(c.text, cx, cy);
      ctx.fillStyle = '#FCD34D';
      ctx.fillText(c.text, cx, cy);
    } else {
      ctx.font =
        c.tone === 'crit'
          ? '800 13px "JetBrains Mono", monospace'
          : '700 10.5px "JetBrains Mono", monospace';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFDF8';
      ctx.strokeText(c.text, cx, cy);
      ctx.fillStyle = c.tone === 'crit' ? '#B91C1C' : INK_PALETTE.ink;
      ctx.fillText(c.text, cx, cy);
    }
    ctx.restore();
  }

  // Soft watercolor edge vignette
  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    width * 0.24,
    width * 0.5,
    height * 0.45,
    width * 0.88
  );
  vig.addColorStop(0, 'rgba(255,255,255,0)');
  vig.addColorStop(1, 'rgba(58, 43, 35, 0.1)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // Pre-wave darkening & bright/dark rhythmic flash disabled for a calmer visual experience

  // Ally Low-HP (<=25%) Warning OR Defeat Collapse: Crimson Heartbeat Vignette & Cold Rain Fade
  const allyHpRatio = state.allyBaseHp / Math.max(1, state.allyBaseMaxHp);
  const lowHpDanger =
    state.phase === 'playing' && allyHpRatio > 0 && allyHpRatio <= 0.25
      ? Math.min(1, 0.35 + ((0.25 - allyHpRatio) / 0.25) * 0.65)
      : 0;

  if (lowHpDanger > 0 || defT > 0) {
    const pulseSpeed = defT > 0 ? 11 : 6.2;
    const pulsePhase = defT > 0 ? defT * Math.PI * 3.2 : state.time * pulseSpeed;
    const pulseWave = Math.pow(0.5 + 0.5 * Math.sin(pulsePhase), 1.5);
    const crimsonStrength =
      defT > 0 ? Math.max(0.28, (1 - defT * 0.45)) : lowHpDanger * 0.85;
    const edgeAlpha = crimsonStrength * (0.3 + pulseWave * 0.38);
    const innerAlpha = crimsonStrength * (0.04 + pulseWave * 0.09);

    const heartVig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      width * (0.24 - pulseWave * 0.04),
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.68
    );
    heartVig.addColorStop(0, 'rgba(148, 22, 26, 0)');
    heartVig.addColorStop(0.56, `rgba(148, 22, 26, ${innerAlpha.toFixed(3)})`);
    heartVig.addColorStop(1, `rgba(138, 16, 20, ${edgeAlpha.toFixed(3)})`);
    ctx.fillStyle = heartVig;
    ctx.fillRect(-10, -10, width + 20, height + 20);

    // On defeat collapse, wash into somber cold rain-slate gloom after initial crimson shock
    if (defT > 0) {
      ctx.fillStyle = `rgba(34, 40, 48, ${(defT * 0.42).toFixed(3)})`;
      ctx.fillRect(-10, -10, width + 20, height + 20);
    }
  }

  // Victory Golden Triumph: Expanding Dawnbreak Shockwave + Flowing Gold Rim Vignette + Gold Petals
  if (vicT > 0) {
    const burstR = 16 + Math.pow(vicT, 0.72) * Math.max(width, height) * 1.05;
    const ringAlpha = Math.max(0, (1 - vicT) * 0.85);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 232, 152, ${ringAlpha.toFixed(3)})`;
    ctx.lineWidth = 5.5 * (1 - vicT * 0.65);
    ctx.beginPath();
    ctx.arc(enemyX, baseY - 22, burstR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright flash bloom on the fallen enemy tower
    const flashAlpha = Math.max(0, (1 - vicT * 1.45) * 0.72);
    if (flashAlpha > 0.01) {
      const bloom = ctx.createRadialGradient(
        enemyX,
        baseY - 22,
        4,
        enemyX,
        baseY - 22,
        125 * (0.4 + vicT)
      );
      bloom.addColorStop(0, `rgba(255, 248, 212, ${flashAlpha.toFixed(3)})`);
      bloom.addColorStop(0.5, `rgba(233, 186, 88, ${(flashAlpha * 0.55).toFixed(3)})`);
      bloom.addColorStop(1, 'rgba(233, 186, 88, 0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(-10, -10, width + 20, height + 20);
    }

    // Flowing Golden Triumph Vignette around all 4 edges
    const shimmer = 0.75 + 0.25 * Math.sin(vicT * Math.PI * 4);
    const goldEdge = Math.min(1, vicT * 2.2) * 0.42 * shimmer;
    const goldVig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.46,
      width * 0.24,
      width * 0.5,
      height * 0.46,
      Math.max(width, height) * 0.66
    );
    goldVig.addColorStop(0, 'rgba(255, 236, 170, 0)');
    goldVig.addColorStop(0.65, `rgba(233, 186, 88, ${(goldEdge * 0.25).toFixed(3)})`);
    goldVig.addColorStop(1, `rgba(218, 158, 46, ${goldEdge.toFixed(3)})`);
    ctx.fillStyle = goldVig;
    ctx.fillRect(-10, -10, width + 20, height + 20);

    // Floating celebratory golden confetti glints
    for (let i = 0; i < 14; i++) {
      const px = ((i * 67 + 29) % (width - 24)) + 12 + Math.sin(vicT * 6 + i) * 10;
      const py = ((i * 53) % (height * 0.65)) + vicT * 38;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 240, 178, 0.85)' : 'rgba(233, 186, 88, 0.85)';
      ctx.beginPath();
      ctx.ellipse(px, py, 3.2, 1.7, vicT * 5 + i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * W1: Menacing towering silhouette of an approaching Enemy Iron Siege Walker (Defeat CG III)
 * with twin smoking exhaust pipes and spiked iron pauldrons rising behind the enemy tower.
 */
function drawLoomingGiantSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  urgency: number,
  time: number,
  tremor: number
): void {
  const rise = 24 * (1 - Math.min(1, urgency * 1.15));
  const sway = Math.sin(time * 2.8) * 3.0;
  const stompDip = tremor * 3.2;
  const alpha = Math.min(0.88, 0.38 + urgency * 0.54);

  ctx.save();
  ctx.translate(x + sway, baseY - 22 + rise + stompDip);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#241917';
  ctx.strokeStyle = '#120C0B';
  ctx.lineWidth = 1.8;

  // Twin uneven industrial smokestacks rising above shoulders
  ctx.fillRect(-16, -98, 6.5, 34);
  ctx.fillRect(10, -92, 6, 28);
  // Coal smoke plumes drifting from smokestacks
  for (let i = 0; i < 3; i++) {
    const puff = ((time * 0.9 + i * 0.33) % 1);
    ctx.save();
    ctx.globalAlpha = alpha * (1 - puff) * 0.6;
    ctx.fillStyle = '#3B2D2A';
    ctx.beginPath();
    ctx.arc(-13 + puff * 9, -100 - puff * 18, 4.5 + puff * 6, 0, Math.PI * 2);
    ctx.arc(13 + puff * 8, -94 - puff * 15, 4 + puff * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Angular armored mech torso + heavy spiked shoulders
  ctx.beginPath();
  ctx.moveTo(-24, 6);
  ctx.lineTo(-29, -46);
  ctx.lineTo(-36, -54);
  ctx.lineTo(-27, -64);
  ctx.lineTo(-14, -70);
  ctx.lineTo(14, -70);
  ctx.lineTo(28, -62);
  ctx.lineTo(35, -52);
  ctx.lineTo(27, -42);
  ctx.lineTo(23, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jagged iron shoulder spikes
  ctx.beginPath();
  ctx.moveTo(-27, -64);
  ctx.lineTo(-37, -75);
  ctx.lineTo(-20, -68);
  ctx.moveTo(26, -62);
  ctx.lineTo(36, -73);
  ctx.lineTo(19, -66);
  ctx.fill();

  // Sunken gear-crested furnace head
  ctx.beginPath();
  ctx.arc(0, -76, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-7, -84);
  ctx.lineTo(-10, -91);
  ctx.lineTo(-3, -86);
  ctx.lineTo(0, -92);
  ctx.lineTo(3, -86);
  ctx.lineTo(10, -90);
  ctx.lineTo(7, -84);
  ctx.closePath();
  ctx.fill();

  // Molten amber furnace visor peering left toward player's castle
  ctx.fillStyle = '#F59E2D';
  ctx.beginPath();
  ctx.roundRect(-8.5, -78.5, 11, 3.2, 1.5);
  ctx.fill();

  ctx.restore();
}

interface RoadStoneSpec {
  nx: number;
  ny: number;
  size: number;
  seed: number;
  toneIdx: number;
}

// Irregular, naturally clustered road stones & field gravel (zero grid periodicity)
const ROAD_STONE_FIELD: RoadStoneSpec[] = [
  // Left road-edge rock cluster near ally bastion
  { nx: 0.055, ny: 0.14, size: 5.2, seed: 11, toneIdx: 0 },
  { nx: 0.088, ny: 0.19, size: 2.5, seed: 23, toneIdx: 2 },
  { nx: 0.125, ny: 0.87, size: 4.8, seed: 37, toneIdx: 1 },
  { nx: 0.152, ny: 0.91, size: 2.3, seed: 41, toneIdx: 3 },
  { nx: 0.195, ny: 0.26, size: 3.1, seed: 53, toneIdx: 2 },
  // Scattered mid-left weathered cobbles
  { nx: 0.245, ny: 0.72, size: 4.4, seed: 67, toneIdx: 0 },
  { nx: 0.272, ny: 0.68, size: 2.2, seed: 71, toneIdx: 1 },
  { nx: 0.31, ny: 0.11, size: 5.6, seed: 83, toneIdx: 3 },
  { nx: 0.342, ny: 0.17, size: 2.7, seed: 97, toneIdx: 0 },
  { nx: 0.375, ny: 0.84, size: 3.6, seed: 109, toneIdx: 2 },
  // Center battlefield loose stones (kept clear & low-contrast so units pop cleanly)
  { nx: 0.44, ny: 0.42, size: 2.9, seed: 127, toneIdx: 1 },
  { nx: 0.495, ny: 0.92, size: 5.3, seed: 139, toneIdx: 0 },
  { nx: 0.525, ny: 0.88, size: 2.6, seed: 151, toneIdx: 3 },
  { nx: 0.56, ny: 0.15, size: 4.1, seed: 163, toneIdx: 2 },
  { nx: 0.615, ny: 0.61, size: 2.8, seed: 179, toneIdx: 1 },
  // Mid-right stony outcrop near siege lane
  { nx: 0.665, ny: 0.21, size: 5.5, seed: 193, toneIdx: 3 },
  { nx: 0.692, ny: 0.14, size: 2.9, seed: 211, toneIdx: 0 },
  { nx: 0.725, ny: 0.82, size: 4.9, seed: 227, toneIdx: 1 },
  { nx: 0.758, ny: 0.87, size: 2.4, seed: 239, toneIdx: 2 },
  { nx: 0.79, ny: 0.48, size: 3.3, seed: 251, toneIdx: 0 },
  // Right road-edge fortress gravel cluster
  { nx: 0.845, ny: 0.12, size: 4.7, seed: 269, toneIdx: 3 },
  { nx: 0.872, ny: 0.18, size: 2.6, seed: 281, toneIdx: 1 },
  { nx: 0.895, ny: 0.78, size: 5.1, seed: 293, toneIdx: 2 },
  { nx: 0.93, ny: 0.84, size: 2.5, seed: 307, toneIdx: 0 },
  { nx: 0.955, ny: 0.28, size: 3.5, seed: 317, toneIdx: 3 },
];

const STONE_TONES = [
  { body: '#A5957E', top: '#C4B59C', shade: '#7E705D' },
  { body: '#948675', top: '#B4A793', shade: '#6E6254' },
  { body: '#B1A086', top: '#CFC0A5', shade: '#8A7B65' },
  { body: '#897D6F', top: '#A89B8B', shade: '#635A4F' },
];

function drawOrganicRoadStone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
  toneIdx: number,
  hop: number
): void {
  const tone = STONE_TONES[toneIdx % STONE_TONES.length];
  const aspectY = 0.56 + ((seed % 7) * 0.032);
  const baseAngle = ((seed * 37) % 100) * 0.0628;
  const tilt = hop > 0.3 ? Math.sin(seed + hop * 0.9) * 0.22 : ((seed % 11) - 5) * 0.04;

  ctx.save();
  // Grounded contact shadow beneath the stone
  ctx.fillStyle = hop > 0.4 ? 'rgba(58, 43, 35, 0.15)' : 'rgba(58, 43, 35, 0.21)';
  ctx.beginPath();
  ctx.ellipse(
    x + size * 0.14,
    y + size * aspectY * 0.45,
    size * (1.02 - Math.min(0.24, hop * 0.03)),
    size * aspectY * 0.52,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.translate(x, y - hop);
  ctx.rotate(tilt);

  // Build angular 6- or 7-vertex chiseled rock polygon
  const verts = size >= 4.2 ? 7 : 6;
  const pts: Array<{ px: number; py: number }> = [];
  for (let k = 0; k < verts; k++) {
    const a = baseAngle + (k / verts) * Math.PI * 2;
    const jitter = 0.72 + ((((seed * (k + 3) * 29) % 19) / 19) * 0.46);
    const flatBottom = Math.sin(a) > 0.35 ? 0.82 : 1.0;
    pts.push({
      px: Math.cos(a) * size * jitter,
      py: Math.sin(a) * size * aspectY * jitter * flatBottom,
    });
  }

  // Main stone body fill
  ctx.fillStyle = tone.body;
  ctx.beginPath();
  ctx.moveTo(pts[0].px, pts[0].py);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].px, pts[k].py);
  ctx.closePath();
  ctx.fill();

  // Lower mineral shade plane
  ctx.fillStyle = tone.shade;
  ctx.beginPath();
  ctx.moveTo(-size * 0.62, size * aspectY * 0.12);
  ctx.lineTo(size * 0.55, size * aspectY * 0.06);
  ctx.lineTo(size * 0.42, size * aspectY * 0.62);
  ctx.lineTo(-size * 0.45, size * aspectY * 0.58);
  ctx.closePath();
  ctx.fill();

  // Sunlit top beveled rock facet (gives genuine 3D stone look!)
  ctx.fillStyle = tone.top;
  ctx.beginPath();
  ctx.moveTo(-size * 0.48, -size * aspectY * 0.12);
  ctx.lineTo(-size * 0.12, -size * aspectY * 0.64);
  ctx.lineTo(size * 0.42, -size * aspectY * 0.38);
  ctx.lineTo(size * 0.15, -size * aspectY * 0.02);
  ctx.closePath();
  ctx.fill();

  // Hand-inked crisp outer rock outline
  ctx.strokeStyle = 'rgba(58, 43, 35, 0.52)';
  ctx.lineWidth = size >= 4.4 ? 1.05 : 0.85;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].px, pts[0].py);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].px, pts[k].py);
  ctx.closePath();
  ctx.stroke();

  // Subtle chiseled fracture line on larger cobblestones
  if (size >= 4.5) {
    ctx.strokeStyle = 'rgba(58, 43, 35, 0.34)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, -size * aspectY * 0.15);
    ctx.lineTo(size * 0.08, size * aspectY * 0.16);
    ctx.lineTo(size * 0.32, size * aspectY * 0.04);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Evolving 5-Age Fortified Castles:
 * - Ally (Left): Ivory-limestone Royal Citadel with teal spires, portcullis gate, warm lantern windows & Lord's Golden Crown Crest!
 * - Enemy (Right): Forged obsidian-basalt Fortress with spiked battlements, crimson towers, furnace slits & smoking chimneys.
 * - Includes 60% masonry cracks & 30% heavy smoke/tilted-banner battle damage states.
 */
function drawTribalBase(
  ctx: CanvasRenderingContext2D,
  faction: 'ally' | 'enemy',
  ageIndex: number,
  x: number,
  y: number,
  flashing: boolean,
  hpRatio: number,
  hpValue: number,
  time: number,
  waveAlert: boolean,
  collapseProgress = 0
): void {
  const isAlly = faction === 'ally';
  const main = isAlly ? INK_PALETTE.allyPrimary : '#963832';
  const accent = isAlly ? INK_PALETTE.goldBright : '#E8822A';
  const stoneMain = flashing ? '#FFFDF7' : isAlly ? '#E4DAC5' : '#4C4341';
  const stoneShade = flashing ? '#FFFDF7' : isAlly ? '#C9BCA3' : '#352E2D';
  const roofColor = flashing ? '#FFFDF7' : main;
  const damaged60 = collapseProgress === 0 && hpRatio < 0.6;
  const damaged30 = collapseProgress === 0 && hpRatio < 0.3;

  ctx.save();
  ctx.translate(x, y);
  if (!isAlly) ctx.scale(-1, 1);

  // Broad fortress foundation shadow
  ctx.fillStyle = INK_PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 6.5, 34 + collapseProgress * 8, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animate castle collapse tilt & sink on victory/defeat
  if (collapseProgress > 0) {
    ctx.globalAlpha = Math.max(0.28, 1 - collapseProgress * 0.68);
    ctx.translate(-collapseProgress * 6, collapseProgress * 18);
    ctx.rotate(-collapseProgress * 0.52);
  }

  ctx.strokeStyle = INK_PALETTE.ink;
  ctx.lineWidth = 1.65;
  ctx.lineJoin = 'round';

  // Helper: Draw crenelated battlements (classic square merlons for Ally, iron spikes for Enemy)
  const drawBattlements = (leftX: number, topY: number, spanW: number, count: number) => {
    const step = spanW / count;
    if (isAlly) {
      ctx.fillStyle = stoneMain;
      for (let i = 0; i < count; i++) {
        if (damaged30 && i === Math.floor(count / 2)) continue; // blown-out merlon at <30% HP
        const mx = leftX + i * step + 1;
        ctx.fillRect(mx, topY - 4.5, step * 0.62, 5);
        ctx.strokeRect(mx, topY - 4.5, step * 0.62, 5);
      }
    } else {
      ctx.fillStyle = flashing ? '#FFFDF7' : '#2C2524';
      for (let i = 0; i < count; i++) {
        if (damaged30 && i === Math.floor(count / 2)) continue;
        const mx = leftX + i * step;
        ctx.beginPath();
        ctx.moveTo(mx + 1, topY + 0.5);
        ctx.lineTo(mx + step * 0.45, topY - 6.2);
        ctx.lineTo(mx + step * 0.85, topY + 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  // Helper: Subtle hand-inked stone masonry brick lines
  const drawStoneCourses = (leftX: number, topY: number, w: number, h: number) => {
    if (flashing) return;
    ctx.save();
    ctx.strokeStyle = isAlly ? 'rgba(116, 98, 76, 0.34)' : 'rgba(22, 16, 15, 0.48)';
    ctx.lineWidth = 0.9;
    const rows = Math.max(2, Math.floor(h / 10));
    for (let r = 1; r < rows; r++) {
      const ry = topY + (r * h) / rows;
      ctx.beginPath();
      ctx.moveTo(leftX + 2, ry);
      ctx.lineTo(leftX + w - 2, ry);
      ctx.stroke();
      const offset = r % 2 === 0 ? w * 0.33 : w * 0.62;
      ctx.beginPath();
      ctx.moveTo(leftX + offset, ry - h / rows);
      ctx.lineTo(leftX + offset, ry);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 1. Rear Keep Tower(s) — evolves cleanly across Ages 0..4
  if (ageIndex === 0) {
    // Age I: Stone Bastion (sturdy rear watchtower + crenelated front wall)
    ctx.fillStyle = stoneShade;
    ctx.fillRect(-23, -52, 20, 54);
    ctx.strokeRect(-23, -52, 20, 54);
    drawStoneCourses(-23, -52, 20, 34);

    // Pitched watchtower roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-26, -52);
    ctx.lineTo(-13, -69);
    ctx.lineTo(0, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front main bastion curtain wall
    ctx.fillStyle = stoneMain;
    ctx.fillRect(-16, -34, 41, 36);
    ctx.strokeRect(-16, -34, 41, 36);
    drawStoneCourses(-16, -34, 41, 34);
    drawBattlements(-16, -34, 41, 5);
  } else if (ageIndex === 1) {
    // Age II: Twin-Tower Bronze/Iron Keep
    ctx.fillStyle = stoneShade;
    ctx.fillRect(-25, -56, 17, 58);
    ctx.strokeRect(-25, -56, 17, 58);
    ctx.fillRect(10, -50, 16, 52);
    ctx.strokeRect(10, -50, 16, 52);

    // Twin conical castle roofs
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-28, -56);
    ctx.lineTo(-16.5, -74);
    ctx.lineTo(-5, -56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(7, -50);
    ctx.lineTo(18, -66);
    ctx.lineTo(29, -50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central gatehouse bridge wall
    ctx.fillStyle = stoneMain;
    ctx.fillRect(-12, -40, 26, 42);
    ctx.strokeRect(-12, -40, 26, 42);
    drawStoneCourses(-12, -40, 26, 40);
    drawBattlements(-12, -40, 26, 3);
  } else if (ageIndex === 2) {
    // Age III: Clockwork / Alchemist Citadel with tall central keep + twin flanking bastions
    ctx.fillStyle = stoneShade;
    ctx.fillRect(-14, -62, 28, 64);
    ctx.strokeRect(-14, -62, 28, 64);
    drawStoneCourses(-14, -62, 28, 42);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-18, -62);
    ctx.lineTo(0, -80);
    ctx.lineTo(18, -62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flanking stone gate-turrets
    ctx.fillStyle = stoneMain;
    ctx.fillRect(-26, -38, 16, 40);
    ctx.strokeRect(-26, -38, 16, 40);
    ctx.fillRect(11, -38, 16, 40);
    ctx.strokeRect(11, -38, 16, 40);
    drawBattlements(-26, -38, 16, 2);
    drawBattlements(11, -38, 16, 2);

    // Guild clockface (Ally) or glowing iron furnace grate (Enemy)
    ctx.fillStyle = isAlly ? '#F9F3E6' : '#261C1A';
    ctx.beginPath();
    ctx.arc(0, -45, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (isAlly) {
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.lineTo(0, -49.5);
      ctx.moveTo(0, -45);
      ctx.lineTo(3.5, -43.5);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#F59E2D';
      ctx.fillRect(-4, -47, 8, 4);
    }
  } else if (ageIndex === 3) {
    // Age IV: Steam / Boiler Armored Fortress with twin puffing chimneys & copper dome
    // Twin back chimneys
    ctx.fillStyle = flashing ? '#FFFDF7' : isAlly ? '#8C7A65' : '#2B2423';
    ctx.fillRect(-22, -68, 7, 26);
    ctx.strokeRect(-22, -68, 7, 26);
    ctx.fillRect(14, -64, 7, 24);
    ctx.strokeRect(14, -64, 7, 24);

    // Rising steam / coal smoke puffs
    if (collapseProgress === 0) {
      for (let s = 0; s < 2; s++) {
        const p = (time * 0.75 + s * 0.5) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.fillStyle = isAlly ? '#F4EEE1' : '#3C3230';
        ctx.beginPath();
        ctx.arc(-18.5 + p * 7, -70 - p * 14, 3 + p * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Armored central dome fortress
    ctx.fillStyle = stoneMain;
    ctx.fillRect(-24, -46, 48, 48);
    ctx.strokeRect(-24, -46, 48, 48);
    drawStoneCourses(-24, -46, 48, 44);

    // Vaulted metallic dome
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.arc(0, -46, 20, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Riveted brass/iron parapet belt
    ctx.fillStyle = flashing ? '#FFFDF7' : isAlly ? INK_PALETTE.gold : '#6B2F2B';
    ctx.fillRect(-26, -48, 52, 5);
    ctx.strokeRect(-26, -48, 52, 5);
    drawBattlements(-24, -48, 48, 5);
  } else {
    // Age V: Astral / Eclipse Grand Spire Citadel
    ctx.fillStyle = stoneShade;
    ctx.fillRect(-25, -48, 14, 50);
    ctx.strokeRect(-25, -48, 14, 50);
    ctx.fillRect(11, -48, 14, 50);
    ctx.strokeRect(11, -48, 14, 50);

    // Twin side minarets
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-27, -48);
    ctx.lineTo(-18, -66);
    ctx.lineTo(-9, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(9, -48);
    ctx.lineTo(18, -66);
    ctx.lineTo(27, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Grand central spire keep
    ctx.fillStyle = stoneMain;
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.lineTo(-13, -62);
    ctx.lineTo(13, -62);
    ctx.lineTo(16, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawStoneCourses(-13, -60, 26, 40);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-16, -62);
    ctx.lineTo(0, -83);
    ctx.lineTo(16, -62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating celestial / eclipse astrolabe halo
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -45, 9.5, 4.2, Math.sin(time * 1.4) * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Glowing Arrow-Slit / Lantern Windows (pulse molten amber on enemy waveAlert!)
  if (!flashing) {
    const glowPulse = waveAlert ? 0.65 + 0.35 * Math.sin(time * 12) : 1;
    ctx.fillStyle = isAlly
      ? '#F6D57A'
      : waveAlert
        ? `rgba(255, 165, 48, ${glowPulse.toFixed(2)})`
        : '#D96B27';
    const winPositions =
      ageIndex === 0
        ? [
            { wx: -15.5, wy: -44 },
            { wx: 13, wy: -26 },
          ]
        : [
            { wx: -18, wy: -36 },
            { wx: 16, wy: -36 },
          ];
    for (const wp of winPositions) {
      ctx.beginPath();
      ctx.roundRect(wp.wx, wp.wy, 4.2, 8, [2, 2, 0, 0]);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. Arched Castle Portcullis Gatehouse (troops emerge cleanly through the gate!)
  ctx.fillStyle = flashing ? '#FFFDF7' : '#261C17';
  ctx.beginPath();
  ctx.roundRect(-7.5, -20, 16, 22, [8, 8, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // Iron portcullis lattice bars across upper doorway arch
  if (!flashing) {
    ctx.strokeStyle = isAlly ? '#6F7F87' : '#574845';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-3.5, -19);
    ctx.lineTo(-3.5, -12);
    ctx.moveTo(0.5, -20);
    ctx.lineTo(0.5, -12);
    ctx.moveTo(4.5, -19);
    ctx.lineTo(4.5, -12);
    ctx.moveTo(-7, -14.5);
    ctx.lineTo(8, -14.5);
    ctx.stroke();
    ctx.strokeStyle = INK_PALETTE.ink;
    ctx.lineWidth = 1.65;
  }

  // 4. Ally Royal Lord's Crown Crest mounted proudly atop the Castle Keep (Crown belongs to the Castle, NOT frontline grunts!)
  if (isAlly && !flashing) {
    const crownX = ageIndex === 0 ? -13 : ageIndex === 1 ? -16.5 : 0;
    const crownY = ageIndex === 0 ? -70 : ageIndex === 1 ? -75 : ageIndex === 3 ? -67 : -82;
    ctx.fillStyle = INK_PALETTE.goldBright;
    ctx.beginPath();
    ctx.moveTo(crownX - 5.5, crownY);
    ctx.lineTo(crownX - 6.5, crownY - 6.5);
    ctx.lineTo(crownX - 2.4, crownY - 3.2);
    ctx.lineTo(crownX, crownY - 8.2);
    ctx.lineTo(crownX + 2.4, crownY - 3.2);
    ctx.lineTo(crownX + 6.5, crownY - 6.5);
    ctx.lineTo(crownX + 5.5, crownY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 5. W1 Enemy Gate Alert: restless spear tips & warhorn rings before Huge Wave
  if (waveAlert && collapseProgress === 0) {
    const shudder = Math.sin(time * 34) * 1.4;
    ctx.save();
    ctx.translate(shudder, 0);
    for (let s = 0; s < 3; s++) {
      const bob = Math.sin(time * 9 + s * 2.1) * 2.2;
      const sx = -2.5 + s * 4.0;
      ctx.strokeStyle = '#E8DFCF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, -2);
      ctx.lineTo(sx + 5.5, -13 - bob);
      ctx.stroke();

      ctx.fillStyle = '#F5C16C';
      ctx.beginPath();
      ctx.moveTo(sx + 7.5, -15.5 - bob);
      ctx.lineTo(sx + 4.2, -13.5 - bob);
      ctx.lineTo(sx + 5.8, -11.5 - bob);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    for (let ring = 0; ring < 2; ring++) {
      const phase = (time * 1.35 + ring * 0.5) % 1;
      const r = 11 + phase * 38;
      const alpha = (1 - phase) * 0.65;
      ctx.strokeStyle = `rgba(233, 186, 88, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.2 * (1 - phase * 0.5);
      ctx.beginPath();
      ctx.arc(6, -11, r, -Math.PI * 0.62, Math.PI * 0.42);
      ctx.stroke();
    }
  }

  // 6. Battle Damage Visual Feedback (60% masonry cracks, 30% severe fracture + rising battle smoke!)
  if (collapseProgress > 0) {
    ctx.strokeStyle = !isAlly ? '#FFF3C4' : '#A4423C';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-1, -22);
    ctx.lineTo(9, -34);
    ctx.moveTo(5, -6);
    ctx.lineTo(-5, -26);
    ctx.stroke();
  } else {
    if (damaged60) {
      ctx.strokeStyle = isAlly ? '#3A2B23' : '#181211';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-11, -14);
      ctx.lineTo(-5, -23);
      ctx.lineTo(-12, -31);
      ctx.moveTo(12, -10);
      ctx.lineTo(8, -19);
      ctx.stroke();
    }
    if (damaged30) {
      // Deeper structural cracks + drifting black battle smoke plumes
      ctx.strokeStyle = isAlly ? '#2A1D17' : '#FF8C42';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(-18, -28);
      ctx.lineTo(-8, -36);
      ctx.lineTo(-15, -45);
      ctx.moveTo(4, -22);
      ctx.lineTo(14, -30);
      ctx.stroke();

      for (let sm = 0; sm < 3; sm++) {
        const p = (time * 0.85 + sm * 0.33) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.62;
        ctx.fillStyle = sm === 0 ? '#4B3E39' : '#2C2422';
        ctx.beginPath();
        ctx.arc(-8 + sm * 9 + Math.sin(time * 2 + sm) * 3, -44 - p * 28, 3.8 + p * 5.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 7. Castle Rampart War-Banner (tilts when critical <30% HP, whips fiercely on waveAlert)
  const poleX = ageIndex === 0 ? 18 : 19;
  const poleBaseY = ageIndex === 0 ? -34 : -42;
  const poleTopY = poleBaseY - 21;
  const waveSpeed = waveAlert ? 14 : 4.2;
  const waveAmp = waveAlert ? 4.2 : 2.1;
  const wave = Math.sin(time * waveSpeed + (isAlly ? 0 : 1.5)) * waveAmp;

  ctx.save();
  if (damaged30) {
    ctx.translate(poleX, poleBaseY);
    ctx.rotate(0.24);
    ctx.translate(-poleX, -poleBaseY);
  }
  ctx.strokeStyle = INK_PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(poleX, poleBaseY);
  ctx.lineTo(poleX, poleTopY);
  ctx.stroke();

  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(poleX, poleTopY + 1);
  ctx.lineTo(poleX + 15 + (waveAlert ? 4 : 0), poleTopY + 4 + wave);
  ctx.lineTo(poleX + 11, poleTopY + 7 + wave * 0.5);
  ctx.lineTo(poleX + 15 + (waveAlert ? 3 : 0), poleTopY + 10 + wave);
  ctx.lineTo(poleX, poleTopY + 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // Castle HP bar perched cleanly above tower spires & crown finial
  const barW = 58;
  const barH = 10;
  const bx = x - barW / 2;
  const by = y - 92;
  ctx.save();
  ctx.fillStyle = '#2A201A';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = isAlly ? '#3B8271' : INK_PALETTE.enemyPrimary;
  ctx.fillRect(bx + 1.5, by + 1.5, (barW - 3) * Math.max(0, Math.min(1, hpRatio)), barH - 3);
  ctx.strokeStyle = INK_PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, barW, barH);

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFDF8';
  ctx.strokeText(`${Math.ceil(hpValue)}`, x, by - 4);
  ctx.fillStyle = INK_PALETTE.ink;
  ctx.fillText(`${Math.ceil(hpValue)}`, x, by - 4);
  ctx.restore();
}

/**
 * Minimalist Royal Bean-Folk Vanguard:
 * Matches the clean Style 03 storybook ink & wash bean-folk aesthetic while
 * keeping noble teal-and-gold colors, a single flowing cape, and clear role silhouettes.
 */
function drawRoyalVanguardUnit(
  ctx: CanvasRenderingContext2D,
  u: BattleUnit,
  x: number,
  y: number,
  time: number,
  finalChargeActive: boolean,
  victoryProgress = 0
): void {
  const isGiant = u.role === 'heavy';
  const isDead = u.state === 'die';
  const dieProgress = isDead ? 1 - u.dieTimer / (isGiant ? 0.52 : 0.34) : 0;
  const spawnAlpha = isGiant ? 1 : Math.min(1, Math.max(0.08, u.spawnAge / 0.25));
  const victoryHop =
    !isDead && victoryProgress > 0
      ? Math.abs(Math.sin(victoryProgress * Math.PI * 3.5 + u.id * 0.9)) * (isGiant ? 4.2 : 9.5)
      : 0;
  const walkBob =
    victoryHop > 0
      ? victoryHop
      : u.state === 'walk'
        ? Math.abs(Math.sin(u.walkPhase)) * (isGiant ? 1.4 : 2.4)
        : 0;
  const swing =
    !isDead && victoryProgress > 0
      ? -0.35
      : u.attackAnimTimer > 0
        ? Math.sin((u.attackAnimTimer / (isGiant ? 0.52 : 0.26)) * Math.PI)
        : 0;
  const giantAnimProgress =
    isGiant && u.attackAnimTimer > 0 ? 1 - u.attackAnimTimer / 0.52 : 0;
  const giantSmashingFront = isGiant && u.attackAnimTimer > 0 && giantAnimProgress < 0.62;
  const flash = u.hitFlashTimer > 0;
  const capeFlutter =
    Math.sin(time * (finalChargeActive || victoryProgress > 0 ? 8.5 : 4.2) + u.id * 1.3) *
    (finalChargeActive || victoryProgress > 0 ? 2.4 : 1.4);

  ctx.save();
  ctx.translate(x, y);
  if (isDead) {
    ctx.globalAlpha = Math.max(0, 1 - dieProgress) * spawnAlpha;
    ctx.rotate(-dieProgress * 1.35);
    ctx.translate(0, dieProgress * (isGiant ? 10 : 4));
  } else if (spawnAlpha < 1) {
    ctx.globalAlpha = spawnAlpha;
  }

  // Final Charge golden aura & rushing wind streaks (Proposal C1)
  if (!isDead && finalChargeActive) {
    const chargePulse = 0.65 + 0.35 * Math.sin(time * 9 + u.id);
    ctx.save();
    ctx.fillStyle = `rgba(233, 186, 88, ${0.22 * chargePulse})`;
    ctx.strokeStyle = `rgba(201, 138, 44, ${0.75 * chargePulse})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 2, 13 * u.scale, 4.4 * u.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (u.state === 'walk') {
      ctx.strokeStyle = `rgba(233, 186, 88, ${0.65 * chargePulse})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10 * u.scale, -8 * u.scale);
      ctx.lineTo(-19 * u.scale, -8 * u.scale);
      ctx.moveTo(-8 * u.scale, -14 * u.scale);
      ctx.lineTo(-15 * u.scale, -14 * u.scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Ground shadow (broad & weighty for colossal Giant)
  ctx.fillStyle = INK_PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(
    0,
    2,
    (isGiant ? 10.2 : 7.8) * u.scale,
    (isGiant ? 3.6 : 2.8) * u.scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.scale(u.scale, u.scale);
  ctx.translate(0, -walkBob);

  ctx.strokeStyle = INK_PALETTE.ink;
  ctx.lineWidth = isGiant ? 1.45 : 1.45;
  ctx.lineJoin = 'round';

  // Helper to draw Ally Giant colossal weapon (either slung behind back or smashing low in front!)
  const drawAllyGiantWeapon = () => {
    ctx.fillStyle = flash ? '#FFFFFF' : '#6B4C35';
    ctx.beginPath();
    ctx.roundRect(-1.1, -17.5, 2.4, 20.5, 1.0);
    ctx.fill();
    ctx.stroke();

    if (u.ageIndex === 0) {
      // Carved stone monolith pillar
      ctx.fillStyle = flash ? '#FFFFFF' : '#B9B0A0';
      ctx.beginPath();
      ctx.roundRect(-4.4, -21.5, 9.2, 8.0, 2.0);
      ctx.fill();
      ctx.stroke();
    } else if (u.ageIndex === 4) {
      // Astral starlight greatsword blade
      ctx.fillStyle = flash ? '#FFFFFF' : INK_PALETTE.goldBright;
      ctx.beginPath();
      ctx.moveTo(-2.4, -6);
      ctx.lineTo(-3.2, -22);
      ctx.lineTo(0.2, -26);
      ctx.lineTo(3.6, -22);
      ctx.lineTo(2.6, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Gilded bronze warhammer / clockwork maul / steam titan hammer
      ctx.fillStyle = flash ? '#FFFFFF' : u.ageIndex === 1 ? INK_PALETTE.gold : '#9FB1BD';
      ctx.beginPath();
      ctx.roundRect(-4.8, -21.5, 10.0, 7.4, 1.8);
      ctx.fill();
      ctx.stroke();
      if (!flash) {
        ctx.fillStyle = INK_PALETTE.goldBright;
        ctx.fillRect(-1.5, -21.5, 3.2, 7.4);
      }
    }
  };

  // 0. Ally Giant Weapon BEHIND shoulder during walk/idle/recovery -> keeps Head & Face 100% unobstructed!
  if (isGiant && !giantSmashingFront) {
    ctx.save();
    const hoistBack = u.attackAnimTimer > 0 ? (1 - giantAnimProgress) * 0.45 : 0;
    const walkSway = u.state === 'walk' ? Math.sin(u.walkPhase) * 0.08 : 0;
    ctx.translate(-3.6, -13.5);
    ctx.rotate(-0.76 + walkSway + hoistBack);
    drawAllyGiantWeapon();
    ctx.restore();
  }

  // 1. Striding feet (thick pillar legs for Giant)
  const stride = u.state === 'walk' ? Math.sin(u.walkPhase * 2) * (isGiant ? 2.2 : 2.8) : 0;
  ctx.lineWidth = isGiant ? 2.3 : 1.45;
  ctx.beginPath();
  ctx.moveTo(isGiant ? -3.1 : -2, -2);
  ctx.lineTo((isGiant ? -3.5 : -2.5) + stride, 1.6);
  ctx.moveTo(isGiant ? 3.1 : 2, -2);
  ctx.lineTo((isGiant ? 3.5 : 2.5) - stride, 1.6);
  ctx.stroke();
  ctx.lineWidth = 1.45;

  // 2. Single clean royal cape silhouette
  ctx.fillStyle = flash ? '#FFFFFF' : INK_PALETTE.allyCapeDark;
  ctx.beginPath();
  ctx.moveTo(isGiant ? -3.4 : -2, -15.5);
  ctx.quadraticCurveTo(
    (isGiant ? -11.0 : -8.5) - capeFlutter * 0.4,
    -9.5,
    (isGiant ? -10.8 : -8.5) - capeFlutter,
    -2.5
  );
  ctx.lineTo(-2.5, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Clean teal bean tunic (broad-shouldered hulk silhouette for Giant)
  ctx.fillStyle = flash ? '#FFFFFF' : INK_PALETTE.allyPrimary;
  ctx.beginPath();
  if (isGiant) {
    ctx.moveTo(-7.2, -2);
    ctx.quadraticCurveTo(-8.8, -13.5, -5.4, -18.6);
    ctx.quadraticCurveTo(0, -20.6, 5.6, -18.6);
    ctx.quadraticCurveTo(8.8, -13.5, 7.2, -2);
  } else {
    ctx.moveTo(-5.4, -2);
    ctx.quadraticCurveTo(-6.2, -13.5, 0, -17.8);
    ctx.quadraticCurveTo(6.2, -13.5, 5.4, -2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Giant golden shoulder guard & heavy war-belt
  if (isGiant && !flash) {
    ctx.fillStyle = INK_PALETTE.goldBright;
    ctx.beginPath();
    ctx.ellipse(-5.4, -17.0, 3.3, 2.2, -0.25, 0, Math.PI * 2);
    ctx.ellipse(5.4, -17.0, 3.3, 2.2, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = INK_PALETTE.gold;
    ctx.fillRect(-6.8, -7.8, 13.6, 2.2);
    ctx.strokeRect(-6.8, -7.8, 13.6, 2.2);
  } else if (!flash) {
    ctx.fillStyle = INK_PALETTE.goldBright;
    ctx.beginPath();
    ctx.arc(1.2, -13.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Non-giant weapons OR Giant LOW-FRONT ground smash (always well below & in front of the head!)
  if (!isGiant) {
    ctx.save();
    ctx.translate(4.4, -11);
    if (u.role === 'melee') {
      ctx.rotate(-0.15 + swing * 1.25);
      ctx.fillStyle = flash ? '#FFFFFF' : '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(-0.5, -12, 2.6, 13, 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (swing > 0.2) {
        ctx.save();
        ctx.globalAlpha = swing * 0.85;
        ctx.strokeStyle = INK_PALETTE.goldBright;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(5.5, -11.5, 11.5, -1.0, 0.8);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.rotate(swing * 0.16);
      ctx.strokeStyle = flash ? '#FFFFFF' : INK_PALETTE.gold;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0.8, -1.5, 6.2, -1.15, 1.15);
      ctx.stroke();
      ctx.restore();
    }
  } else if (giantSmashingFront) {
    // Ground-slam follow-through: weapon drives forward & down toward the road in front (never covering face!)
    const slamT = Math.min(1, giantAnimProgress / 0.34);
    const slamAngle = 0.72 + Math.sin(slamT * Math.PI * 0.5) * 0.92;
    ctx.save();
    ctx.translate(6.8, -9.5);
    ctx.rotate(slamAngle);
    drawAllyGiantWeapon();
    ctx.restore();

    if (giantAnimProgress < 0.42) {
      ctx.save();
      ctx.globalAlpha = (1 - giantAnimProgress / 0.42) * 0.92;
      ctx.strokeStyle = INK_PALETTE.goldBright;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(11.5, -6.5, 14.5, -0.75, 0.85);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 5. TOP LAYER: H1 Classic Blue-Gold Knight & Ranger Helmets (NO Crowns on frontline soldiers!)
  const headY = isGiant ? -22.8 : -20.2;
  const headR = isGiant ? 4.2 : 3.9;
  const plumeSway = capeFlutter * 0.48 + swing * 1.1;
  const steelLight = flash
    ? '#FFFFFF'
    : u.ageIndex === 4
      ? '#F4EFE1'
      : u.ageIndex === 3
        ? '#DEC696'
        : INK_PALETTE.allySteel;
  const steelDark = flash
    ? '#FFFFFF'
    : u.ageIndex === 4
      ? '#D7C497'
      : u.ageIndex === 3
        ? '#B89558'
        : INK_PALETTE.allySteelShade;
  const trimGold = flash ? '#FFFFFF' : u.ageIndex >= 4 ? '#FFF2B2' : INK_PALETTE.goldBright;

  if (u.role === 'ranged') {
    // H1 Ranged: Sleek Steel Ranger Cap / Archer Sallet + Focused Eye + Single Swept Golden Feather
    // Face beneath helmet brow
    ctx.fillStyle = flash ? '#FFFFFF' : INK_PALETTE.skin;
    ctx.beginPath();
    ctx.arc(0.5, headY, headR * 0.94, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      ctx.fillStyle = INK_PALETTE.ink;
      ctx.beginPath();
      ctx.arc(2.3, headY + 0.15, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swept single golden-teal archer feather trailing from temple
    ctx.fillStyle = flash ? '#FFFFFF' : trimGold;
    ctx.beginPath();
    ctx.moveTo(-1.2, headY - headR * 0.82);
    ctx.quadraticCurveTo(
      -5.6 - plumeSway * 0.3,
      headY - headR - 2.6,
      -7.8 - plumeSway * 0.55,
      headY - headR - 0.2
    );
    ctx.quadraticCurveTo(-4.4, headY - headR + 0.4, -0.8, headY - headR * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Streamlined ranger steel helmet dome + curved visor brim
    ctx.fillStyle = flash ? '#FFFFFF' : u.ageIndex >= 2 ? steelLight : '#5F8F99';
    ctx.beginPath();
    ctx.arc(0.4, headY - 0.6, headR + 0.35, Math.PI * 0.94, -0.14);
    ctx.lineTo(headR + 1.7, headY - 0.9);
    ctx.quadraticCurveTo(1.2, headY - 1.5, -headR - 0.5, headY - 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold clasp band / Age III+ brass optics goggles
    if (!flash) {
      ctx.strokeStyle = trimGold;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(-headR + 0.5, headY - 1.3);
      ctx.lineTo(headR + 0.6, headY - 1.5);
      ctx.stroke();
      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.lineWidth = 1.45;

      if (u.ageIndex >= 3) {
        // Brass targeting lens / skyguard goggle over eye
        ctx.fillStyle = u.ageIndex === 4 ? '#FFF2A6' : '#F5C16C';
        ctx.beginPath();
        ctx.arc(2.35, headY + 0.05, 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else {
    // H1 Melee: Full Steel-Blue & Gold-Trimmed Knight Visor Helmet + Fluttering Teal Plume
    // 1. Rear fluttering knight plume crest
    ctx.fillStyle = flash
      ? '#FFFFFF'
      : u.ageIndex === 4
        ? INK_PALETTE.goldBright
        : u.ageIndex === 3
          ? '#B84A39'
          : INK_PALETTE.allyPrimary;
    ctx.beginPath();
    ctx.moveTo(-1.0, headY - headR * 0.95);
    ctx.quadraticCurveTo(
      -5.4 - plumeSway * 0.45,
      headY - headR - 3.6,
      -8.2 - plumeSway * 0.75,
      headY - headR + 0.9
    );
    ctx.quadraticCurveTo(
      -4.6 - plumeSway * 0.2,
      headY - headR + 1.3,
      -1.8,
      headY - headR * 0.3
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Sculpted knight helmet shell (fully armored warrior, never a bare-headed lord!)
    ctx.fillStyle = steelLight;
    ctx.beginPath();
    ctx.moveTo(-headR + 0.3, headY + headR * 0.75);
    ctx.lineTo(-headR + 0.1, headY - 1.2);
    ctx.arc(0.4, headY - 0.9, headR + 0.35, Math.PI, 0);
    ctx.lineTo(headR + 0.9, headY + headR * 0.62);
    ctx.quadraticCurveTo(0.8, headY + headR * 1.05, -headR + 0.3, headY + headR * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower helmet cheek/chin bevel shade
    if (!flash) {
      ctx.fillStyle = steelDark;
      ctx.beginPath();
      ctx.roundRect(-headR + 0.8, headY + 0.4, headR * 1.9, headR * 0.68, 1.2);
      ctx.fill();

      // Golden crest ridge & brow trim
      ctx.strokeStyle = trimGold;
      ctx.lineWidth = u.ageIndex >= 2 ? 1.55 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-1.2, headY - headR - 0.9);
      ctx.quadraticCurveTo(1.2, headY - headR - 0.4, headR + 0.2, headY - 1.2);
      ctx.stroke();

      // T-shaped Knight Visor Slit (glowing warm gold/teal on Age IV-V)
      ctx.fillStyle = u.ageIndex >= 4 ? '#FFF2A6' : u.ageIndex === 3 ? '#F5A623' : '#241B17';
      ctx.fillRect(0.2, headY - 1.0, headR + 0.35, 1.45);
      // Vertical nasal-bar / breathing slit
      ctx.fillStyle = '#241B17';
      ctx.fillRect(2.1, headY + 0.3, 1.15, 2.35);

      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.lineWidth = 1.45;
    }
  }

  ctx.restore();

  // Injured HP bar (wide & clear above Giant's crown)
  if (!isDead && u.hp < u.maxHp) {
    const bw = (isGiant ? 16 : 16) * u.scale;
    const bh = isGiant ? 4.5 : 3.0;
    const bx = x - bw / 2;
    const by = y - (isGiant ? 36.0 : 28) * u.scale;
    ctx.fillStyle = '#2A201A';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = isGiant ? '#E9BA58' : '#3B8271';
    ctx.fillRect(bx + 0.5, by + 0.5, (bw - 1) * Math.max(0, u.hp / u.maxHp), bh - 1);
  }
}

/**
 * Enemy Hearthclan Swarm Grunt — compact, round-headed tribal silhouette
 * contrasting clearly against the tall armored Royal Vanguards.
 */
function drawHearthclanGrunt(
  ctx: CanvasRenderingContext2D,
  u: BattleUnit,
  x: number,
  y: number
): void {
  const isGiant = u.role === 'heavy';
  const primary = u.hitFlashTimer > 0 ? '#FFFFFF' : isGiant ? '#7D2D29' : INK_PALETTE.enemyPrimary;
  const secondary = u.hitFlashTimer > 0 ? '#FFFFFF' : INK_PALETTE.enemySecondary;

  const isDead = u.state === 'die';
  const dieProgress = isDead ? 1 - u.dieTimer / (isGiant ? 0.52 : 0.34) : 0;
  const walkBob =
    u.state === 'walk' ? Math.abs(Math.sin(u.walkPhase)) * (isGiant ? 1.5 : 3.2) : 0;
  const swing =
    u.attackAnimTimer > 0 ? Math.sin((u.attackAnimTimer / (isGiant ? 0.52 : 0.24)) * Math.PI) : 0;
  const giantAnimProgress =
    isGiant && u.attackAnimTimer > 0 ? 1 - u.attackAnimTimer / 0.52 : 0;
  const giantSmashingFront = isGiant && u.attackAnimTimer > 0 && giantAnimProgress < 0.62;

  ctx.save();
  ctx.translate(x, y);
  if (isDead) {
    ctx.globalAlpha = Math.max(0, 1 - dieProgress);
    ctx.rotate(dieProgress * 1.4);
    ctx.translate(0, dieProgress * (isGiant ? 10 : 4));
  }

  // Ground shadow
  ctx.fillStyle = INK_PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(
    0,
    2,
    (isGiant ? 10.0 : 7.2) * u.scale,
    (isGiant ? 3.5 : 2.6) * u.scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.scale(-u.scale, u.scale);
  ctx.translate(0, -walkBob);
  // Subtle forward-leaning sprint posture while rushing straight for the ally castle
  if (!isDead && !isGiant && u.state === 'walk' && !u.engaged) {
    ctx.rotate(0.09);
  }

  ctx.strokeStyle = INK_PALETTE.ink;
  ctx.lineWidth = 1.45;
  ctx.lineJoin = 'round';

  const drawEnemyGiantWeapon = () => {
    ctx.fillStyle =
      u.hitFlashTimer > 0
        ? '#FFFFFF'
        : u.ageIndex === 0
          ? '#6E472B'
          : u.ageIndex === 4
            ? '#3B2836'
            : '#5B4E47';
    ctx.beginPath();
    ctx.moveTo(-1.3, 2);
    ctx.lineTo(-4.2, -20.5);
    ctx.quadraticCurveTo(0.4, -23.5, 4.4, -20.5);
    ctx.lineTo(1.5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (u.hitFlashTimer <= 0) {
      ctx.fillStyle = INK_PALETTE.enemySecondary;
      ctx.fillRect(-3.4, -16.5, 7.0, 2.5);
      ctx.strokeRect(-3.4, -16.5, 7.0, 2.5);
    }
  };

  // 0. Enemy Giant Weapon BEHIND shoulder during walk/idle/recovery -> Head & Horns 100% unobstructed!
  if (isGiant && !giantSmashingFront) {
    ctx.save();
    const hoistBack = u.attackAnimTimer > 0 ? (1 - giantAnimProgress) * 0.45 : 0;
    const walkSway = u.state === 'walk' ? Math.sin(u.walkPhase) * 0.08 : 0;
    ctx.translate(-3.6, -13.5);
    ctx.rotate(-0.76 + walkSway + hoistBack);
    drawEnemyGiantWeapon();
    ctx.restore();
  }

  // 1. Striding feet
  const stride = u.state === 'walk' ? Math.sin(u.walkPhase * 2) * (isGiant ? 2.2 : 3) : 0;
  ctx.lineWidth = isGiant ? 2.3 : 1.45;
  ctx.beginPath();
  ctx.moveTo(isGiant ? -3.1 : -2, -2);
  ctx.lineTo((isGiant ? -3.5 : -2.5) + stride, 1.5);
  ctx.moveTo(isGiant ? 3.1 : 2, -2);
  ctx.lineTo((isGiant ? 3.5 : 2.5) - stride, 1.5);
  ctx.stroke();
  ctx.lineWidth = 1.45;

  // 2. Tribal tunic (hulking broad-shouldered giant silhouette when heavy)
  ctx.fillStyle = primary;
  ctx.beginPath();
  if (isGiant) {
    ctx.moveTo(-7.2, -2);
    ctx.quadraticCurveTo(-8.8, -13, -5.4, -18.4);
    ctx.quadraticCurveTo(0, -20.5, 5.4, -18.4);
    ctx.quadraticCurveTo(8.8, -13, 7.2, -2);
  } else {
    ctx.moveTo(-5.2, -2);
    ctx.quadraticCurveTo(-6.2, -13, 0, -17.5);
    ctx.quadraticCurveTo(6.2, -13, 5.2, -2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isGiant && u.hitFlashTimer <= 0) {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.ellipse(-5.4, -16.8, 3.1, 2.1, -0.3, 0, Math.PI * 2);
    ctx.ellipse(5.4, -16.8, 3.1, 2.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 3. Non-giant weapons OR Giant LOW-FRONT ground smash (always well below & in front of face!)
  if (!isGiant) {
    ctx.save();
    ctx.translate(4.3, -10.5);
    if (u.role === 'melee') {
      ctx.rotate(swing * 0.9);
      ctx.fillStyle = u.ageIndex === 0 ? '#8C5B32' : '#CBD5E1';
      ctx.beginPath();
      ctx.roundRect(0, -9, 2.8, 10, 1.4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.rotate(swing * 0.9);
      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(1, -2, 5, -1.1, 1.1);
      ctx.stroke();
    }
    ctx.restore();
  } else if (giantSmashingFront) {
    const slamT = Math.min(1, giantAnimProgress / 0.34);
    const slamAngle = 0.72 + Math.sin(slamT * Math.PI * 0.5) * 0.92;
    ctx.save();
    ctx.translate(6.6, -9.5);
    ctx.rotate(slamAngle);
    drawEnemyGiantWeapon();
    ctx.restore();

    if (giantAnimProgress < 0.42) {
      ctx.save();
      ctx.globalAlpha = (1 - giantAnimProgress / 0.42) * 0.88;
      ctx.strokeStyle = '#D47B6A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(11.5, -6.5, 14.0, -0.75, 0.85);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. TOP LAYER: Head, Glowing Eyes & Horns/Headwear (ALWAYS 100% VISIBLE IN FRONT!)
  const headY = isGiant ? -22.5 : -19.8;
  const headR = isGiant ? 4.1 : 3.6;
  ctx.fillStyle = u.hitFlashTimer > 0 ? '#FFFFFF' : INK_PALETTE.skin;
  ctx.beginPath();
  ctx.arc(0.5, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (u.hitFlashTimer <= 0) {
    if (isGiant) {
      // Fierce glowing amber boss eye + heavy furrowed brow + rugged grimace
      ctx.fillStyle = '#2A1614';
      ctx.beginPath();
      ctx.arc(2.2, headY - 0.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F5B841';
      ctx.beginPath();
      ctx.arc(2.35, headY - 0.2, 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = INK_PALETTE.ink;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(0.4, headY - 1.9);
      ctx.lineTo(3.6, headY - 0.9);
      ctx.moveTo(1.1, headY + 1.9);
      ctx.lineTo(3.1, headY + 1.4);
      ctx.stroke();
      ctx.lineWidth = 1.45;
    } else {
      ctx.fillStyle = INK_PALETTE.ink;
      ctx.beginPath();
      ctx.arc(2.1, headY - 0.3, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Age-specific tribal headwear / Giant curved war-horns
  ctx.fillStyle = secondary;
  if (isGiant) {
    ctx.fillStyle = u.hitFlashTimer > 0 ? '#FFFFFF' : '#E8DFCF';
    ctx.beginPath();
    ctx.moveTo(-2.6, headY - 2.8);
    ctx.lineTo(-6.4, headY - 7.6);
    ctx.lineTo(-0.4, headY - 3.9);
    ctx.moveTo(3.4, headY - 2.8);
    ctx.lineTo(6.8, headY - 7.2);
    ctx.lineTo(1.2, headY - 3.9);
    ctx.fill();
    ctx.stroke();
  } else if (u.ageIndex === 0) {
    ctx.beginPath();
    ctx.ellipse(-1, -23.2, 4, 1.6, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (u.ageIndex === 1) {
    ctx.beginPath();
    ctx.arc(0.5, -21.2, 4, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (u.ageIndex === 2) {
    ctx.beginPath();
    ctx.ellipse(0, -23.2, 4.8, 2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (u.ageIndex === 3) {
    ctx.fillRect(-3, -26, 6, 4.2);
    ctx.strokeRect(-3, -26, 6, 4.2);
  } else {
    ctx.fillStyle = INK_PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(-3.8, -22);
    ctx.lineTo(0.5, -27);
    ctx.lineTo(4.8, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  // Injured HP bar (wide & clear above Enemy Giant's horns)
  if (!isDead && u.hp < u.maxHp) {
    const bw = (isGiant ? 16 : 15) * u.scale;
    const bh = isGiant ? 4.2 : 2.8;
    const bx = x - bw / 2;
    const by = y - (isGiant ? 36.5 : 26) * u.scale;
    ctx.fillStyle = '#2A201A';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = INK_PALETTE.enemyPrimary;
    ctx.fillRect(bx + 0.5, by + 0.5, (bw - 1) * Math.max(0, u.hp / u.maxHp), bh - 1);
  }
}

/**
 * Ally Mechanical Colossus — faithful to Victory CG III (Triumph of the Spire):
 * Cast-brass riveted armor, teal constellation pennant behind shoulder, glowing 3-vent golden
 * chest furnace, sculpted mech visor helmet (never a human face), and radiant Sun-Core Greatsword.
 */
function drawAllyMechColossus(
  ctx: CanvasRenderingContext2D,
  u: BattleUnit,
  x: number,
  y: number,
  time: number,
  finalChargeActive: boolean,
  victoryProgress = 0
): void {
  const s = u.scale;
  const isDead = u.state === 'die';
  const dieProgress = isDead ? 1 - u.dieTimer / 0.52 : 0;
  const flash = u.hitFlashTimer > 0;
  const animP = u.attackAnimTimer > 0 ? 1 - u.attackAnimTimer / 0.52 : 0;
  const slashingFront = u.attackAnimTimer > 0 && animP < 0.64;
  const swingSin = u.attackAnimTimer > 0 ? Math.sin((u.attackAnimTimer / 0.52) * Math.PI) : 0;
  const victoryHop =
    !isDead && victoryProgress > 0
      ? Math.abs(Math.sin(victoryProgress * Math.PI * 3 + u.id * 0.8)) * 3.6
      : 0;
  const walkCycle = u.state === 'walk' ? Math.sin(u.walkPhase) : 0;
  const walkBob = victoryHop > 0 ? victoryHop : u.state === 'walk' ? Math.abs(walkCycle) * 1.4 : 0;

  // Age-progressive burnished brass palette (from weathered bronze Age I to radiant astral gold Age V)
  const brassLight = flash ? '#FFFFFF' : u.ageIndex >= 3 ? '#EED08B' : '#D9B675';
  const brassMid = flash ? '#FFFFFF' : u.ageIndex >= 3 ? '#C89B4B' : '#B78C4A';
  const brassDark = flash ? '#EFEFEF' : '#7D5C31';
  const jointMetal = flash ? '#EFEFEF' : '#4A3D35';
  const ink = INK_PALETTE.ink;
  const coreGlow =
    u.attackAnimTimer > 0 || finalChargeActive
      ? '#FFF6C4'
      : `rgba(255, 224, 128, ${(0.82 + Math.sin(time * 4.5 + u.id) * 0.16).toFixed(2)})`;

  ctx.save();
  ctx.translate(x, y);
  if (isDead) {
    ctx.globalAlpha = Math.max(0, 1 - dieProgress);
    ctx.rotate(-dieProgress * 1.15);
    ctx.translate(0, dieProgress * 11);
  }

  // Heavy mech ground shadow
  ctx.fillStyle = INK_PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 2, 11.5 * s, 3.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(s, s);
  ctx.translate(0, -walkBob);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Subtle golden astral aura during Final Charge or Age V
  if (!isDead && (finalChargeActive || u.ageIndex >= 4)) {
    ctx.save();
    ctx.strokeStyle = finalChargeActive ? 'rgba(233,186,88,0.62)' : 'rgba(233,186,88,0.34)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, -14, 13.5, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1. Constellation Pennant Flag behind left pauldron (iconic Victory CG III silhouette)
  ctx.save();
  ctx.translate(-5.5, -21.5);
  const flagWave = Math.sin(time * 4.2 + u.id) * 1.2;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(-9.5, -13.5);
  ctx.stroke();
  // Brass spear finial
  ctx.fillStyle = brassLight;
  ctx.beginPath();
  ctx.arc(-9.5, -13.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Deep teal pennant with star constellation
  ctx.fillStyle = flash ? '#FFFFFF' : '#2E6F7E';
  ctx.beginPath();
  ctx.moveTo(-8.8, -12.8);
  ctx.quadraticCurveTo(-14.2, -13.2 + flagWave * 0.4, -19.2, -10.8 + flagWave);
  ctx.quadraticCurveTo(-15.0, -7.8 + flagWave * 0.5, -6.2, -7.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Star constellation lines & glowing dots inside banner
  if (!flash) {
    ctx.strokeStyle = 'rgba(255, 245, 210, 0.72)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-10.2, -10.4);
    ctx.lineTo(-12.6, -11.2 + flagWave * 0.25);
    ctx.lineTo(-14.6, -9.6 + flagWave * 0.5);
    ctx.lineTo(-17.0, -10.5 + flagWave * 0.8);
    ctx.stroke();
    ctx.fillStyle = '#FFF7D6';
    for (const [sx, sy] of [
      [-10.2, -10.4],
      [-12.6, -11.2 + flagWave * 0.25],
      [-14.6, -9.6 + flagWave * 0.5],
      [-17.0, -10.5 + flagWave * 0.8],
    ]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Helper: Complete Articulated Right Mechanical Sword-Arm + Radiant Sun-Core Greatsword
  const drawRadiantGreatsword = (inFrontSlash: boolean) => {
    ctx.save();
    // Anchor directly inside the right pauldron shoulder socket
    ctx.translate(7.5, -18.8);
    const shoulderAngle = inFrontSlash
      ? -2.05 + animP * 2.55
      : -0.22 - swingSin * 0.45 - walkCycle * 0.16;
    ctx.rotate(shoulderAngle);

    // 1. Armored upper arm connecting shoulder to elbow
    ctx.fillStyle = jointMetal;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-1.7, -0.4, 3.4, 5.2, 1.0);
    ctx.fill();
    ctx.stroke();

    // Brass bicep guard plate
    ctx.fillStyle = brassDark;
    ctx.beginPath();
    ctx.roundRect(-1.95, 0.8, 3.9, 2.8, 0.9);
    ctx.fill();
    ctx.stroke();

    // 2. Spherical metallic elbow joint
    ctx.fillStyle = brassMid;
    ctx.beginPath();
    ctx.arc(0, 4.9, 1.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Articulated forearm flexing forward toward the enemy
    ctx.translate(0, 4.9);
    ctx.rotate(inFrontSlash ? -0.34 : -0.64);

    ctx.fillStyle = brassLight;
    ctx.beginPath();
    ctx.roundRect(-2.15, -0.3, 4.3, 5.0, 1.2);
    ctx.fill();
    ctx.stroke();

    // Riveted bracer cuff band
    ctx.strokeStyle = brassDark;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-2.0, 2.2);
    ctx.lineTo(2.0, 2.2);
    ctx.stroke();

    // 4. Armored Gauntlet + Radiant Sun-Core Greatsword angled cleanly upward-right
    ctx.translate(0, 4.8);
    ctx.rotate(inFrontSlash ? 2.55 : 1.12);

    // Heavy armored gauntlet gripping hilt
    ctx.fillStyle = brassMid;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-2.3, -2.0, 4.6, 3.8, 1.2);
    ctx.fill();
    ctx.stroke();

    // Pommel & brass grip
    ctx.fillStyle = brassDark;
    ctx.fillRect(-1.05, 1.6, 2.1, 3.2);
    ctx.strokeRect(-1.05, 1.6, 2.1, 3.2);
    ctx.fillStyle = brassLight;
    ctx.beginPath();
    ctx.arc(0, 5.4, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sculpted brass crossguard with glowing Sun-Core ring
    ctx.fillStyle = brassLight;
    ctx.beginPath();
    ctx.moveTo(-4.6, -1.8);
    ctx.lineTo(4.6, -1.8);
    ctx.lineTo(3.7, -3.7);
    ctx.lineTo(-3.7, -3.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wide luminous Sun-Core broadblade
    ctx.fillStyle = flash ? '#FFFFFF' : '#F4E7BE';
    ctx.beginPath();
    ctx.moveTo(-2.6, -3.7);
    ctx.lineTo(-3.0, -18.0);
    ctx.lineTo(0, -23.0);
    ctx.lineTo(3.0, -18.0);
    ctx.lineTo(2.6, -3.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing golden energy fuller channel + sun circle at hilt
    ctx.fillStyle = '#FFF9D9';
    ctx.strokeStyle = '#E9BA58';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(-0.9, -5.6);
    ctx.lineTo(0, -19.8);
    ctx.lineTo(0.9, -5.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFF7C2';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(0, -4.4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radiant golden sword-arc cleave trail during strike!
    if (inFrontSlash && animP > 0.12 && animP < 0.58) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 240, 175, ${(0.88 - animP).toFixed(2)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -13, 10.5, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  // Draw right sword-arm anchored under the right pauldron during march/idle
  if (!slashingFront) {
    drawRadiantGreatsword(false);
  }

  // 2. Articulated Mechanical Legs (armored thigh plates + bolted knee spheres + heavy greaves)
  const strideA = walkCycle * 2.4;
  const strideB = -walkCycle * 2.4;
  const drawMechLeg = (hipX: number, footShift: number, isBack: boolean) => {
    const kneeX = hipX + footShift * 0.45 + 0.5;
    const footX = hipX + footShift;
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    // Thigh armor plate
    ctx.fillStyle = isBack ? brassDark : brassMid;
    ctx.beginPath();
    ctx.moveTo(hipX - 2.1, -11.5);
    ctx.lineTo(hipX + 2.2, -11.5);
    ctx.lineTo(kneeX + 2.0, -5.6);
    ctx.lineTo(kneeX - 1.9, -5.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Spherical metallic knee joint
    ctx.fillStyle = jointMetal;
    ctx.beginPath();
    ctx.arc(kneeX, -5.5, 1.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Armored shin greave
    ctx.fillStyle = isBack ? brassMid : brassLight;
    ctx.beginPath();
    ctx.moveTo(kneeX - 2.0, -5.2);
    ctx.lineTo(kneeX + 2.2, -5.2);
    ctx.lineTo(footX + 2.7, -0.6);
    ctx.lineTo(footX - 2.2, -0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Heavy flat iron-brass sabaton foot
    ctx.fillStyle = brassDark;
    ctx.beginPath();
    ctx.roundRect(footX - 2.5, -1.6, 6.2, 2.0, 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  drawMechLeg(-3.0, strideB, true);
  drawMechLeg(3.2, strideA, false);

  // 3. Armored Pelvis / Waist Chassis
  ctx.fillStyle = jointMetal;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.roundRect(-5.2, -13.2, 10.4, 3.0, 1.0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = brassLight;
  ctx.beginPath();
  ctx.moveTo(-2.6, -13.0);
  ctx.lineTo(2.6, -13.0);
  ctx.lineTo(1.7, -9.6);
  ctx.lineTo(-1.7, -9.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Sculpted Brass Torso + Glowing 3-Slit Chest Reactor Core
  ctx.fillStyle = brassMid;
  ctx.beginPath();
  ctx.moveTo(-7.2, -22.2);
  ctx.lineTo(7.4, -22.2);
  ctx.lineTo(5.6, -12.6);
  ctx.lineTo(-5.4, -12.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner chest bevel plate
  ctx.fillStyle = brassLight;
  ctx.beginPath();
  ctx.roundRect(-4.6, -21.0, 9.4, 7.2, 2.0);
  ctx.fill();
  ctx.stroke();

  // 3 Vertical Glowing Warm-Gold Chest Vents (Victory CG III signature)
  ctx.fillStyle = coreGlow;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.45;
  for (const vx of [-2.2, 0.1, 2.4]) {
    ctx.beginPath();
    ctx.roundRect(vx - 0.75, -19.6, 1.5, 4.3, 0.6);
    ctx.fill();
    ctx.stroke();
  }

  // 5. Layered Riveted Domed Pauldrons (Broad Heroic Mech Shoulders)
  const drawPauldron = (px: number, py: number, flip: number) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(flip, 1);
    ctx.fillStyle = brassMid;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(3.8, 2.2);
    ctx.quadraticCurveTo(0, 3.0, -4.1, 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Upper brass rim trim + rivets
    ctx.fillStyle = brassLight;
    ctx.beginPath();
    ctx.arc(0, -0.5, 3.2, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(-2.1, 0.6, 0.42, 0, Math.PI * 2);
    ctx.arc(0, 1.0, 0.42, 0, Math.PI * 2);
    ctx.arc(2.1, 0.6, 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawPauldron(-7.4, -20.5, 1);
  drawPauldron(7.5, -20.4, -1);

  // 6. Heavy Hydraulic Off-Hand Mechanical Gauntlet (left arm swinging in cadence)
  ctx.save();
  ctx.translate(-7.8, -17.8);
  ctx.rotate(-0.18 + walkCycle * 0.22);
  ctx.fillStyle = jointMetal;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-1.7, 0, 3.4, 4.2, 1.0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = brassLight;
  ctx.beginPath();
  ctx.roundRect(-2.4, 3.6, 4.8, 5.4, 1.3);
  ctx.fill();
  ctx.stroke();
  // Riveted bracer cuff band
  ctx.strokeStyle = brassDark;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-2.2, 5.4);
  ctx.lineTo(2.2, 5.4);
  ctx.stroke();
  // Clenched mechanical fist
  ctx.fillStyle = brassMid;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-2.1, 8.6, 4.2, 3.1, 1.1);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 7. Riveted Gorget Collar + Sculpted Cast-Brass Mech Helmet (100% Unobstructed Top Layer)
  ctx.fillStyle = brassDark;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-4.0, -23.6, 8.2, 2.3, 1.0);
  ctx.fill();
  ctx.stroke();

  // Sculpted smooth brass automaton head (Victory CG III — mechanical visor helm, no cartoon face)
  ctx.fillStyle = brassLight;
  ctx.beginPath();
  ctx.moveTo(-2.8, -23.4);
  ctx.lineTo(-3.2, -26.8);
  ctx.quadraticCurveTo(0.4, -30.2, 3.6, -26.8);
  ctx.lineTo(3.2, -23.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Central helmet ridge seam
  ctx.strokeStyle = brassDark;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0.4, -29.1);
  ctx.lineTo(0.4, -26.2);
  ctx.stroke();

  // Recessed armored eye visor + glowing cool cyan-gold optic eyes
  ctx.fillStyle = '#25201D';
  ctx.beginPath();
  ctx.roundRect(-0.8, -26.8, 4.1, 1.65, 0.5);
  ctx.fill();
  ctx.fillStyle = u.attackAnimTimer > 0 ? '#FFF7B8' : '#8CECF2';
  ctx.fillRect(-0.2, -26.35, 1.25, 0.8);
  ctx.fillRect(1.75, -26.35, 1.25, 0.8);

  // Chin jaw vent plate
  ctx.fillStyle = brassMid;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.roundRect(-1.2, -24.7, 3.6, 1.2, 0.4);
  ctx.fill();
  ctx.stroke();

  // Draw sword in front during the active downward-forward cleave follow-through!
  if (slashingFront) {
    drawRadiantGreatsword(true);
  }

  ctx.restore();

  // Injured HP bar floating cleanly above the Constellation Pennant & Mech Helm
  if (!isDead && u.hp < u.maxHp) {
    const bw = 16.5 * u.scale;
    const bh = 4.5;
    const bx = x - bw / 2;
    const by = y - 42.5 * u.scale;
    ctx.fillStyle = '#2A201A';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#E9BA58';
    ctx.fillRect(bx + 0.5, by + 0.5, (bw - 1) * Math.max(0, u.hp / u.maxHp), bh - 1);
  }
}

/**
 * Enemy Iron-Spiked Siege Walker — faithful to Defeat CG III (Bell of the Last Stand):
 * Asymmetric dark forged-iron chassis, twin uneven smoking smokestacks, jagged iron shoulder spikes,
 * exposed hydraulic piston legs, molten boiler chest grate, and massive spiked crushing siege-arm.
 */
function drawEnemySiegeWalker(
  ctx: CanvasRenderingContext2D,
  u: BattleUnit,
  x: number,
  y: number,
  time: number
): void {
  const s = u.scale;
  const isDead = u.state === 'die';
  const dieProgress = isDead ? 1 - u.dieTimer / 0.52 : 0;
  const flash = u.hitFlashTimer > 0;
  const animP = u.attackAnimTimer > 0 ? 1 - u.attackAnimTimer / 0.52 : 0;
  const smashingFront = u.attackAnimTimer > 0 && animP < 0.64;
  const swingSin = u.attackAnimTimer > 0 ? Math.sin((u.attackAnimTimer / 0.52) * Math.PI) : 0;
  const walkCycle = u.state === 'walk' ? Math.sin(u.walkPhase) : 0;
  const walkBob = u.state === 'walk' ? Math.abs(walkCycle) * 1.6 : 0;

  const ironLight = flash ? '#FFFFFF' : '#5D4B47';
  const ironMid = flash ? '#FFFFFF' : '#41322F';
  const ironDark = flash ? '#EFEFEF' : '#291E1C';
  const rustCrimson = flash ? '#FFFFFF' : '#8F3832';
  const pistonSteel = flash ? '#EFEFEF' : '#8A837C';
  const ink = '#1D1412';
  const furnaceGlow =
    u.attackAnimTimer > 0
      ? '#FFCB57'
      : `rgba(242, 114, 48, ${(0.78 + Math.sin(time * 5.2 + u.id) * 0.2).toFixed(2)})`;

  ctx.save();
  ctx.translate(x, y);
  if (isDead) {
    ctx.globalAlpha = Math.max(0, 1 - dieProgress);
    ctx.rotate(dieProgress * 1.18);
    ctx.translate(0, dieProgress * 11);
  }

  // Heavy mech ground shadow
  ctx.fillStyle = INK_PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 2, 11.5 * s, 3.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(s, s);
  ctx.translate(0, -walkBob);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Twin Uneven Cast-Iron Smokestacks rising behind back + animated coal smoke puffs (CG III signature)
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.85;
  // Tall inner pipe
  ctx.fillStyle = ironDark;
  ctx.beginPath();
  ctx.moveTo(2.4, -22);
  ctx.lineTo(3.6, -34.0);
  ctx.lineTo(6.1, -33.7);
  ctx.lineTo(5.2, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shorter tilted outer exhaust stack
  ctx.fillStyle = ironMid;
  ctx.beginPath();
  ctx.moveTo(6.6, -21.5);
  ctx.lineTo(9.8, -30.5);
  ctx.lineTo(12.0, -29.7);
  ctx.lineTo(9.0, -21.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Animated coal smoke puffs rising from both pipes
  if (!isDead) {
    for (let i = 0; i < 2; i++) {
      const p = (time * 0.85 + u.id * 0.37 + i * 0.5) % 1;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.55;
      ctx.fillStyle = '#3B302E';
      ctx.beginPath();
      ctx.arc(4.8 + p * 3.5, -34.5 - p * 6.5, 1.3 + p * 2.1, 0, Math.PI * 2);
      ctx.arc(11.0 + p * 3.0, -30.8 - p * 5.2, 1.1 + p * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // Helper: Complete Articulated Left Hydraulic Siege-Maul Arm (connected directly to left spiked shoulder!)
  const drawSiegeCrusherArm = (inFrontSmash: boolean) => {
    ctx.save();
    // Anchor directly inside the left spiked pauldron socket
    ctx.translate(-7.8, -18.6);
    const shoulderAngle = inFrontSmash
      ? 2.05 - animP * 2.55
      : 0.24 + swingSin * 0.45 + walkCycle * 0.16;
    ctx.rotate(shoulderAngle);

    // 1. Heavy forged-iron upper arm + outer hydraulic piston rod
    ctx.fillStyle = ironDark;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-1.9, -0.4, 3.8, 5.4, 1.0);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = pistonSteel;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-2.1, 0.2);
    ctx.lineTo(-2.1, 4.9);
    ctx.stroke();

    // 2. Bolted crimson cylindrical elbow drum
    ctx.fillStyle = rustCrimson;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(0, 5.1, 1.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Articulated hydraulic crusher forearm flexing forward-left
    ctx.translate(0, 5.1);
    ctx.rotate(inFrontSmash ? 0.34 : 0.62);

    ctx.fillStyle = ironMid;
    ctx.beginPath();
    ctx.roundRect(-2.2, -0.3, 4.4, 5.2, 1.1);
    ctx.fill();
    ctx.stroke();

    // Gleaming hydraulic piston tube along forearm
    ctx.strokeStyle = pistonSteel;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-1.4, 0.4);
    ctx.lineTo(-1.4, 4.8);
    ctx.stroke();

    // 4. Colossal Riveted Spiked Siege-Crusher Fist / Wrecking Maul bolted onto wrist
    ctx.fillStyle = rustCrimson;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-4.6, 4.2, 9.2, 7.6, 1.6);
    ctx.fill();
    ctx.stroke();

    // Bolted iron crossband across siege-block
    ctx.fillStyle = ironLight;
    ctx.fillRect(-4.6, 7.1, 9.2, 1.9);
    ctx.strokeRect(-4.6, 7.1, 9.2, 1.9);

    // Jagged steel demolition spikes around striking face
    ctx.fillStyle = pistonSteel;
    for (const sx of [-3.1, 0, 3.1]) {
      ctx.beginPath();
      ctx.moveTo(sx - 1.0, 11.8);
      ctx.lineTo(sx, 14.3);
      ctx.lineTo(sx + 1.0, 11.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Outer flank demolition spike
    ctx.beginPath();
    ctx.moveTo(-4.6, 6.4);
    ctx.lineTo(-6.9, 8.0);
    ctx.lineTo(-4.6, 9.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Molten orange-red steam-impact arc when slamming!
    if (inFrontSmash && animP > 0.14 && animP < 0.58) {
      ctx.save();
      ctx.strokeStyle = `rgba(242, 114, 48, ${(0.88 - animP).toFixed(2)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 9.5, 9.2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  if (!smashingFront) {
    drawSiegeCrusherArm(false);
  }

  // 2. Exposed Hydraulic Piston Legs (Defeat CG III iconic industrial walker silhouette)
  const strideA = walkCycle * 2.5;
  const strideB = -walkCycle * 2.5;
  const drawWalkerLeg = (hipX: number, footShift: number, isBack: boolean) => {
    const kneeX = hipX + footShift * 0.45 - 0.6;
    const footX = hipX + footShift;
    ctx.save();
    // Outer hydraulic piston rod
    ctx.strokeStyle = pistonSteel;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(hipX + 1.4, -11.2);
    ctx.lineTo(kneeX + 1.6, -5.6);
    ctx.lineTo(footX + 1.6, -1.2);
    ctx.stroke();

    // Heavy dark iron leg armor
    ctx.fillStyle = isBack ? ironDark : ironMid;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(hipX - 2.2, -11.8);
    ctx.lineTo(hipX + 1.9, -11.8);
    ctx.lineTo(kneeX + 1.8, -5.6);
    ctx.lineTo(kneeX - 2.1, -5.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bolted cylindrical knee drum
    ctx.fillStyle = rustCrimson;
    ctx.beginPath();
    ctx.arc(kneeX, -5.6, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thick riveted shin frame
    ctx.fillStyle = isBack ? ironMid : ironLight;
    ctx.beginPath();
    ctx.moveTo(kneeX - 2.2, -5.2);
    ctx.lineTo(kneeX + 1.9, -5.2);
    ctx.lineTo(footX + 2.4, -0.8);
    ctx.lineTo(footX - 2.8, -0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wide clawed iron stomp foot
    ctx.fillStyle = ironDark;
    ctx.beginPath();
    ctx.roundRect(footX - 3.6, -1.8, 6.6, 2.1, 0.7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  drawWalkerLeg(3.4, strideB, true);
  drawWalkerLeg(-3.2, strideA, false);

  // 3. Exposed Mechanical Pelvis & Cross-Piping
  ctx.fillStyle = ironDark;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.roundRect(-5.4, -13.4, 10.8, 3.2, 0.9);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = pistonSteel;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-4.0, -11.8);
  ctx.lineTo(4.0, -11.8);
  ctx.stroke();

  // 4. Hulking Asymmetric Boiler Torso + Glowing Molten Firebox Grate
  ctx.fillStyle = ironMid;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-8.0, -22.6);
  ctx.lineTo(7.6, -21.8);
  ctx.lineTo(6.0, -12.6);
  ctx.lineTo(-6.2, -12.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rusted crimson boiler front armor
  ctx.fillStyle = rustCrimson;
  ctx.beginPath();
  ctx.roundRect(-5.2, -20.8, 9.6, 7.0, 1.4);
  ctx.fill();
  ctx.stroke();

  // Molten Boiler Firebox behind dark iron bars
  ctx.fillStyle = furnaceGlow;
  ctx.beginPath();
  ctx.roundRect(-3.8, -19.4, 6.8, 4.2, 0.8);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-3.8, -19.4, 6.8, 4.2);
  ctx.beginPath();
  ctx.moveTo(-1.6, -19.4);
  ctx.lineTo(-1.6, -15.2);
  ctx.moveTo(0.8, -19.4);
  ctx.lineTo(0.8, -15.2);
  ctx.stroke();

  // 5. Asymmetric Jagged Iron-Spiked Pauldrons (CG III trademark silhouette)
  const drawSpikedPauldron = (px: number, py: number, dir: number, tall: boolean) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = tall ? ironLight : ironMid;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-4.0, -3.4, 8.0, 6.4, 1.5);
    ctx.fill();
    ctx.stroke();
    // Iron spikes jutting out of shoulder plate
    ctx.fillStyle = pistonSteel;
    ctx.beginPath();
    ctx.moveTo(dir * 2.2, -3.2);
    ctx.lineTo(dir * 5.6, -5.8);
    ctx.lineTo(dir * 3.8, -1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-0.8, -3.4);
    ctx.lineTo(dir * 0.6, tall ? -7.2 : -6.0);
    ctx.lineTo(1.6, -3.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  drawSpikedPauldron(-7.8, -20.4, -1, true);
  drawSpikedPauldron(7.6, -19.8, 1, false);

  // 6. Heavy Mechanical 3-Prong Siege Claw (front-right off-arm swinging menacingly)
  ctx.save();
  ctx.translate(8.0, -17.4);
  ctx.rotate(0.16 - walkCycle * 0.24);
  ctx.fillStyle = ironDark;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-1.8, 0, 3.6, 4.6, 1.0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ironLight;
  ctx.beginPath();
  ctx.roundRect(-2.5, 4.0, 5.0, 5.2, 1.2);
  ctx.fill();
  ctx.stroke();
  // Heavy pincer claw prongs
  ctx.fillStyle = pistonSteel;
  ctx.beginPath();
  ctx.moveTo(-2.2, 9.0);
  ctx.lineTo(-3.1, 12.2);
  ctx.lineTo(-1.0, 10.8);
  ctx.lineTo(0, 12.6);
  ctx.lineTo(1.1, 10.8);
  ctx.lineTo(2.8, 12.1);
  ctx.lineTo(2.2, 9.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 7. Bolted Iron Collar + Gear-Crested Furnace Head (100% Unobstructed Top Layer)
  ctx.fillStyle = ironDark;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.roundRect(-4.6, -23.6, 8.8, 2.4, 0.8);
  ctx.fill();
  ctx.stroke();

  // Hunched riveted iron furnace-helm
  ctx.fillStyle = ironLight;
  ctx.beginPath();
  ctx.arc(-0.6, -25.8, 3.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cog-tooth / spike crown along dome (CG III middle walker silhouette)
  ctx.fillStyle = ironDark;
  for (const ang of [-2.4, -1.65, -0.9]) {
    const bx = -0.6 + Math.cos(ang) * 3.3;
    const by = -25.8 + Math.sin(ang) * 3.3;
    const tx = -0.6 + Math.cos(ang) * 5.4;
    const ty = -25.8 + Math.sin(ang) * 5.4;
    ctx.beginPath();
    ctx.moveTo(bx - 0.7, by);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + 0.7, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Glowing molten-amber furnace visor slit staring left toward the player
  ctx.fillStyle = '#1C110F';
  ctx.beginPath();
  ctx.roundRect(-3.8, -26.8, 4.4, 1.85, 0.6);
  ctx.fill();
  ctx.fillStyle = u.attackAnimTimer > 0 ? '#FFE680' : '#F59E2D';
  ctx.beginPath();
  ctx.roundRect(-3.4, -26.35, 3.5, 0.95, 0.4);
  ctx.fill();

  if (smashingFront) {
    drawSiegeCrusherArm(true);
  }

  ctx.restore();

  // Injured HP bar floating cleanly above twin smokestacks & gear crest
  if (!isDead && u.hp < u.maxHp) {
    const bw = 16.5 * u.scale;
    const bh = 4.2;
    const bx = x - bw / 2;
    const by = y - 42.5 * u.scale;
    ctx.fillStyle = '#2A201A';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = INK_PALETTE.enemyPrimary;
    ctx.fillRect(bx + 0.5, by + 0.5, (bw - 1) * Math.max(0, u.hp / u.maxHp), bh - 1);
  }
}

function drawInkProjectile(
  ctx: CanvasRenderingContext2D,
  p: BattleProjectile,
  scaleX: number,
  laneCenterY: number,
  laneHalfH: number
): void {
  const px = p.x * scaleX;
  const t = Math.min(1, p.progress);
  const yInterp = p.yOffset + (p.targetYOffset - p.yOffset) * t;
  const arc = Math.sin(t * Math.PI) * p.arcHeight;
  const py = laneCenterY + yInterp * laneHalfH - 13 - arc;

  ctx.save();
  ctx.translate(px, py);

  if (p.faction === 'ally') {
    // Piercing silver-gold royal arrow aligned to true 2D corridor trajectory (supports downward/diagonal/rear shots)
    const dxPx = (p.targetX - p.startX) * scaleX;
    const dyPx = (p.targetYOffset - p.yOffset) * laneHalfH - Math.cos(t * Math.PI) * Math.PI * p.arcHeight;
    const angle = Math.hypot(dxPx, dyPx) > 0.01 ? Math.atan2(dyPx, dxPx) : 0;
    ctx.rotate(angle);
    const hasPierced = p.hitUnitIds.length > 0;
    ctx.strokeStyle = hasPierced
      ? 'rgba(243, 211, 122, 0.78)'
      : 'rgba(233, 186, 88, 0.58)';
    ctx.lineWidth = hasPierced ? 2.4 : 2;
    ctx.beginPath();
    ctx.moveTo(hasPierced ? -17 : -13, 0);
    ctx.lineTo(-2, 0);
    ctx.stroke();

    ctx.strokeStyle = INK_PALETTE.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Silver-gold arrowhead
    ctx.fillStyle = INK_PALETTE.goldBright;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(3.5, -2.5);
    ctx.lineTo(3.5, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = INK_PALETTE.enemyPrimary;
    ctx.strokeStyle = INK_PALETTE.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, p.ageIndex >= 2 ? 3.2 : 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

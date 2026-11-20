import { ART_STYLE_MAP, type ArtStyleId } from '../stylesConfig';
import type { PreviewSimState, SimProjectile, SimUnit } from '../previewSim';
import type { ViewportMetrics } from './drawBackdrop';

export function drawStyleEntities(
  ctx: CanvasRenderingContext2D,
  sim: PreviewSimState,
  m: ViewportMetrics
): void {
  const spec = ART_STYLE_MAP[sim.styleId];
  const laneCenterY = (m.laneTopY + m.laneBottomY) * 0.5;
  const laneHalfH = (m.laneBottomY - m.laneTopY) * 0.48;

  // Depth sort units by laneOffset (2.5D top-down layering)
  const sortedUnits = [...sim.units].sort((a, b) => a.laneOffset - b.laneOffset);

  for (const unit of sortedUnits) {
    const ux = unit.x * m.scaleX;
    const uy = laneCenterY + unit.laneOffset * laneHalfH;
    drawUnit(ctx, sim.styleId, unit, ux, uy, spec);
  }

  // Projectiles
  for (const p of sim.projectiles) {
    drawProjectile(ctx, sim.styleId, p, m, laneCenterY, laneHalfH, spec);
  }

  // Particles
  for (const pt of sim.particles) {
    const px = pt.x * m.scaleX;
    const py = laneCenterY + pt.yOffset * laneHalfH - 12;
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    if (sim.styleId === 'pixel-crusade') {
      ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(pt.size), Math.ceil(pt.size));
    } else if (sim.styleId === 'papercraft') {
      ctx.translate(px, py);
      ctx.rotate(pt.life * 8);
      ctx.fillRect(-pt.size, -pt.size * 0.6, pt.size * 2, pt.size * 1.2);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Floating damage numbers
  for (const ft of sim.floatingTexts) {
    const fx = ft.x * m.scaleX;
    const rise = (1 - ft.life / ft.maxLife) * 20;
    const fy = laneCenterY + ft.yOffset * laneHalfH - 26 - rise;
    const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = ft.isCrit
      ? '800 13px "JetBrains Mono", monospace'
      : '700 10.5px "JetBrains Mono", monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = sim.styleId === 'pixel-crusade' ? '#0F172A' : '#FFFDF8';
    ctx.strokeText(ft.text, fx, fy);
    ctx.fillStyle = ft.isCrit ? spec.palette.accent : spec.palette.dmgText;
    ctx.fillText(ft.text, fx, fy);
    ctx.restore();
  }
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  styleId: ArtStyleId,
  u: SimUnit,
  x: number,
  y: number,
  spec: (typeof ART_STYLE_MAP)['doodle-bean']
): void {
  const dir = u.faction === 'ally' ? 1 : -1;
  const primary = u.hitFlashTimer > 0
    ? '#FFFFFF'
    : u.faction === 'ally'
      ? spec.palette.allyPrimary
      : spec.palette.enemyPrimary;
  const secondary = u.hitFlashTimer > 0
    ? '#FFFFFF'
    : u.faction === 'ally'
      ? spec.palette.allySecondary
      : spec.palette.enemySecondary;

  const isDead = u.state === 'die';
  const dieProgress = isDead ? 1 - u.dieTimer / 0.32 : 0;
  const walkBob = u.state === 'walk' ? Math.abs(Math.sin(u.walkPhase)) * 3 : 0;
  const swing = u.attackAnimTimer > 0 ? Math.sin((u.attackAnimTimer / 0.22) * Math.PI) : 0;

  ctx.save();
  ctx.translate(x, y);
  if (isDead) {
    ctx.globalAlpha = Math.max(0, 1 - dieProgress);
    ctx.rotate(dir * -dieProgress * 1.35);
    ctx.translate(0, dieProgress * 4);
  }

  // Ground shadow
  ctx.fillStyle = spec.palette.groundShadow;
  ctx.beginPath();
  ctx.ellipse(0, 2, 7.5 * u.scale, 2.8 * u.scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(dir * u.scale, u.scale);
  ctx.translate(0, -walkBob);

  if (styleId === 'doodle-bean') {
    drawBeanUnit(ctx, u, primary, secondary, spec.palette.ink, swing);
  } else if (styleId === 'pixel-crusade') {
    drawPixelUnit(ctx, u, primary, secondary, spec.palette.ink, swing);
  } else if (styleId === 'ink-watercolor') {
    drawWatercolorUnit(ctx, u, primary, secondary, spec.palette.ink, swing);
  } else if (styleId === 'papercraft') {
    drawPapercraftUnit(ctx, u, primary, secondary, spec.palette.ink, swing);
  } else if (styleId === 'comic-pop') {
    drawComicUnit(ctx, u, primary, secondary, spec.palette.ink, swing);
  } else {
    drawUkiyoUnit(ctx, u, primary, secondary, spec.palette.ink, swing);
  }

  ctx.restore();

  // Mini unit HP bar only when injured
  if (!isDead && u.hp < u.maxHp) {
    const bw = 16 * u.scale;
    const bh = 3;
    const bx = x - bw / 2;
    const by = y - 24 * u.scale;
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = u.faction === 'ally' ? spec.palette.hpAlly : spec.palette.hpEnemy;
    ctx.fillRect(bx + 0.5, by + 0.5, (bw - 1) * Math.max(0, u.hp / u.maxHp), bh - 1);
  }
}

function drawBeanUnit(
  ctx: CanvasRenderingContext2D,
  u: SimUnit,
  primary: string,
  secondary: string,
  ink: string,
  swing: number
): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Stubby legs
  const legStride = u.state === 'walk' ? Math.sin(u.walkPhase * 2) * 3 : 0;
  ctx.beginPath();
  ctx.moveTo(-2.5, -3);
  ctx.lineTo(-3.5 + legStride, 1);
  ctx.moveTo(2.5, -3);
  ctx.lineTo(3.5 - legStride, 1);
  ctx.stroke();

  // Classic bean body
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.roundRect(-6, -19, 12, 16, 6);
  ctx.fill();
  ctx.stroke();

  // Skin face patch
  ctx.fillStyle = '#F2D2B6';
  ctx.beginPath();
  ctx.arc(2.2, -13.5, 3.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Role headgear & weapon
  ctx.save();
  ctx.translate(4, -10);
  ctx.rotate(swing * 0.9);
  if (u.role === 'melee') {
    // Wooden club
    ctx.fillStyle = '#8C5B32';
    ctx.beginPath();
    ctx.roundRect(0, -9, 4, 11, 2);
    ctx.fill();
    ctx.stroke();
  } else if (u.role === 'ranged') {
    // Slingshot / bow
    ctx.strokeStyle = '#6E4726';
    ctx.beginPath();
    ctx.arc(2, -3, 5, -1.2, 1.2);
    ctx.stroke();
  } else {
    // Heavy warhorn / horned helmet + axe
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.roundRect(0, -11, 6, 13, 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  if (u.role === 'heavy') {
    // Bone horns on bean
    ctx.fillStyle = '#F4EAD2';
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(-7, -23);
    ctx.lineTo(-1, -19);
    ctx.fill();
    ctx.stroke();
  }
}

function drawPixelUnit(
  ctx: CanvasRenderingContext2D,
  u: SimUnit,
  primary: string,
  secondary: string,
  ink: string,
  swing: number
): void {
  // Crisp integer pixel blocks
  ctx.fillStyle = ink;
  ctx.fillRect(-6, -19, 12, 17);
  ctx.fillStyle = primary;
  ctx.fillRect(-5, -18, 10, 14);
  // Highlight visor / helmet
  ctx.fillStyle = secondary;
  ctx.fillRect(-4, -17, 8, 4);
  ctx.fillStyle = '#FDE68A';
  ctx.fillRect(1, -14, 3, 3);
  // Legs
  const stride = u.state === 'walk' ? Math.round(Math.sin(u.walkPhase * 2) * 2) : 0;
  ctx.fillStyle = ink;
  ctx.fillRect(-4 + stride, -3, 3, 4);
  ctx.fillRect(1 - stride, -3, 3, 4);

  // Weapon pixel block
  ctx.save();
  ctx.translate(5, -10);
  ctx.rotate(swing * 0.85);
  ctx.fillStyle = u.role === 'ranged' ? '#D97706' : '#E2E8F0';
  ctx.fillRect(0, -9, u.role === 'heavy' ? 5 : 3, 10);
  ctx.restore();
}

function drawWatercolorUnit(
  ctx: CanvasRenderingContext2D,
  u: SimUnit,
  primary: string,
  secondary: string,
  ink: string,
  swing: number
): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  // Cloak / tunic wash
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.quadraticCurveTo(-6, -14, 0, -19);
  ctx.quadraticCurveTo(6, -14, 5, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = '#F5DEC4';
  ctx.beginPath();
  ctx.arc(0.5, -21, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Feathered cap or brass pauldrons
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.ellipse(0, -24, 5, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Weapon
  ctx.save();
  ctx.translate(4, -11);
  ctx.rotate(swing * 0.8);
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(u.role === 'ranged' ? 6 : 3, -12);
  ctx.stroke();
  ctx.restore();
}

function drawPapercraftUnit(
  ctx: CanvasRenderingContext2D,
  u: SimUnit,
  primary: string,
  secondary: string,
  _ink: string,
  swing: number
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Folded triangle/trapezoid paper body
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.lineTo(-4, -16);
  ctx.lineTo(5, -16);
  ctx.lineTo(6, -1);
  ctx.closePath();
  ctx.fill();

  // Paper head diamond
  ctx.fillStyle = '#FFE4C4';
  ctx.beginPath();
  ctx.arc(0.5, -20, 4, 0, Math.PI * 2);
  ctx.fill();

  // Paper shield / glider
  ctx.save();
  ctx.translate(5, -10);
  ctx.rotate(swing * 0.75);
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, -8);
  ctx.lineTo(2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawComicUnit(
  ctx: CanvasRenderingContext2D,
  u: SimUnit,
  primary: string,
  secondary: string,
  ink: string,
  swing: number
): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  // Angular heroic torso
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.lineTo(-7, -15);
  ctx.lineTo(6, -17);
  ctx.lineTo(5, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Visor helmet
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.roundRect(-4, -24, 9, 7, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(1, -22, 4, 2);

  // Heavy power gauntlet or blaster
  ctx.save();
  ctx.translate(5, -11);
  ctx.rotate(swing * 0.9);
  ctx.fillStyle = u.role === 'heavy' ? '#FACC15' : '#E5E7EB';
  ctx.fillRect(0, -6, 7, 5);
  ctx.strokeRect(0, -6, 7, 5);
  ctx.restore();
}

function drawUkiyoUnit(
  ctx: CanvasRenderingContext2D,
  u: SimUnit,
  primary: string,
  secondary: string,
  ink: string,
  swing: number
): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  // Hakama & kimono robe
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-4, -15);
  ctx.lineTo(4, -15);
  ctx.lineTo(6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head & Jingasa / Kabuto helmet
  ctx.fillStyle = '#F3DFC1';
  ctx.beginPath();
  ctx.arc(0, -18, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(-7, -19);
  ctx.lineTo(0, -24);
  ctx.lineTo(7, -19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Spear / Katana / Yumi Bow
  ctx.save();
  ctx.translate(4, -10);
  ctx.rotate(swing * 0.85);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (u.role === 'ranged') {
    ctx.arc(1, -4, 7, -1.3, 1.3);
  } else {
    ctx.moveTo(-2, 4);
    ctx.lineTo(5, -15);
  }
  ctx.stroke();
  ctx.restore();
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  styleId: ArtStyleId,
  p: SimProjectile,
  m: ViewportMetrics,
  laneCenterY: number,
  laneHalfH: number,
  spec: (typeof ART_STYLE_MAP)['doodle-bean']
): void {
  const px = p.x * m.scaleX;
  const arc = Math.sin(Math.min(1, p.progress) * Math.PI) * p.arcHeight;
  const py = laneCenterY + p.yOffset * laneHalfH - 12 - arc;
  const color = p.faction === 'ally' ? spec.palette.allyPrimary : spec.palette.enemyPrimary;

  ctx.save();
  ctx.translate(px, py);
  if (styleId === 'comic-pop') {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (styleId === 'pixel-crusade') {
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-3, -1, 6, 2);
  } else {
    ctx.fillStyle = color;
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

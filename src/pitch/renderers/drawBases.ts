import { ART_STYLE_MAP, type ArtStyleId } from '../stylesConfig';
import { ALLY_BASE_X, ENEMY_BASE_X, type PreviewSimState } from '../previewSim';
import type { ViewportMetrics } from './drawBackdrop';

export function drawStyleBases(
  ctx: CanvasRenderingContext2D,
  sim: PreviewSimState,
  m: ViewportMetrics
): void {
  const spec = ART_STYLE_MAP[sim.styleId];
  const baseY = (m.laneTopY + m.laneBottomY) * 0.5 + 8;
  const allyX = ALLY_BASE_X * m.scaleX;
  const enemyX = ENEMY_BASE_X * m.scaleX;

  drawSingleBase(ctx, sim.styleId, 'ally', allyX, baseY, sim.allyBaseHitFlash > 0, spec);
  drawSingleBase(ctx, sim.styleId, 'enemy', enemyX, baseY, sim.enemyBaseHitFlash > 0, spec);

  // World-matched HP bars right above each base
  drawBaseHpBar(
    ctx,
    sim.styleId,
    allyX + 4,
    baseY - 76,
    sim.allyBaseHp / sim.allyBaseMaxHp,
    Math.round(sim.allyBaseHp),
    spec.palette.hpAlly,
    spec
  );
  drawBaseHpBar(
    ctx,
    sim.styleId,
    enemyX - 4,
    baseY - 76,
    sim.enemyBaseHp / sim.enemyBaseMaxHp,
    Math.round(sim.enemyBaseHp),
    spec.palette.hpEnemy,
    spec
  );
}

function drawBaseHpBar(
  ctx: CanvasRenderingContext2D,
  styleId: ArtStyleId,
  cx: number,
  y: number,
  ratio: number,
  hpValue: number,
  fillColor: string,
  spec: (typeof ART_STYLE_MAP)['doodle-bean']
): void {
  const w = 54;
  const h = 10;
  const x = cx - w / 2;

  ctx.save();
  ctx.fillStyle = styleId === 'pixel-crusade' ? '#0F172A' : '#1E1B18';
  if (styleId === 'papercraft') {
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.max(0, Math.min(1, ratio))), h - 4);

  ctx.strokeStyle = spec.palette.ink;
  ctx.lineWidth = styleId === 'comic-pop' ? 2.2 : 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.strokeText(`${hpValue}`, cx, y - 4);
  ctx.fillText(`${hpValue}`, cx, y - 4);
  ctx.restore();
}

function drawSingleBase(
  ctx: CanvasRenderingContext2D,
  styleId: ArtStyleId,
  faction: 'ally' | 'enemy',
  x: number,
  y: number,
  flashing: boolean,
  spec: (typeof ART_STYLE_MAP)['doodle-bean']
): void {
  const main = faction === 'ally' ? spec.palette.allyPrimary : spec.palette.enemyPrimary;
  const sec = faction === 'ally' ? spec.palette.allySecondary : spec.palette.enemySecondary;

  ctx.save();
  ctx.translate(x, y);
  if (faction === 'enemy') ctx.scale(-1, 1);

  // Ground shadow
  ctx.fillStyle = spec.palette.groundShadow;
  ctx.beginPath();
  ctx.ellipse(0, 6, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (styleId === 'doodle-bean') {
    // Tribal timber palisade + banner
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 2.4;
    const logs = [-18, -9, 0, 9, 18];
    logs.forEach((lx, i) => {
      const lh = 40 + (i % 2) * 8;
      ctx.fillStyle = flashing ? '#FFF7ED' : i % 2 === 0 ? '#9E744B' : '#855E3A';
      ctx.beginPath();
      ctx.roundRect(lx - 5, -lh, 10, lh + 4, [5, 5, 2, 2]);
      ctx.fill();
      ctx.stroke();
    });
    // Crossbeam & faction shield
    ctx.fillStyle = flashing ? '#FFF7ED' : main;
    ctx.beginPath();
    ctx.roundRect(-22, -22, 44, 10, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = sec;
    ctx.beginPath();
    ctx.arc(0, -48, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (styleId === 'pixel-crusade') {
    // Pixel castle keep with crenellations
    ctx.fillStyle = flashing ? '#FFFFFF' : '#475569';
    ctx.fillRect(-24, -46, 48, 48);
    ctx.fillStyle = flashing ? '#FFFFFF' : '#64748B';
    ctx.fillRect(-28, -54, 12, 10);
    ctx.fillRect(-6, -54, 12, 10);
    ctx.fillRect(16, -54, 12, 10);
    // Gate & banner
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-8, -22, 16, 24);
    ctx.fillStyle = main;
    ctx.fillRect(-4, -64, 18, 10);
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-6, -68, 3, 20);
  } else if (styleId === 'ink-watercolor') {
    // Storybook clocktower / belfry
    ctx.fillStyle = flashing ? '#FFFDF7' : '#D9CCB4';
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(-20, -46, 40, 48);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flashing ? '#FFFDF7' : main;
    ctx.beginPath();
    ctx.moveTo(-24, -46);
    ctx.lineTo(0, -68);
    ctx.lineTo(24, -46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F5E6C4';
    ctx.beginPath();
    ctx.arc(0, -30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (styleId === 'papercraft') {
    ctx.shadowColor = 'rgba(0,0,0,0.24)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = flashing ? '#FFFFFF' : '#E7D8BD';
    ctx.beginPath();
    ctx.roundRect(-22, -48, 44, 50, 3);
    ctx.fill();
    ctx.fillStyle = flashing ? '#FFFFFF' : main;
    ctx.beginPath();
    ctx.moveTo(-26, -46);
    ctx.lineTo(0, -68);
    ctx.lineTo(26, -46);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = sec;
    ctx.fillRect(-8, -22, 16, 24);
  } else if (styleId === 'comic-pop') {
    // Heavy inked sci-fi bunker
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 3;
    ctx.fillStyle = flashing ? '#FFFFFF' : '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(-24, 2);
    ctx.lineTo(-20, -48);
    ctx.lineTo(14, -56);
    ctx.lineTo(24, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = main;
    ctx.fillRect(-12, -38, 22, 14);
    ctx.strokeRect(-12, -38, 22, 14);
  } else {
    // Ukiyo-e pagoda / torii tower
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 2;
    ctx.fillStyle = flashing ? '#FFFFFF' : '#EAE0CA';
    ctx.fillRect(-18, -36, 36, 38);
    ctx.strokeRect(-18, -36, 36, 38);
    // Curved pagoda roof
    ctx.fillStyle = flashing ? '#FFFFFF' : main;
    ctx.beginPath();
    ctx.moveTo(-28, -34);
    ctx.quadraticCurveTo(0, -44, 28, -34);
    ctx.lineTo(16, -54);
    ctx.lineTo(-16, -54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Second spire tier
    ctx.beginPath();
    ctx.moveTo(-20, -52);
    ctx.lineTo(0, -68);
    ctx.lineTo(20, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

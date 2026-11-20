import { ART_STYLE_MAP, type ArtStyleId } from '../stylesConfig';

export interface ViewportMetrics {
  width: number;
  height: number;
  horizonY: number;
  laneTopY: number;
  laneBottomY: number;
  scaleX: number;
}

export function getViewportMetrics(width: number, height: number): ViewportMetrics {
  const horizonY = height * 0.44;
  const laneTopY = height * 0.49;
  const laneBottomY = height * 0.69;
  return {
    width,
    height,
    horizonY,
    laneTopY,
    laneBottomY,
    scaleX: width / 360,
  };
}

export function drawStyleBackdrop(
  ctx: CanvasRenderingContext2D,
  styleId: ArtStyleId,
  m: ViewportMetrics,
  time: number
): void {
  const spec = ART_STYLE_MAP[styleId];
  const { width, height, horizonY, laneTopY, laneBottomY } = m;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 12);
  skyGrad.addColorStop(0, spec.palette.skyTop);
  skyGrad.addColorStop(1, spec.palette.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY + 20);

  if (styleId === 'doodle-bean') {
    drawDoodleBackdrop(ctx, m, spec, time);
  } else if (styleId === 'pixel-crusade') {
    drawPixelBackdrop(ctx, m, spec, time);
  } else if (styleId === 'ink-watercolor') {
    drawWatercolorBackdrop(ctx, m, spec, time);
  } else if (styleId === 'papercraft') {
    drawPapercraftBackdrop(ctx, m, spec, time);
  } else if (styleId === 'comic-pop') {
    drawComicBackdrop(ctx, m, spec, time);
  } else {
    drawUkiyoBackdrop(ctx, m, spec, time);
  }

  // Lower meadow / foreground floor below the battle lane
  ctx.fillStyle = spec.palette.groundMain;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Subtle top horizon rim
  ctx.fillStyle = spec.palette.horizon;
  ctx.fillRect(0, horizonY - 4, width, 6);

  // Battle lane track (2.5D slight top-down road)
  const trackY = laneTopY - 6;
  const trackH = laneBottomY - laneTopY + 16;
  ctx.fillStyle = spec.palette.groundTrack;
  ctx.fillRect(0, trackY, width, trackH);

  drawTrackDetails(ctx, styleId, m, spec, trackY, trackH);
}

function drawTrackDetails(
  ctx: CanvasRenderingContext2D,
  styleId: ArtStyleId,
  m: ViewportMetrics,
  spec: (typeof ART_STYLE_MAP)['doodle-bean'],
  trackY: number,
  trackH: number
): void {
  const { width, height } = m;

  if (styleId === 'doodle-bean') {
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    ctx.lineTo(width, trackY);
    ctx.moveTo(0, trackY + trackH);
    ctx.lineTo(width, trackY + trackH);
    ctx.stroke();

    // Hand-drawn pebbles & tuft clusters
    ctx.fillStyle = '#A88E60';
    for (let i = 0; i < 12; i++) {
      const px = ((i * 53 + 22) % (width - 20)) + 10;
      const py = trackY + 14 + ((i * 29) % (trackH - 28));
      ctx.beginPath();
      ctx.ellipse(px, py, 5, 2.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (styleId === 'pixel-crusade') {
    // Pixel cobblestone blocks along causeway
    const pxSize = 4;
    for (let x = 0; x < width; x += 24) {
      ctx.fillStyle = '#534E44';
      ctx.fillRect(x, trackY, 24, pxSize);
      ctx.fillRect(x, trackY + trackH - pxSize, 24, pxSize);
      ctx.fillStyle = '#80796A';
      ctx.fillRect(x + 4, trackY + 12 + ((x * 7) % 36), 8, 4);
    }
    // Lower turf grass blades
    ctx.fillStyle = '#36623D';
    for (let x = 8; x < width; x += 28) {
      ctx.fillRect(x, trackY + trackH + 14, 4, 8);
      ctx.fillRect(x + 4, trackY + trackH + 18, 4, 4);
    }
  } else if (styleId === 'ink-watercolor') {
    // Soft washed edge lines + sepia hatch strokes
    ctx.strokeStyle = 'rgba(58, 43, 35, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    for (let x = 0; x <= width; x += 24) {
      ctx.lineTo(x, trackY + Math.sin(x * 0.08) * 1.5);
    }
    ctx.moveTo(0, trackY + trackH);
    for (let x = 0; x <= width; x += 24) {
      ctx.lineTo(x, trackY + trackH + Math.cos(x * 0.08) * 1.5);
    }
    ctx.stroke();
    // Paper vignette wash
    const v = ctx.createRadialGradient(width / 2, height * 0.45, width * 0.2, width / 2, height * 0.45, width * 0.85);
    v.addColorStop(0, 'rgba(255,255,255,0)');
    v.addColorStop(1, 'rgba(58, 43, 35, 0.09)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, width, height);
  } else if (styleId === 'papercraft') {
    // Cutout cardstock edge shadow along track
    ctx.fillStyle = 'rgba(36, 48, 60, 0.14)';
    ctx.fillRect(0, trackY - 3, width, 4);
    ctx.fillRect(0, trackY + trackH, width, 5);
    // Dashed stitched sewing thread along the lane
    ctx.strokeStyle = '#B8A689';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(0, trackY + 6);
    ctx.lineTo(width, trackY + 6);
    ctx.moveTo(0, trackY + trackH - 6);
    ctx.lineTo(width, trackY + trackH - 6);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (styleId === 'comic-pop') {
    // Urban overpass lane markings & heavy ink edge
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    ctx.lineTo(width, trackY);
    ctx.moveTo(0, trackY + trackH);
    ctx.lineTo(width, trackY + trackH);
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    for (let x = 16; x < width; x += 48) {
      ctx.fillRect(x, trackY + trackH * 0.5 - 2, 24, 4);
    }
  } else {
    // Ukiyo-e cedar bridge planks
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(-2, trackY, width + 4, trackH);
    ctx.strokeStyle = 'rgba(28, 25, 23, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 18; x < width; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, trackY);
      ctx.lineTo(x - 6, trackY + trackH);
      ctx.stroke();
    }
  }
}

function drawDoodleBackdrop(
  ctx: CanvasRenderingContext2D,
  m: ViewportMetrics,
  spec: (typeof ART_STYLE_MAP)['doodle-bean'],
  time: number
): void {
  const { width, horizonY } = m;
  // Soft rounded rolling hills with uniform dark ink line
  ctx.fillStyle = '#D5BE94';
  ctx.strokeStyle = spec.palette.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.quadraticCurveTo(width * 0.22, horizonY - 58, width * 0.48, horizonY - 12);
  ctx.quadraticCurveTo(width * 0.76, horizonY - 68, width, horizonY - 16);
  ctx.lineTo(width, horizonY + 8);
  ctx.lineTo(0, horizonY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Puffy flat-doodle clouds (clean silhouette without interior seam lines)
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 135 + time * 5) % (width + 90)) - 45;
    const cy = 96 + i * 26;
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.arc(cx + 15, cy - 5, 16, 0, Math.PI * 2);
    ctx.arc(cx + 30, cy, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F7F0DE';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.arc(cx + 15, cy - 5, 16, 0, Math.PI * 2);
    ctx.arc(cx + 30, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPixelBackdrop(
  ctx: CanvasRenderingContext2D,
  m: ViewportMetrics,
  _spec: (typeof ART_STYLE_MAP)['pixel-crusade'],
  time: number
): void {
  const { width, horizonY } = m;
  // Pixelated mountain silhouettes
  ctx.fillStyle = '#1E2D4D';
  for (let x = 0; x < width; x += 16) {
    const h = 28 + Math.round(Math.sin(x * 0.04) * 20 + Math.cos(x * 0.09) * 14);
    ctx.fillRect(x, horizonY - h, 16, h + 4);
  }
  // Distant pixel pine ridge
  ctx.fillStyle = '#2B4C48';
  for (let x = 4; x < width; x += 12) {
    const h = 14 + ((x * 13) % 14);
    ctx.fillRect(x, horizonY - h, 10, h + 2);
  }
  // Pixel clouds cleanly below top HUD
  ctx.fillStyle = '#B8D4F2';
  for (let i = 0; i < 3; i++) {
    const cx = Math.round(((i * 140 + time * 7) % (width + 80)) - 40);
    const cy = 92 + i * 24;
    ctx.fillRect(cx, cy, 36, 8);
    ctx.fillRect(cx + 8, cy - 6, 20, 6);
  }
}

function drawWatercolorBackdrop(
  ctx: CanvasRenderingContext2D,
  m: ViewportMetrics,
  spec: (typeof ART_STYLE_MAP)['ink-watercolor'],
  time: number
): void {
  const { width, horizonY } = m;
  // Soft layered pigment hills
  ctx.fillStyle = 'rgba(130, 152, 136, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.bezierCurveTo(width * 0.25, horizonY - 66, width * 0.52, horizonY - 22, width, horizonY - 54);
  ctx.lineTo(width, horizonY + 10);
  ctx.lineTo(0, horizonY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(58, 43, 35, 0.45)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Sun watercolor halo
  const sunX = width * 0.72 + Math.sin(time * 0.2) * 3;
  const sunY = horizonY - 88;
  ctx.fillStyle = 'rgba(218, 165, 86, 0.28)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(235, 198, 120, 0.65)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();

  // Cypress silhouettes
  ctx.fillStyle = 'rgba(72, 92, 78, 0.65)';
  for (let i = 0; i < 5; i++) {
    const tx = 58 + i * 64;
    ctx.beginPath();
    ctx.ellipse(tx, horizonY - 14, 7, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawPapercraftBackdrop(
  ctx: CanvasRenderingContext2D,
  m: ViewportMetrics,
  _spec: (typeof ART_STYLE_MAP)['papercraft'],
  time: number
): void {
  const { width, horizonY } = m;
  // Layered paper hills with crisp cast shadows
  ctx.save();
  ctx.shadowColor = 'rgba(36, 48, 60, 0.18)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#9FD5C7';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(width * 0.28, horizonY - 56);
  ctx.lineTo(width * 0.62, horizonY - 14);
  ctx.lineTo(width * 0.88, horizonY - 48);
  ctx.lineTo(width, horizonY - 22);
  ctx.lineTo(width, horizonY + 12);
  ctx.lineTo(0, horizonY + 12);
  ctx.closePath();
  ctx.fill();

  // Paper sun cutout cleanly below top HUD
  ctx.fillStyle = '#F6C65B';
  ctx.beginPath();
  ctx.arc(width * 0.22, 118, 22, 0, Math.PI * 2);
  ctx.fill();

  // Folded paper clouds
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 130 + time * 6) % (width + 90)) - 45;
    const cy = 96 + i * 24;
    ctx.beginPath();
    ctx.roundRect(cx, cy, 48, 18, 9);
    ctx.fill();
  }
  ctx.restore();
}

function drawComicBackdrop(
  ctx: CanvasRenderingContext2D,
  m: ViewportMetrics,
  spec: (typeof ART_STYLE_MAP)['comic-pop'],
  _time: number
): void {
  const { width, horizonY } = m;
  // Ben-Day halftone sky dots
  ctx.fillStyle = 'rgba(234, 88, 12, 0.12)';
  for (let y = 16; y < horizonY - 10; y += 14) {
    for (let x = (y % 28 === 0 ? 7 : 0); x < width; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stylized graphic city skyline silhouette
  const buildings = [26, 52, 34, 68, 42, 58, 30, 48, 62, 36];
  const bw = width / buildings.length;
  buildings.forEach((bh, idx) => {
    const bx = idx * bw;
    ctx.fillStyle = idx % 2 === 0 ? '#374151' : '#4B5563';
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 2;
    ctx.fillRect(bx, horizonY - bh, bw - 2, bh + 4);
    ctx.strokeRect(bx, horizonY - bh, bw - 2, bh + 4);
  });
}

function drawUkiyoBackdrop(
  ctx: CanvasRenderingContext2D,
  m: ViewportMetrics,
  spec: (typeof ART_STYLE_MAP)['ukiyo-woodblock'],
  _time: number
): void {
  const { width, horizonY } = m;
  // Vermilion sun seal
  ctx.fillStyle = '#C83E2B';
  ctx.beginPath();
  ctx.arc(width * 0.5, horizonY - 76, 26, 0, Math.PI * 2);
  ctx.fill();

  // Iconic snow-capped mountain silhouette
  ctx.fillStyle = '#43586B';
  ctx.strokeStyle = spec.palette.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.12, horizonY + 2);
  ctx.quadraticCurveTo(width * 0.36, horizonY - 38, width * 0.46, horizonY - 82);
  ctx.lineTo(width * 0.54, horizonY - 82);
  ctx.quadraticCurveTo(width * 0.64, horizonY - 38, width * 0.88, horizonY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Snow cap
  ctx.fillStyle = '#F7F1E1';
  ctx.beginPath();
  ctx.moveTo(width * 0.46, horizonY - 82);
  ctx.lineTo(width * 0.54, horizonY - 82);
  ctx.lineTo(width * 0.60, horizonY - 58);
  ctx.lineTo(width * 0.53, horizonY - 64);
  ctx.lineTo(width * 0.50, horizonY - 56);
  ctx.lineTo(width * 0.46, horizonY - 64);
  ctx.lineTo(width * 0.40, horizonY - 58);
  ctx.closePath();
  ctx.fill();

  // Stylized ukiyo-e cloud bands cleanly below top HUD
  ctx.fillStyle = '#F6EEDB';
  ctx.strokeStyle = 'rgba(28, 25, 23, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(14, 102, 108, 14, 7);
  ctx.roundRect(width - 130, 122, 112, 14, 7);
  ctx.fill();
  ctx.stroke();
}

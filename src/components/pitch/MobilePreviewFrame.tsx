import { useEffect, useRef, useState } from 'react';
import {
  ART_STYLE_MAP,
  type ArtStyleId,
  type PreviewScreenMode,
  type UnitRole,
} from '../../pitch/stylesConfig';
import {
  createPreviewSim,
  spawnPlayerUnit,
  spawnSwarmBurst,
  stepPreviewSim,
  type PreviewSimState,
} from '../../pitch/previewSim';
import { drawStyleBackdrop, getViewportMetrics } from '../../pitch/renderers/drawBackdrop';
import { drawStyleBases } from '../../pitch/renderers/drawBases';
import { drawStyleEntities } from '../../pitch/renderers/drawEntities';
import { CoinIcon, FoodIcon, TitleCrestEmblem, UnitRoleIcon } from './StyleIcons';
import { Pause, Play, RotateCcw, Settings, Sparkles, TrendingUp, Shield } from 'lucide-react';

interface MobilePreviewFrameProps {
  styleId: ArtStyleId;
  screenMode: PreviewScreenMode;
  onChangeScreenMode: (mode: PreviewScreenMode) => void;
  simPaused?: boolean;
}

export function MobilePreviewFrame({
  styleId,
  screenMode,
  onChangeScreenMode,
  simPaused = false,
}: MobilePreviewFrameProps) {
  const spec = ART_STYLE_MAP[styleId];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const foodBarRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<PreviewSimState>(createPreviewSim(styleId));
  const [hudSnap, setHudSnap] = useState(() => ({
    food: 14,
    maxFood: 30,
    foodRate: 2.2,
    coins: 48,
    unitCount: 16,
    speed: 1 as 1 | 2,
    foodLvl: 1,
    baseLvl: 1,
  }));

  // Reset simulation cleanly whenever style changes
  useEffect(() => {
    const next = createPreviewSim(styleId);
    simRef.current = next;
    setHudSnap({
      food: Math.floor(next.food),
      maxFood: next.maxFood,
      foodRate: next.foodRate,
      coins: next.coins,
      unitCount: next.units.length,
      speed: next.speedMultiplier,
      foodLvl: 1,
      baseLvl: 1,
    });
  }, [styleId]);

  const simPausedRef = useRef(simPaused);
  simPausedRef.current = simPaused;

  // Isolated 60fps Canvas loop (no React re-render per frame; bar mutates via ref, state updates only on integer changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let yieldTimerId: number | null = null;
    let disposed = false;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const drawOnce = () => {
      const sim = simRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cssW = canvas.clientWidth || 360;
      const cssH = canvas.clientHeight || 640;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = styleId !== 'pixel-crusade';

      const metrics = getViewportMetrics(cssW, cssH);
      drawStyleBackdrop(ctx, styleId, metrics, sim.time);
      drawStyleBases(ctx, sim, metrics);
      drawStyleEntities(ctx, sim, metrics);

      ctx.restore();

      if (foodBarRef.current) {
        const pct = Math.min(100, (sim.food / sim.maxFood) * 100);
        foodBarRef.current.style.width = `${pct.toFixed(1)}%`;
      }
    };

    const scheduleNext = (frameCostMs: number) => {
      if (disposed || simPausedRef.current) return;
      if (frameCostMs > 10) {
        yieldTimerId = window.setTimeout(() => {
          if (!disposed && !simPausedRef.current) rafId = requestAnimationFrame(renderFrame);
        }, 12);
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const renderFrame = (now: number) => {
      if (disposed) return;
      const frameStart = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = simRef.current;
      if (!simPausedRef.current) {
        stepPreviewSim(sim, rawDt);
      }

      drawOnce();

      hudAccumulator += rawDt;
      if (hudAccumulator >= 0.16) {
        hudAccumulator = 0;
        const nextFood = Math.floor(sim.food);
        const nextCoins = sim.coins;
        setHudSnap((prev) => {
          if (
            prev.food === nextFood &&
            prev.coins === nextCoins &&
            prev.speed === sim.speedMultiplier
          ) {
            return prev;
          }
          return {
            ...prev,
            food: nextFood,
            maxFood: sim.maxFood,
            foodRate: Number(sim.foodRate.toFixed(1)),
            coins: nextCoins,
            speed: sim.speedMultiplier,
          };
        });
      }

      scheduleNext(performance.now() - frameStart);
    };

    drawOnce();
    if (!simPaused) {
      rafId = requestAnimationFrame(renderFrame);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (yieldTimerId !== null) clearTimeout(yieldTimerId);
    };
  }, [styleId, simPaused]);

  const handleSpawn = (role: UnitRole) => {
    const ok = spawnPlayerUnit(simRef.current, role, true);
    if (ok) {
      setHudSnap((prev) => ({
        ...prev,
        food: Math.floor(simRef.current.food),
        unitCount: simRef.current.units.length,
      }));
    }
  };

  const handleSwarmBurst = () => {
    spawnSwarmBurst(simRef.current);
    setHudSnap((prev) => ({
      ...prev,
      unitCount: simRef.current.units.length,
    }));
  };

  const handleToggleSpeed = () => {
    const nextSpeed: 1 | 2 = simRef.current.speedMultiplier === 1 ? 2 : 1;
    simRef.current.speedMultiplier = nextSpeed;
    setHudSnap((prev) => ({ ...prev, speed: nextSpeed }));
  };

  const handleUpgradeFood = () => {
    const sim = simRef.current;
    if (sim.coins < 12) return;
    sim.coins -= 12;
    sim.foodRate = Number((sim.foodRate + 0.4).toFixed(1));
    setHudSnap((prev) => ({
      ...prev,
      coins: sim.coins,
      foodRate: sim.foodRate,
      foodLvl: prev.foodLvl + 1,
    }));
  };

  const handleUpgradeBase = () => {
    const sim = simRef.current;
    if (sim.coins < 12) return;
    sim.coins -= 12;
    sim.allyBaseMaxHp += 80;
    sim.allyBaseHp += 80;
    setHudSnap((prev) => ({
      ...prev,
      coins: sim.coins,
      baseLvl: prev.baseLvl + 1,
    }));
  };

  // Style-specific frame styling helpers
  const isPixel = styleId === 'pixel-crusade';
  const isComic = styleId === 'comic-pop';
  const isSerif = styleId === 'ink-watercolor' || styleId === 'ukiyo-woodblock';
  const isPaper = styleId === 'papercraft';

  const cardRadius = isPixel ? 'rounded-none' : isComic ? 'rounded-sm' : 'rounded-xl';
  const cardShadow = isPixel
    ? 'inset 0 2px 0 rgba(255,255,255,0.16), 0 4px 0 #0B0F19'
    : isComic
      ? '3px 3px 0 #111827'
      : isPaper
        ? '0 4px 10px rgba(36,48,60,0.2)'
        : `0 3px 0 ${spec.palette.panelBorder}`;

  const titleFontClass = isComic
    ? 'font-display-comic tracking-wide uppercase'
    : isSerif
      ? 'font-display-serif'
      : 'font-extrabold tracking-tight';

  return (
    <div className="relative mx-auto w-[340px] sm:w-[360px] aspect-[9/16] max-h-[760px] rounded-[34px] border-[7px] border-[#262830] bg-[#0F1116] shadow-[0_24px_64px_rgba(0,0,0,0.55)] overflow-hidden select-none">
      {/* Subtle mobile speaker notch */}
      <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 h-4 w-24 rounded-full bg-[#181A20] border border-white/10" />

      {/* Live 60FPS Canvas Stage */}
      <canvas
        ref={canvasRef}
        data-testid="pitch-battle-canvas"
        className="absolute inset-0 w-full h-full block"
      />

      {/* MAIN MENU OVERLAY (when screenMode === 'menu') */}
      {screenMode === 'menu' && (
        <div
          data-testid="preview-main-menu"
          className="absolute inset-0 z-20 flex flex-col justify-between p-5 pt-10"
          style={{
            background:
              styleId === 'pixel-crusade'
                ? 'linear-gradient(180deg, rgba(15,23,42,0.52) 0%, rgba(15,23,42,0.06) 48%, rgba(15,23,42,0.06) 68%, rgba(15,23,42,0.72) 100%)'
                : 'linear-gradient(180deg, rgba(255,252,245,0.35) 0%, rgba(255,252,245,0.02) 48%, rgba(28,25,23,0.04) 68%, rgba(28,25,23,0.42) 100%)',
          }}
        >
          {/* Top bar inside Main Menu */}
          <div className="flex items-center justify-between gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${cardRadius}`}
              style={{
                backgroundColor: spec.palette.panelBg,
                color: spec.palette.panelText,
                border: `2px solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <CoinIcon color={spec.palette.accent} stroke={spec.palette.panelBorder} />
              <span className="font-mono-num">1,240</span>
            </div>

            <button
              type="button"
              aria-label="Preview Settings"
              onClick={() => onChangeScreenMode('battle')}
              className={`w-9 h-9 flex items-center justify-center transition-transform active:translate-y-0.5 ${cardRadius}`}
              style={{
                backgroundColor: spec.palette.panelBg,
                color: spec.palette.panelText,
                border: `2px solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Center Title Emblem & Era Card positioned in upper sky negative space */}
          <div className="mt-2 mb-auto text-center px-1">
            <div
              className={`inline-block w-full px-4 py-4 ${cardRadius}`}
              style={{
                backgroundColor:
                  styleId === 'pixel-crusade'
                    ? 'rgba(30, 37, 56, 0.92)'
                    : `${spec.palette.panelBg}EB`,
                color: spec.palette.panelText,
                border: `${isComic ? '3px' : '2px'} solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <TitleCrestEmblem
                styleId={styleId}
                primary={spec.palette.allyPrimary}
                secondary={spec.palette.enemyPrimary}
                accent={spec.palette.accent}
                ink={spec.palette.panelBorder}
              />
              <p
                className="mt-1 text-[11px] font-bold tracking-[0.14em] uppercase"
                style={{ color: spec.palette.mutedText }}
              >
                {spec.eraLabel}
              </p>
              <h2
                className={`mt-1 text-3xl leading-none ${titleFontClass}`}
                style={{ color: spec.palette.panelText }}
              >
                CHRONO CLASH
              </h2>
              <p
                className="mt-2 text-xs font-semibold"
                style={{ color: spec.palette.mutedText }}
              >
                {spec.battleLabel}
              </p>

              {/* Era Progression Track */}
              <div className="mt-4 flex items-center justify-between gap-1.5 text-[10px] font-bold">
                <span
                  className={`flex-1 py-1 px-1.5 ${isPixel ? 'rounded-none' : 'rounded-md'}`}
                  style={{
                    backgroundColor: spec.palette.allyPrimary,
                    color: '#FFFFFF',
                  }}
                >
                  AGE I
                </span>
                <span
                  className={`flex-1 py-1 px-1.5 ${isPixel ? 'rounded-none' : 'rounded-md'}`}
                  style={{
                    backgroundColor: spec.palette.accent,
                    color: spec.palette.accentText,
                  }}
                >
                  AGE II
                </span>
                <span
                  className={`flex-1 py-1 px-1.5 opacity-60 ${isPixel ? 'rounded-none' : 'rounded-md'}`}
                  style={{
                    border: `1.5px solid ${spec.palette.panelBorder}`,
                    color: spec.palette.panelText,
                  }}
                >
                  AGE III
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Menu CTAs */}
          <div className="space-y-2.5 pb-1">
            <button
              type="button"
              onClick={() => onChangeScreenMode('battle')}
              className={`w-full py-3.5 px-5 flex items-center justify-center gap-2 text-base font-extrabold tracking-wide transition-transform active:translate-y-0.5 cursor-pointer ${cardRadius} ${isComic ? '-skew-x-2' : ''}`}
              style={{
                backgroundColor: spec.palette.accent,
                color: spec.palette.accentText,
                border: `${isComic ? '3px' : '2px'} solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>BATTLE</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onChangeScreenMode('battle')}
                className={`py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-transform active:translate-y-0.5 cursor-pointer ${cardRadius}`}
                style={{
                  backgroundColor: spec.palette.panelBg,
                  color: spec.palette.panelText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                <TrendingUp className="w-4 h-4" />
                <span>UPGRADES</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeScreenMode('battle')}
                className={`py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-transform active:translate-y-0.5 cursor-pointer ${cardRadius}`}
                style={{
                  backgroundColor: spec.palette.panelBg,
                  color: spec.palette.panelText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                <Shield className="w-4 h-4" />
                <span>TIMELINES</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE BATTLE HUD OVERLAY (when screenMode === 'battle') */}
      {screenMode === 'battle' && (
        <div
          data-testid="preview-battle-hud"
          className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 pt-8"
        >
          {/* Top Battle Header */}
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <div
              className={`px-2.5 py-1.5 flex items-center gap-2 text-xs font-bold ${cardRadius}`}
              style={{
                backgroundColor: spec.palette.panelBg,
                color: spec.palette.panelText,
                border: `2px solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <CoinIcon color={spec.palette.accent} stroke={spec.palette.panelBorder} />
              <span className="font-mono-num">{hudSnap.coins}</span>
            </div>

            <div
              className={`px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase ${cardRadius}`}
              style={{
                backgroundColor: spec.palette.panelBg,
                color: spec.palette.panelText,
                border: `2px solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              {spec.battleLabel}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSpeed}
                aria-label="Toggle battle speed"
                className={`h-8 px-2 text-xs font-extrabold font-mono-num cursor-pointer ${cardRadius}`}
                style={{
                  backgroundColor:
                    hudSnap.speed === 2 ? spec.palette.accent : spec.palette.panelBg,
                  color:
                    hudSnap.speed === 2 ? spec.palette.accentText : spec.palette.panelText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                {hudSnap.speed}x
              </button>
              <button
                type="button"
                onClick={() => onChangeScreenMode('menu')}
                aria-label="Back to Main Menu"
                className={`w-8 h-8 flex items-center justify-center cursor-pointer ${cardRadius}`}
                style={{
                  backgroundColor: spec.palette.panelBg,
                  color: spec.palette.panelText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Commander Dock */}
          <div className="pointer-events-auto space-y-2 pb-1">
            {/* Quick Swarm Demo Strip & In-Battle Upgrades */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={handleUpgradeFood}
                className={`flex-1 py-1.5 px-2 flex items-center justify-between text-[11px] font-bold cursor-pointer active:translate-y-0.5 ${cardRadius}`}
                style={{
                  backgroundColor: spec.palette.panelBg,
                  color: spec.palette.panelText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                <span className="truncate">Food Lv.{hudSnap.foodLvl}</span>
                <span className="font-mono-num opacity-80">12c</span>
              </button>

              <button
                type="button"
                onClick={handleUpgradeBase}
                className={`flex-1 py-1.5 px-2 flex items-center justify-between text-[11px] font-bold cursor-pointer active:translate-y-0.5 ${cardRadius}`}
                style={{
                  backgroundColor: spec.palette.panelBg,
                  color: spec.palette.panelText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                <span className="truncate">Base Lv.{hudSnap.baseLvl}</span>
                <span className="font-mono-num opacity-80">12c</span>
              </button>

              <button
                type="button"
                onClick={handleSwarmBurst}
                title="Spawn a wave of units to test swarm readability"
                className={`py-1.5 px-2.5 flex items-center gap-1 text-[11px] font-extrabold cursor-pointer active:translate-y-0.5 ${cardRadius}`}
                style={{
                  backgroundColor: spec.palette.accent,
                  color: spec.palette.accentText,
                  border: `2px solid ${spec.palette.panelBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                <Sparkles className="w-3 h-3" />
                <span>Swarm</span>
              </button>
            </div>

            {/* Food Meter */}
            <div
              className={`px-3 py-1.5 flex items-center justify-between gap-2 ${cardRadius}`}
              style={{
                backgroundColor: spec.palette.panelBg,
                color: spec.palette.panelText,
                border: `2px solid ${spec.palette.panelBorder}`,
                boxShadow: cardShadow,
              }}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <FoodIcon styleId={styleId} color={spec.palette.foodBar} />
                <span className="text-sm font-extrabold font-mono-num">
                  {hudSnap.food}/{hudSnap.maxFood}
                </span>
              </div>

              <div
                className={`flex-1 h-3 overflow-hidden ${isPixel ? 'rounded-none' : 'rounded-full'}`}
                style={{
                  backgroundColor:
                    styleId === 'pixel-crusade' ? '#0F172A' : 'rgba(0,0,0,0.12)',
                  border: `1.5px solid ${spec.palette.panelBorder}`,
                }}
              >
                <div
                  ref={foodBarRef}
                  className="h-full"
                  style={{
                    width: `${Math.min(100, (hudSnap.food / hudSnap.maxFood) * 100)}%`,
                    backgroundColor: spec.palette.foodBar,
                  }}
                />
              </div>

              <span
                className="text-[11px] font-bold font-mono-num shrink-0"
                style={{ color: spec.palette.mutedText }}
              >
                +{hudSnap.foodRate}/s
              </span>
            </div>

            {/* 3 Unit Summon Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(['melee', 'ranged', 'heavy'] as UnitRole[]).map((role) => {
                const u = spec.units[role];
                const affordable = hudSnap.food >= u.cost;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSpawn(role)}
                    disabled={!affordable}
                    className={`py-2 px-1.5 flex flex-col items-center gap-0.5 transition-transform active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${cardRadius} ${isComic ? '-skew-x-2' : ''}`}
                    style={{
                      backgroundColor: affordable
                        ? spec.palette.panelBg
                        : styleId === 'pixel-crusade'
                          ? '#151B2B'
                          : '#DED6C6',
                      color: spec.palette.panelText,
                      border: `${isComic ? '2.5px' : '2px'} solid ${spec.palette.panelBorder}`,
                      boxShadow: cardShadow,
                    }}
                  >
                    <UnitRoleIcon
                      role={role}
                      primary={spec.palette.allyPrimary}
                      secondary={spec.palette.accent}
                      ink={spec.palette.panelBorder}
                    />
                    <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
                      {u.name}
                    </span>
                    <span
                      className="text-[10.5px] font-bold font-mono-num whitespace-nowrap"
                      style={{ color: spec.palette.accent }}
                    >
                      {u.cost} {spec.foodLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subtle Reset Sim button inside bottom bezel corner for battle mode */}
      {screenMode === 'battle' && (
        <button
          type="button"
          onClick={() => {
            simRef.current = createPreviewSim(styleId);
          }}
          aria-label="Reset Battle Preview"
          className="sr-only"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

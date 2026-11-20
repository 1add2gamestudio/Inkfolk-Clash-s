import { useEffect, useState } from 'react';
import {
  ART_STYLES,
  ART_STYLE_MAP,
  type ArtStyleId,
  type PreviewScreenMode,
} from '../../pitch/stylesConfig';
import { MobilePreviewFrame } from './MobilePreviewFrame';
import { ArrowLeft, MonitorSmartphone, Swords, LayoutGrid, Pause, Play } from 'lucide-react';

export function StyleSwitcherShell({ onBackToGame }: { onBackToGame?: () => void }) {
  const [selectedStyle, setSelectedStyle] = useState<ArtStyleId>('doodle-bean');
  const [screenMode, setScreenMode] = useState<PreviewScreenMode>('battle');
  const [simPaused, setSimPaused] = useState(false);

  // Support URL query params (?autostart=1 opens Active Battle immediately)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('style') as ArtStyleId | null;
    if (s && ART_STYLE_MAP[s]) {
      setSelectedStyle(s);
    }
    const scr = params.get('screen');
    if (scr === 'menu' || scr === 'battle') {
      setScreenMode(scr);
    } else if (params.get('autostart') === '1') {
      setScreenMode('battle');
    }
    if (params.get('freeze') === '1') {
      setSimPaused(true);
    }
  }, []);

  useEffect(() => {
    document.body.dataset.state = screenMode === 'battle' ? 'playing' : 'title';
    document.body.dataset.style = selectedStyle;
  }, [screenMode, selectedStyle]);

  const activeSpec = ART_STYLE_MAP[selectedStyle];

  return (
    <div className="min-h-screen bg-[#121316] text-stone-100 flex flex-col">
      {/* Compact Studio Review Header */}
      <header className="border-b border-white/10 bg-[#16181D]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBackToGame && (
              <button
                type="button"
                onClick={onBackToGame}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Game</span>
              </button>
            )}
            <MonitorSmartphone className="w-5 h-5 text-amber-400 shrink-0" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-50 whitespace-nowrap">
              Art Direction Archive (6 Styles)
            </h1>
            <span className="hidden sm:inline text-xs text-stone-400 whitespace-nowrap">
              Selected: 03 Storybook Ink &amp; Wash · All 6 Preserved
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSimPaused((p) => !p)}
              aria-pressed={simPaused}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                simPaused
                  ? 'bg-stone-800 border-amber-400/70 text-amber-300'
                  : 'bg-[#0E0F13] border-white/10 text-stone-300 hover:text-white'
              }`}
            >
              {simPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{simPaused ? 'Resume Motion' : 'Freeze Frame'}</span>
            </button>

            {/* Screen Mode Switcher */}
            <div
              className="flex items-center gap-1 p-1 rounded-lg bg-[#0E0F13] border border-white/10 shrink-0"
              role="group"
              aria-label="Preview screen mode"
            >
              <button
                type="button"
                onClick={() => setScreenMode('menu')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  screenMode === 'menu'
                    ? 'bg-amber-400 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Main Menu</span>
              </button>
              <button
                type="button"
                onClick={() => setScreenMode('battle')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  screenMode === 'battle'
                    ? 'bg-amber-400 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Active Battle</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Review Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Compact Horizontal Style Switcher on Mobile (<lg) */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ART_STYLES.map((style) => {
            const isSelected = style.id === selectedStyle;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyle(style.id)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#20232B] border-amber-400 text-white'
                    : 'bg-[#17191F] border-white/10 text-stone-300'
                }`}
              >
                {style.index}. {style.title}
              </button>
            );
          })}
        </div>

        {/* Left Column on Desktop / Below Preview on Mobile: 6 Style Selector + Active Style Brief */}
        <section className="order-2 lg:order-1 lg:col-span-6 space-y-6">
          <div className="hidden lg:block">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Select Visual Direction (01 – 06)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ART_STYLES.map((style) => {
                const isSelected = style.id === selectedStyle;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    aria-pressed={isSelected}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer min-h-[74px] flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#20232B] border-amber-400 text-white'
                        : 'bg-[#17191F] border-white/10 text-stone-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-sm font-bold leading-snug">
                        {style.index}. {style.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        {style.swatches.slice(0, 3).map((hex) => (
                          <span
                            key={hex}
                            className="w-2.5 h-2.5 rounded-full border border-black/30"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-stone-400">
                      {style.subtitle} · {style.tag}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Style Specification Card */}
          <div className="p-5 rounded-xl bg-[#17191F] border border-white/10 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-stone-50">
                {activeSpec.index}. {activeSpec.title}
              </h3>
              <span className="text-xs text-amber-300 font-semibold">
                {activeSpec.subtitle} · {activeSpec.tag}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-stone-300">
              {activeSpec.summary}
            </p>

            {/* Palette Strip */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-stone-400">Palette Swatches</span>
              <div className="flex items-center gap-2">
                {activeSpec.swatches.map((hex) => (
                  <div key={hex} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded border border-white/20"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-[11px] font-mono-num text-stone-400 hidden sm:inline">
                      {hex}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Unit Archetypes Preview */}
            <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-stone-400">Melee Unit</div>
                <div className="font-semibold text-stone-100 mt-0.5">
                  {activeSpec.units.melee.name} ({activeSpec.units.melee.cost} {activeSpec.foodLabel})
                </div>
              </div>
              <div>
                <div className="text-stone-400">Ranged Unit</div>
                <div className="font-semibold text-stone-100 mt-0.5">
                  {activeSpec.units.ranged.name} ({activeSpec.units.ranged.cost} {activeSpec.foodLabel})
                </div>
              </div>
              <div>
                <div className="text-stone-400">Heavy Unit</div>
                <div className="font-semibold text-stone-100 mt-0.5">
                  {activeSpec.units.heavy.name} ({activeSpec.units.heavy.cost} {activeSpec.foodLabel})
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            Interactive portrait preview on the right: switch between Main Menu and Active Battle, tap unit cards to deploy troops, or tap Swarm to inspect 50+ simultaneous animated units.
          </p>
        </section>

        {/* Right Column on Desktop / First on Mobile: Live 9:16 Mobile Preview */}
        <section className="order-1 lg:order-2 lg:col-span-6 flex flex-col items-center justify-start">
          <MobilePreviewFrame
            styleId={selectedStyle}
            screenMode={screenMode}
            onChangeScreenMode={setScreenMode}
          />
        </section>
      </main>
    </div>
  );
}

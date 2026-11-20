import { useEffect, useState } from 'react';
import {
  AGES,
  STAGES,
  computeAllyBaseMaxHp,
  computeFoodRate,
  getBaseUpgradeCost,
  getFoodUpgradeCost,
  getTimelineAllyMult,
  getTimelineEnemyMult,
} from '../../game/content';
import type { AdOfferDescriptor } from '../../game/storage';
import type { SaveData } from '../../game/types';
import { FlorinCoinIcon } from './GameIcons';
import { Check, Crown, Lock, Palette, RotateCcw, Shield, Sparkles, TrendingUp, Volume2, VolumeX, X, Zap } from 'lucide-react';

const cardStyle = {
  backgroundColor: '#F9F3E6',
  color: '#3A2B23',
  border: '2px solid #3A2B23',
  boxShadow: '0 4px 0 #3A2B23',
};

export function ChaptersModal({
  save,
  selectedStageIdx,
  onSelectStage,
  onAdvanceTimeline,
  onClose,
}: {
  save: SaveData;
  selectedStageIdx: number;
  onSelectStage: (idx: number) => void;
  onAdvanceTimeline?: () => void;
  onClose: () => void;
}) {
  const chapters = [1, 2, 3, 4, 5];
  const timeline = Math.max(1, save.timeline || 1);
  const canShiftTimeline = save.clearedStageIds.includes('5-3') && Boolean(onAdvanceTimeline);

  return (
    <div
      className="absolute inset-0 z-40 bg-[#231914]/65 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select Chapter and Battle"
    >
      <div className="w-full max-h-[90%] flex flex-col rounded-xl p-3.5" style={cardStyle}>
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#3A2B23]/20">
          <div>
            <h2 className="font-display-serif text-lg font-extrabold leading-tight">
              Valley Chapters · Timeline {timeline}
            </h2>
            <p className="text-[11px] text-[#7D6A5C]">
              Cleared {save.clearedStageIds.length} / {STAGES.length} battles
              {timeline > 1
                ? ` · Vanguard ×${getTimelineAllyMult(timeline)} · Enemy ×${getTimelineEnemyMult(timeline)}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapters"
            className="w-8 h-8 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 overflow-y-auto space-y-2 pr-0.5">
          {chapters.map((ch) => {
            const chapterStages = STAGES.map((s, idx) => ({ s, idx })).filter(
              (item) => item.s.chapter === ch
            );
            const age = AGES[ch - 1];
            return (
              <div
                key={ch}
                className="p-2 rounded-lg border border-[#3A2B23]/25 bg-[#F2E9D5]"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="font-display-serif text-xs font-bold">
                    Ch.{ch} · {age.name}
                  </span>
                  <span className="text-[10px] font-semibold text-[#7D6A5C]">
                    3 Battles
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {chapterStages.map(({ s, idx }) => {
                    const unlocked = idx <= save.highestUnlockedStageIdx;
                    const cleared = save.clearedStageIds.includes(s.id);
                    const isCurrent = idx === selectedStageIdx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => onSelectStage(idx)}
                        className={`py-1.5 px-1 rounded-lg border-2 text-center transition-transform active:translate-y-0.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                          isCurrent
                            ? 'bg-[#C98A2C] text-[#FFFDF7] border-[#3A2B23]'
                            : cleared
                              ? 'bg-[#E1ECE8] text-[#2E6F7E] border-[#2E6F7E]'
                              : 'bg-[#F9F3E6] text-[#3A2B23] border-[#3A2B23]'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold font-mono-num">
                          {!unlocked ? (
                            <Lock className="w-2.5 h-2.5" />
                          ) : cleared ? (
                            <Check className="w-2.5 h-2.5" />
                          ) : null}
                          <span>{s.id}</span>
                        </div>
                        <div className="mt-0.5 text-[9.5px] font-semibold truncate">
                          {s.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {canShiftTimeline && onAdvanceTimeline && (
            <div className="p-2.5 rounded-lg border-2 border-[#2E6F7E] bg-[#E1ECE8] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[#2E6F7E]">
                  Timeline {timeline + 1} Ready
                </div>
                <p className="text-[10px] text-[#4C6268] leading-snug">
                  Resets chapters & era · Keeps coins & CGs · +42% Vanguard & +45% Coins
                </p>
              </div>
              <button
                type="button"
                data-testid="advance-timeline-chapters"
                onClick={onAdvanceTimeline}
                className="px-2.5 py-1.5 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-[11px] font-extrabold shrink-0 cursor-pointer"
              >
                Timeline {timeline + 1}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UpgradesModal({
  save,
  onUpgradeFood,
  onUpgradeBase,
  onEvolveAge,
  onClose,
}: {
  save: SaveData;
  onUpgradeFood: () => void;
  onUpgradeBase: () => void;
  onEvolveAge: () => void;
  onClose: () => void;
}) {
  const timeline = Math.max(1, save.timeline || 1);
  const foodCost = getFoodUpgradeCost(save.foodLevel);
  const baseCost = getBaseUpgradeCost(save.baseLevel);
  const currentAge = AGES[save.allyAgeIndex];
  const nextAge = AGES[save.allyAgeIndex + 1];
  const foodRate = computeFoodRate(STAGES[0].baseFoodRate, save.foodLevel);
  const baseHp = computeAllyBaseMaxHp(save.baseLevel, save.allyAgeIndex, timeline);
  const nextBaseHp = computeAllyBaseMaxHp(save.baseLevel + 1, save.allyAgeIndex, timeline);

  return (
    <div
      className="absolute inset-0 z-40 bg-[#231914]/65 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tribe Upgrades"
    >
      <div className="w-full rounded-xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#3A2B23]/20">
          <div>
            <h2 className="font-display-serif text-xl font-extrabold">Tribe Workshop</h2>
            <p className="text-xs text-[#7D6A5C]">
              Timeline {timeline} · {currentAge.eraTag}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm font-extrabold font-mono-num">
              <FlorinCoinIcon />
              {save.coins}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close upgrades"
              className="w-9 h-9 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Food Production Upgrade */}
        <div className="p-3 rounded-lg border border-[#3A2B23]/30 bg-[#F2E9D5] flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <TrendingUp className="w-4 h-4 text-[#2E6F7E]" />
              <span>Food Speed Lv.{save.foodLevel}</span>
            </div>
            <p className="text-xs text-[#7D6A5C] font-mono-num mt-0.5">
              +{foodRate}/s → +{(foodRate + 0.14).toFixed(2)}/s
            </p>
          </div>
          <button
            type="button"
            disabled={save.coins < foodCost}
            onClick={onUpgradeFood}
            className="px-3 py-2 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-xs font-extrabold font-mono-num flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
          >
            <FlorinCoinIcon className="w-3.5 h-3.5" />
            <span>{foodCost}</span>
          </button>
        </div>

        {/* Base Health Upgrade */}
        <div className="p-3 rounded-lg border border-[#3A2B23]/30 bg-[#F2E9D5] flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <Shield className="w-4 h-4 text-[#2E6F7E]" />
              <span>Base Health Lv.{save.baseLevel}</span>
            </div>
            <p className="text-xs text-[#7D6A5C] font-mono-num mt-0.5">
              {baseHp} HP → {nextBaseHp} HP
            </p>
          </div>
          <button
            type="button"
            disabled={save.coins < baseCost}
            onClick={onUpgradeBase}
            className="px-3 py-2 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-xs font-extrabold font-mono-num flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
          >
            <FlorinCoinIcon className="w-3.5 h-3.5" />
            <span>{baseCost}</span>
          </button>
        </div>

        {/* Age Evolution */}
        <div className="p-3 rounded-lg border-2 border-[#2E6F7E]/50 bg-[#E6EFF0] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#2E6F7E]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {nextAge ? `Evolve: ${nextAge.name}` : 'Max Age Reached'}
              </span>
            </div>
            <p className="text-xs text-[#546A70] mt-0.5">
              {nextAge
                ? `Unlocks ${nextAge.units.melee.name}, ${nextAge.units.ranged.name} & ${nextAge.units.heavy.name}`
                : 'Starlight Kin unlocked'}
            </p>
          </div>
          {nextAge && (
            <button
              type="button"
              disabled={save.coins < currentAge.evolveCost}
              onClick={onEvolveAge}
              className="px-3 py-2 rounded-lg border-2 border-[#3A2B23] bg-[#2E6F7E] text-[#FFFDF7] text-xs font-extrabold font-mono-num flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
            >
              <FlorinCoinIcon className="w-3.5 h-3.5" />
              <span>{currentAge.evolveCost}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SettingsModal({
  save,
  onToggleSound,
  onToggleHaptics,
  onToggleRemoveAds,
  onResetSave,
  onOpenArtPitch,
  onClose,
}: {
  save: SaveData;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onToggleRemoveAds: () => void;
  onResetSave: () => void;
  onOpenArtPitch: () => void;
  onClose: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      className="absolute inset-0 z-50 bg-[#231914]/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game Settings"
    >
      <div className="w-full rounded-xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#3A2B23]/20">
          <h2 className="font-display-serif text-xl font-extrabold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm">
          <button
            type="button"
            onClick={onToggleSound}
            className="w-full p-3 rounded-lg border border-[#3A2B23]/30 bg-[#F2E9D5] flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2 font-bold">
              {save.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#2E6F7E]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#7D6A5C]" />
              )}
              Sound Effects
            </span>
            <span className="text-xs font-extrabold uppercase text-[#2E6F7E]">
              {save.soundEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleHaptics}
            className="w-full p-3 rounded-lg border border-[#3A2B23]/30 bg-[#F2E9D5] flex items-center justify-between cursor-pointer"
          >
            <span className="font-bold">Vibration Feedback</span>
            <span className="text-xs font-extrabold uppercase text-[#2E6F7E]">
              {save.hapticsEnabled ? 'On' : 'Off'}
            </span>
          </button>

          {/* Store IAP Placeholder: No-Ads Pass */}
          <button
            type="button"
            data-testid="settings-remove-ads-btn"
            onClick={onToggleRemoveAds}
            className={`w-full p-3 rounded-lg border-2 flex items-center justify-between gap-2 cursor-pointer ${
              save.adsRemoved
                ? 'border-[#2E6F7E] bg-[#E1ECE8]'
                : 'border-[#3A2B23] bg-[#FFF5D9]'
            }`}
          >
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 font-extrabold text-sm">
                <Crown className="w-4 h-4 text-[#C98A2C] shrink-0" />
                <span>{save.adsRemoved ? 'No-Ads Pass Active' : 'No-Ads Pass'}</span>
              </div>
              <div className="text-[11px] text-[#6B584B] leading-snug mt-0.5">
                {save.adsRemoved
                  ? 'All breaks removed · Instant-claim Double Coins, Salvage & Surge'
                  : 'Zero breaks + instant-claim all post-battle & comeback rewards'}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded border border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-xs font-extrabold shrink-0">
              {save.adsRemoved ? 'Active' : '$2.99'}
            </span>
          </button>

          {/* Preserved Step 1 6-Style Art Pitch Gallery */}
          <button
            type="button"
            onClick={onOpenArtPitch}
            className="w-full p-3 rounded-lg border border-[#3A2B23]/30 bg-[#F2E9D5] flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2 font-bold">
              <Palette className="w-4 h-4 text-[#A4423C]" />
              Art Direction Gallery (6 Styles)
            </span>
            <span className="text-xs font-bold text-[#7D6A5C]">View</span>
          </button>

          {/* Reset Save */}
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full p-2.5 rounded-lg border border-[#A4423C]/40 text-[#A4423C] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Progress</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetSave();
                  setConfirmReset(false);
                }}
                className="flex-1 py-2 rounded-lg border-2 border-[#3A2B23] bg-[#A4423C] text-white text-xs font-extrabold cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NoAdsPassModal({
  adsRemoved,
  onToggleRemoveAds,
  onClose,
}: {
  adsRemoved: boolean;
  onToggleRemoveAds: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 bg-[#1B1410]/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="No-Ads Pass"
      data-testid="no-ads-pass-modal"
    >
      <div className="w-full rounded-xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#3A2B23]/20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display-serif text-lg font-extrabold leading-tight">
                No-Ads Pass
              </h2>
              <p className="text-[11px] text-[#7D6A5C]">
                One-time lifetime upgrade · Instant VIP claims
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close No-Ads Pass"
            className="w-8 h-8 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-left text-xs">
          <div className="p-2.5 rounded-lg border border-[#3A2B23]/25 bg-[#F2E9D5] flex items-start gap-2">
            <Zap className="w-4 h-4 text-[#C98A2C] shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-[#3A2B23]">Instant Double Victory Spoils</div>
              <div className="text-[11px] text-[#6B584B]">
                Claim 2× battle coins after every victory with one tap — zero videos.
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-[#3A2B23]/25 bg-[#F2E9D5] flex items-start gap-2">
            <Zap className="w-4 h-4 text-[#C98A2C] shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-[#3A2B23]">Instant Double Salvage &amp; Comeback Surge</div>
              <div className="text-[11px] text-[#6B584B]">
                After any tough defeat, instantly double salvaged coins and retry with +18 Food &amp; 15s ×1.5 Food Surge.
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-[#3A2B23]/25 bg-[#F2E9D5] flex items-start gap-2">
            <Shield className="w-4 h-4 text-[#2E6F7E] shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-[#3A2B23]">Zero Chapter Breaks Forever</div>
              <div className="text-[11px] text-[#6B584B]">
                Permanently disables all chapter-end interstitial ads across every Timeline.
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="purchase-no-ads-btn"
          onClick={() => {
            onToggleRemoveAds();
            if (!adsRemoved) onClose();
          }}
          className={`w-full py-3 px-4 rounded-xl border-2 border-[#3A2B23] font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_3px_0_#3A2B23] active:translate-y-0.5 ${
            adsRemoved
              ? 'bg-[#E1ECE8] text-[#2E6F7E]'
              : 'bg-[#C98A2C] text-[#FFFDF7]'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>
            {adsRemoved
              ? 'No-Ads Pass Active (Tap to Toggle Preview)'
              : 'Unlock No-Ads Pass · $2.99 (Preview)'}
          </span>
        </button>
      </div>
    </div>
  );
}

export function SimulatedAdModal({
  offer,
  onComplete,
  onUnlockNoAds,
  onCancel,
}: {
  offer: AdOfferDescriptor;
  onComplete: () => void;
  onUnlockNoAds?: () => void;
  onCancel: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(offer.kind === 'interstitial' ? 2 : 2);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 650);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  return (
    <div
      className="absolute inset-0 z-50 bg-[#1B1410]/85 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Ad SDK Placeholder"
      data-testid="simulated-ad-modal"
    >
      <div className="w-full rounded-xl p-5 text-center space-y-3.5" style={cardStyle}>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7D6A5C]">
          {offer.kind === 'rewarded' ? 'Rewarded Video Slot' : 'Interstitial Ad Slot'}
        </div>
        <h3 className="font-display-serif text-xl font-extrabold">{offer.title}</h3>
        <p className="text-sm font-semibold text-[#2E6F7E]">{offer.rewardLabel}</p>

        <div className="p-3 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/25 text-xs text-[#6B5344]">
          Simulated SDK preview (no real ad network connected in v1).
        </div>

        <div className="flex items-center gap-2 pt-1">
          {offer.kind === 'rewarded' && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] text-xs font-bold cursor-pointer"
            >
              No Thanks
            </button>
          )}
          <button
            type="button"
            disabled={secondsLeft > 0}
            onClick={onComplete}
            className="flex-1 py-2.5 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-xs font-extrabold cursor-pointer disabled:opacity-55"
          >
            {secondsLeft > 0
              ? `Ready in ${secondsLeft}s...`
              : offer.kind === 'rewarded'
                ? 'Claim Reward'
                : 'Continue'}
          </button>
        </div>

        {onUnlockNoAds && (
          <button
            type="button"
            data-testid="ad-modal-remove-ads-btn"
            onClick={onUnlockNoAds}
            className="w-full py-2 px-3 rounded-lg border border-[#C98A2C] bg-[#FFF7DF] text-[#7D4B09] text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-[#C98A2C]" />
            <span>Skip Forever · Get No-Ads Pass ($2.99) &amp; Claim Now</span>
          </button>
        )}
      </div>
    </div>
  );
}

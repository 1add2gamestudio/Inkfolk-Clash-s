import { useState } from 'react';
import {
  BATTLE_CGS,
  DEFEAT_CGS,
  VICTORY_CGS,
  type BattleCgSpec,
  type CgOutcome,
} from '../../game/cgCatalog';
import type { SaveData } from '../../game/types';
import { FlorinCoinIcon } from './GameIcons';
import {
  Award,
  CheckCircle2,
  Flame,
  Lock,
  Maximize2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';

const cardStyle = {
  backgroundColor: '#F9F3E6',
  color: '#3A2B23',
  border: '2px solid #3A2B23',
  boxShadow: '0 4px 0 #3A2B23',
};

export function CgGalleryModal({
  save,
  initialTab = 'victory',
  initialCgId,
  onClaimReward,
  onClose,
}: {
  save: SaveData;
  initialTab?: CgOutcome;
  initialCgId?: string;
  onClaimReward: (cgId: string, rewardCoins: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<CgOutcome>(initialTab);
  const [focusedCg, setFocusedCg] = useState<BattleCgSpec | null>(() => {
    // Strict lock: never allow inspecting a locked CG artwork
    if (!initialCgId || !save.unlockedCgIds.includes(initialCgId)) return null;
    return BATTLE_CGS.find((c) => c.id === initialCgId) ?? null;
  });

  const list = tab === 'victory' ? VICTORY_CGS : DEFEAT_CGS;
  const totalCount = BATTLE_CGS.length;
  const unlockedCount = save.unlockedCgIds.length;
  const claimedCount = save.claimedAchievementIds.length;

  const victoryUnlocked = VICTORY_CGS.filter((c) => save.unlockedCgIds.includes(c.id)).length;
  const defeatUnlocked = DEFEAT_CGS.filter((c) => save.unlockedCgIds.includes(c.id)).length;
  const victoryHasUnclaimed = VICTORY_CGS.some(
    (c) => save.unlockedCgIds.includes(c.id) && !save.claimedAchievementIds.includes(c.id)
  );
  const defeatHasUnclaimed = DEFEAT_CGS.some(
    (c) => save.unlockedCgIds.includes(c.id) && !save.claimedAchievementIds.includes(c.id)
  );

  const progressPct = Math.round((unlockedCount / Math.max(1, totalCount)) * 100);

  return (
    <div
      className="absolute inset-0 z-50 bg-[#231914]/78 flex items-center justify-center p-3.5"
      role="dialog"
      aria-modal="true"
      aria-label="Chronicle Achievements"
      data-testid="achievements-modal"
    >
      <div className="w-full max-h-[92%] flex flex-col rounded-xl p-3.5" style={cardStyle}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#3A2B23]/20">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#C98A2C] shrink-0" />
              <h2 className="font-display-serif text-lg font-extrabold leading-tight">
                Achievements
              </h2>
            </div>
            <p className="text-[11px] text-[#7D6A5C] mt-0.5">
              {unlockedCount}/{totalCount} Unlocked · {claimedCount}/{totalCount} Rewards Claimed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close achievements"
            className="w-8 h-8 rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completion Progress Bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-sm bg-[#E2D6BE] border border-[#3A2B23] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2E6F7E] to-[#C98A2C] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10.5px] font-extrabold font-mono-num text-[#5C493C] shrink-0">
            {progressPct}%
          </span>
        </div>

        {/* Victory / Defeat Tabs */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('victory')}
            className={`relative py-2 px-2 rounded-lg border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'victory'
                ? 'bg-[#2E6F7E] text-[#FFFDF7] border-[#3A2B23]'
                : 'bg-[#EFE5D1] text-[#3A2B23] border-[#3A2B23]/40'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>Victory ({victoryUnlocked}/3)</span>
            {victoryHasUnclaimed && (
              <span
                className="w-2 h-2 rounded-full bg-[#F5C16C] border border-[#3A2B23]"
                aria-label="Unclaimed victory reward"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('defeat')}
            className={`relative py-2 px-2 rounded-lg border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'defeat'
                ? 'bg-[#A4423C] text-[#FFFDF7] border-[#3A2B23]'
                : 'bg-[#EFE5D1] text-[#3A2B23] border-[#3A2B23]/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Defeat ({defeatUnlocked}/3)</span>
            {defeatHasUnclaimed && (
              <span
                className="w-2 h-2 rounded-full bg-[#F5C16C] border border-[#3A2B23]"
                aria-label="Unclaimed defeat reward"
              />
            )}
          </button>
        </div>

        {/* Achievement Cards List */}
        <div className="mt-2.5 overflow-y-auto space-y-2.5 pr-0.5">
          {list.map((cg) => {
            const unlocked = save.unlockedCgIds.includes(cg.id);
            const claimed = save.claimedAchievementIds.includes(cg.id);

            return (
              <div
                key={cg.id}
                data-testid={`achievement-card-${cg.id}`}
                data-unlocked={unlocked ? 'true' : 'false'}
                className={`rounded-xl border-2 overflow-hidden ${
                  unlocked
                    ? 'border-[#3A2B23] bg-[#F2E9D5]'
                    : 'border-[#3A2B23]/65 bg-[#E9DFC9]'
                }`}
              >
                {/* Top Art Slot: Strictly Sealed when Locked, Full Inspectable CG when Unlocked */}
                {unlocked ? (
                  <button
                    type="button"
                    onClick={() => setFocusedCg(cg)}
                    className="relative w-full aspect-video block overflow-hidden group cursor-pointer bg-[#E6DAC2]"
                    aria-label={`Inspect ${cg.achievementName} CG`}
                  >
                    <img
                      src={cg.imagePath}
                      alt={`${cg.slotLabel}: ${cg.title}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#231914]/82 text-[#FFFDF7] text-[10px] font-extrabold tracking-wide">
                      {cg.slotLabel}
                    </div>
                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-[#2E6F7E] text-[#FFFDF7] text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Unlocked</span>
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded bg-[#231914]/75 text-[#FFFDF7] flex items-center justify-center">
                      <Maximize2 className="w-3 h-3" />
                    </div>
                  </button>
                ) : (
                  <div
                    className="relative w-full aspect-video flex flex-col items-center justify-center px-4 text-center select-none"
                    style={{
                      background:
                        'repeating-linear-gradient(135deg, #2D231C 0px, #2D231C 10px, #261E18 10px, #261E18 20px)',
                    }}
                  >
                    {/* Brass inner seal border */}
                    <div className="absolute inset-2 rounded-lg border border-[#C98A2C]/35 pointer-events-none" />
                    <div className="absolute top-2 left-2.5 px-2 py-0.5 rounded bg-[#1A130F]/85 border border-[#C98A2C]/40 text-[#E6DAC2] text-[10px] font-extrabold tracking-wide">
                      {cg.slotLabel}
                    </div>
                    <div className="absolute top-2 right-2.5 px-2 py-0.5 rounded bg-[#3A2B23] border border-[#C98A2C]/50 text-[#E9BA58] text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Locked</span>
                    </div>

                    <div className="w-11 h-11 rounded-xl border-2 border-[#C98A2C] bg-[#3A2B23] flex items-center justify-center shadow-[0_3px_0_#1A130F]">
                      <Lock className="w-5 h-5 text-[#E9BA58]" />
                    </div>
                    <p className="mt-2 font-display-serif text-xs font-extrabold tracking-wider uppercase text-[#F2E6CE]">
                      Chronicle Sealed
                    </p>
                    <p className="mt-0.5 text-[10.5px] font-semibold text-[#C8B9A2]">
                      Trigger this ending scene in battle to reveal artwork
                    </p>
                  </div>
                )}

                {/* Bottom Details & Reward Claim Row */}
                <div className="p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display-serif text-sm font-extrabold leading-tight text-[#3A2B23]">
                        {cg.achievementName}
                      </h3>
                      {unlocked && (
                        <p className="text-[11px] font-bold text-[#2E6F7E] leading-tight mt-0.5">
                          {cg.title}
                        </p>
                      )}
                    </div>

                    {/* Reward State: Claim Button (Unlocked & Unclaimed) / Claimed Stamp / Locked Bounty */}
                    {unlocked ? (
                      claimed ? (
                        <span
                          data-testid={`claimed-badge-${cg.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#E1ECE8] border border-[#2E6F7E]/45 text-[#2E6F7E] text-[10.5px] font-extrabold shrink-0"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Claimed</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-testid={`claim-achievement-${cg.id}`}
                          onClick={() => onClaimReward(cg.id, cg.rewardCoins)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-[11px] font-extrabold font-mono-num shadow-[0_2px_0_#3A2B23] active:translate-y-0.5 cursor-pointer shrink-0"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Claim +{cg.rewardCoins}</span>
                        </button>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F9F3E6] border border-[#3A2B23]/30 text-[10.5px] font-extrabold font-mono-num text-[#7D6A5C] shrink-0">
                        <FlorinCoinIcon />
                        <span>+{cg.rewardCoins}</span>
                      </span>
                    )}
                  </div>

                  {unlocked && (
                    <p className="text-[11px] font-semibold text-[#5C493C] leading-snug">
                      {cg.caption}
                    </p>
                  )}

                  <div className="pt-1 border-t border-[#3A2B23]/15 text-[10.5px] text-[#6B584B] leading-snug">
                    <span className="font-extrabold text-[#3A2B23]">Unlock: </span>
                    {cg.triggerRule}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focused Theater Lightbox (strictly unlocked CGs only) */}
      {focusedCg && save.unlockedCgIds.includes(focusedCg.id) && (
        <div
          className="absolute inset-0 z-50 bg-[#18110D]/92 flex flex-col justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={focusedCg.title}
        >
          <div className="w-full rounded-xl overflow-hidden border-2 border-[#F9F3E6]/35 bg-[#F9F3E6] text-[#3A2B23]">
            <div className="relative aspect-video bg-[#E6DAC2]">
              <img
                src={focusedCg.imagePath}
                alt={focusedCg.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFocusedCg(null)}
                aria-label="Close CG inspection"
                className="absolute top-2 right-2 w-8 h-8 rounded-lg border-2 border-[#3A2B23] bg-[#F9F3E6] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                    focusedCg.outcome === 'victory'
                      ? 'bg-[#E1ECE8] text-[#2E6F7E]'
                      : 'bg-[#F3DFDC] text-[#A4423C]'
                  }`}
                >
                  {focusedCg.achievementName}
                </span>
                <span className="text-[10px] font-bold text-[#7D6A5C] text-right">
                  {focusedCg.slotLabel}
                </span>
              </div>
              <h3 className="font-display-serif text-lg font-extrabold leading-tight">
                {focusedCg.title}
              </h3>
              <p className="text-xs font-semibold text-[#4D3B30] leading-relaxed">
                {focusedCg.caption}
              </p>
              <div className="p-2.5 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/20 text-[11px] text-[#5F4B3E] leading-relaxed">
                <span className="font-extrabold text-[#3A2B23]">Unlock Condition: </span>
                {focusedCg.triggerRule}
              </div>

              {!save.claimedAchievementIds.includes(focusedCg.id) && (
                <button
                  type="button"
                  onClick={() => onClaimReward(focusedCg.id, focusedCg.rewardCoins)}
                  className="w-full py-2 px-3 rounded-xl border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_3px_0_#3A2B23] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Claim Achievement Reward (+{focusedCg.rewardCoins} Coins)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

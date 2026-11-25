import type { SaveData } from './types';

const SAVE_KEY = 'inkfolk_clash_save_v1';

export const DEFAULT_SAVE: SaveData = {
  timeline: 1,
  highestUnlockedStageIdx: 0,
  clearedStageIds: [],
  coins: 0,
  foodLevel: 1,
  baseLevel: 1,
  allyAgeIndex: 0,
  soundEnabled: true,
  hapticsEnabled: true,
  adsRemoved: false,
  seenGroupTip: false,
  unlockedCgIds: [],
  claimedAchievementIds: [],
};

export function loadSaveData(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const clampInt = (val: unknown, fallback: number, min: number, max?: number): number => {
      const n = Math.floor(Number(val));
      if (!Number.isFinite(n)) return fallback;
      const lower = Math.max(min, n);
      return max !== undefined ? Math.min(max, lower) : lower;
    };
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      timeline: clampInt(parsed.timeline, 1, 1),
      highestUnlockedStageIdx: clampInt(parsed.highestUnlockedStageIdx, 0, 0, 14),
      coins: clampInt(parsed.coins, 0, 0),
      foodLevel: clampInt(parsed.foodLevel, 1, 1),
      baseLevel: clampInt(parsed.baseLevel, 1, 1),
      allyAgeIndex: clampInt(parsed.allyAgeIndex, 0, 0, 4),
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      hapticsEnabled: typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : true,
      adsRemoved: typeof parsed.adsRemoved === 'boolean' ? parsed.adsRemoved : false,
      seenGroupTip: typeof parsed.seenGroupTip === 'boolean' ? parsed.seenGroupTip : false,
      clearedStageIds: Array.isArray(parsed.clearedStageIds) ? parsed.clearedStageIds : [],
      unlockedCgIds: Array.isArray(parsed.unlockedCgIds) ? parsed.unlockedCgIds : [],
      claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
        ? parsed.claimedAchievementIds
        : [],
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function advanceTimelineSave(save: SaveData): SaveData {
  return {
    ...save,
    timeline: Math.max(1, save.timeline || 1) + 1,
    highestUnlockedStageIdx: 0,
    clearedStageIds: [],
    foodLevel: 1,
    baseLevel: 1,
    allyAgeIndex: 0,
  };
}

export function writeSaveData(save: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearSaveData(): SaveData {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore
  }
  return { ...DEFAULT_SAVE };
}

// SDK Adapter Interfaces (Pre-wired placeholders for future Ad & IAP SDKs)
export type AdPlacement =
  | 'victory_double_coins'
  | 'defeat_double_coins'
  | 'defeat_bonus_food_start'
  | 'interstitial_post_battle';

export interface AdOfferDescriptor {
  placement: AdPlacement;
  title: string;
  rewardLabel: string;
  kind: 'rewarded' | 'interstitial';
}

export const AD_OFFERS: Record<AdPlacement, AdOfferDescriptor> = {
  victory_double_coins: {
    placement: 'victory_double_coins',
    title: 'Double Victory Spoils',
    rewardLabel: '+100% Bonus Coins',
    kind: 'rewarded',
  },
  defeat_double_coins: {
    placement: 'defeat_double_coins',
    title: 'Double Salvage Spoils',
    rewardLabel: '+100% Salvaged Coins for Tribe Upgrades',
    kind: 'rewarded',
  },
  defeat_bonus_food_start: {
    placement: 'defeat_bonus_food_start',
    title: 'Comeback Supply Crate',
    rewardLabel: 'Retry with +18 Food & 15s ×1.5 Food Surge',
    kind: 'rewarded',
  },
  interstitial_post_battle: {
    placement: 'interstitial_post_battle',
    title: 'Sponsored Break (Interstitial Slot)',
    rewardLabel: 'Removed permanently with No-Ads Pass',
    kind: 'interstitial',
  },
};

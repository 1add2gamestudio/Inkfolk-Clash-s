import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AGES,
  STAGES,
  computeFoodRate,
  getBaseUpgradeCost,
  getFoodUpgradeCost,
  getTimelineAllyMult,
  getTimelineCoinMult,
  getTimelineEnemyMult,
} from '../../game/content';
import {
  createBattleState,
  evolveAgeInBattle,
  seedTitleShowcase,
  stepBattle,
  summonPlayerUnit,
  upgradeBaseInBattle,
  upgradeFoodInBattle,
} from '../../game/engine';
import { renderBattleCanvas } from '../../game/renderer';
import { gameAudio } from '../../game/audio';
import { useBattleCollisionAudio } from '../../game/useBattleCollisionAudio';
import { useBattleLog } from '../../game/useBattleLog';
import { selectBattleCg, type CgOutcome } from '../../game/cgCatalog';
import {
  AD_OFFERS,
  advanceTimelineSave,
  clearSaveData,
  loadSaveData,
  writeSaveData,
  type AdOfferDescriptor,
} from '../../game/storage';
import type { BattleState, GamePhase, SaveData, UnitRole } from '../../game/types';
import {
  FlorinCoinIcon,
  InkfolkTitleLockup,
  RationBreadIcon,
  UnitBadgeSvg,
} from './GameIcons';
import { BattleLogOverlay } from './BattleLogOverlay';
import { CgGalleryModal } from './CgGalleryModal';
import {
  ChaptersModal,
  NoAdsPassModal,
  SettingsModal,
  SimulatedAdModal,
  UpgradesModal,
} from './StageAndUpgradeModals';
import {
  BookOpen,
  Crown,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  TrendingUp,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

interface InkfolkGameProps {
  onOpenArtPitch: () => void;
}

const panelFrame = {
  backgroundColor: '#F9F3E6',
  color: '#3A2B23',
  border: '2px solid #3A2B23',
  boxShadow: '0 3px 0 #3A2B23',
};

export function InkfolkGame({ onOpenArtPitch }: InkfolkGameProps) {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(() =>
    Math.min(STAGES.length - 1, loadSaveData().highestUnlockedStageIdx)
  );
  const [phase, setPhase] = useState<GamePhase>('title');
  const [activeSubModal, setActiveSubModal] = useState<
    'none' | 'chapters' | 'upgrades' | 'settings' | 'cgs' | 'noads'
  >('none');
  const [cgGalleryTab, setCgGalleryTab] = useState<CgOutcome>('victory');
  const [cgGalleryFocusId, setCgGalleryFocusId] = useState<string | undefined>(undefined);
  const [pendingAd, setPendingAd] = useState<{
    offer: AdOfferDescriptor;
    onClaim: () => void;
  } | null>(null);
  const [claimedRunRewardAd, setClaimedRunRewardAd] = useState(false);
  const [claimedSalvageAd, setClaimedSalvageAd] = useState(false);
  const [newlyUnlockedCgId, setNewlyUnlockedCgId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const foodBarRef = useRef<HTMLDivElement | null>(null);
  const waveBarRef = useRef<HTMLDivElement | null>(null);
  const waveMarkerRef = useRef<HTMLDivElement | null>(null);
  const battleRef = useRef<BattleState>(
    createBattleState(STAGES[selectedStageIdx], loadSaveData(), 0)
  );
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;
  const selectedStageIdxRef = useRef<number>(selectedStageIdx);
  selectedStageIdxRef.current = selectedStageIdx;

  const [hud, setHud] = useState(() => ({
    timeline: battleRef.current.timeline,
    food: Math.floor(battleRef.current.food),
    maxFood: battleRef.current.maxFood,
    openingSurgeTimer: 0,
    foodRate: computeFoodRate(STAGES[selectedStageIdx].baseFoodRate, save.foodLevel),
    coins: save.coins,
    foodLevel: save.foodLevel,
    baseLevel: save.baseLevel,
    allyAgeIndex: save.allyAgeIndex,
    speed: 1 as 1 | 2,
    unitsDeployed: 0,
    enemiesDefeated: 0,
    coinsEarned: 0,
    allyBaseHp: battleRef.current.allyBaseHp,
    allyBaseMaxHp: battleRef.current.allyBaseMaxHp,
    enemyBaseHp: battleRef.current.enemyBaseHp,
    enemyBaseMaxHp: battleRef.current.enemyBaseMaxHp,
    clearTime: 0,
    waveProgress: 0,
    hugeWaveFlags: battleRef.current.hugeWaveFlags,
    hugeWavesTriggered: 0,
    incomingWaveIndex: 0,
    incomingWaveTitle: '',
    incomingWaveCountdown: 0,
    incomingWavePct: 0,
    incomingWaveComp: { melee: 0, ranged: 0, heavy: 0 },
    activeWaveBannerIndex: 0,
    activeWaveBannerTitle: '',
    activeWaveBannerComp: { melee: 0, ranged: 0, heavy: 0 },
    allWavesDeployed: false,
    finalChargeActive: false,
  }));

  const [dismissedTip, setDismissedTip] = useState(false);

  const {
    handleCollision: handleBattleCollision,
    reset: resetBattleCollisionAudio,
  } = useBattleCollisionAudio({
    enabled: save.soundEnabled,
    isPlaying: phase === 'playing',
  });
  const handleBattleCollisionRef = useRef(handleBattleCollision);
  handleBattleCollisionRef.current = handleBattleCollision;

  const {
    entries: battleLogEntries,
    resetLog: resetBattleLog,
    recordSoundEvent: recordBattleLogSound,
    recordCollisionEvent: recordBattleLogCollision,
    recordStepChecks: recordBattleLogStepChecks,
  } = useBattleLog();
  const recordBattleLogSoundRef = useRef(recordBattleLogSound);
  recordBattleLogSoundRef.current = recordBattleLogSound;
  const recordBattleLogCollisionRef = useRef(recordBattleLogCollision);
  recordBattleLogCollisionRef.current = recordBattleLogCollision;
  const recordBattleLogStepChecksRef = useRef(recordBattleLogStepChecks);
  recordBattleLogStepChecksRef.current = recordBattleLogStepChecks;

  // Sync audio preferences
  useEffect(() => {
    gameAudio.setPreferences(save.soundEnabled, save.hapticsEnabled);
    writeSaveData(save);
  }, [save]);

  // Expose state to document.body for clean game shell & testability; stop vibration on pause/exit
  useEffect(() => {
    const bodyState =
      phase === 'victory' || phase === 'defeat' ? 'gameover' : phase;
    document.body.dataset.state = bodyState;
    if (phase !== 'playing') {
      gameAudio.stopVibration();
    }
  }, [phase]);

  const syncHudFromBattle = useCallback((b: BattleState) => {
    setHud({
      timeline: b.timeline,
      food: Math.floor(b.food),
      maxFood: b.maxFood,
      openingSurgeTimer: Math.ceil(b.openingSurgeTimer),
      foodRate: Number(
        (
          computeFoodRate(b.stage.baseFoodRate, b.foodLevel) *
          (b.openingSurgeTimer > 0 ? 1.5 : 1)
        ).toFixed(2)
      ),
      coins: b.coins,
      foodLevel: b.foodLevel,
      baseLevel: b.baseLevel,
      allyAgeIndex: b.allyAgeIndex,
      speed: b.speedMultiplier,
      unitsDeployed: b.unitsDeployed,
      enemiesDefeated: b.enemiesDefeated,
      coinsEarned: b.coinsEarnedThisRun,
      allyBaseHp: Math.ceil(b.allyBaseHp),
      allyBaseMaxHp: b.allyBaseMaxHp,
      enemyBaseHp: Math.ceil(b.enemyBaseHp),
      enemyBaseMaxHp: b.enemyBaseMaxHp,
      clearTime: Math.round(b.time),
      waveProgress: b.waveProgress,
      hugeWaveFlags: b.hugeWaveFlags,
      hugeWavesTriggered: b.hugeWavesTriggered,
      incomingWaveIndex: b.incomingHugeWave?.index ?? 0,
      incomingWaveTitle: b.incomingHugeWave?.title ?? '',
      incomingWaveCountdown: b.incomingHugeWave ? Math.ceil(b.incomingHugeWave.countdown) : 0,
      incomingWavePct: b.incomingHugeWave
        ? Math.max(0, Math.min(100, (b.incomingHugeWave.countdown / b.incomingHugeWave.duration) * 100))
        : 0,
      incomingWaveComp: b.incomingHugeWave?.composition ?? { melee: 0, ranged: 0, heavy: 0 },
      activeWaveBannerIndex: b.activeHugeWaveBanner?.index ?? 0,
      activeWaveBannerTitle: b.activeHugeWaveBanner?.title ?? '',
      activeWaveBannerComp: b.activeHugeWaveBanner?.composition ?? { melee: 0, ranged: 0, heavy: 0 },
      allWavesDeployed: b.allWavesDeployed,
      finalChargeActive: b.finalChargeActive,
    });
  }, []);

  const persistBattleProgressToSave = useCallback(
    (b: BattleState, won: boolean, outcomeResolved = false) => {
      const earnedCgId = outcomeResolved
        ? selectBattleCg(won ? 'victory' : 'defeat', {
            stageChapter: b.stage.chapter,
            allyAgeIndex: b.allyAgeIndex,
            unitsDeployed: b.unitsDeployed,
            enemyBaseHpRatio: b.enemyBaseHp / Math.max(1, b.enemyBaseMaxHp),
            clearTime: Math.round(b.time),
          }).id
        : null;

      setSave((prev) => {
        const nextCleared = won && !prev.clearedStageIds.includes(b.stage.id)
          ? [...prev.clearedStageIds, b.stage.id]
          : prev.clearedStageIds;
        const stageIdx = STAGES.findIndex((s) => s.id === b.stage.id);
        const nextUnlocked = won
          ? Math.min(STAGES.length - 1, Math.max(prev.highestUnlockedStageIdx, stageIdx + 1))
          : prev.highestUnlockedStageIdx;
        const isFirstUnlock = Boolean(earnedCgId && !prev.unlockedCgIds.includes(earnedCgId));
        if (isFirstUnlock && earnedCgId) {
          setNewlyUnlockedCgId(earnedCgId);
        }
        const nextCgIds =
          isFirstUnlock && earnedCgId
            ? [...prev.unlockedCgIds, earnedCgId]
            : prev.unlockedCgIds;
        return {
          ...prev,
          coins: b.coins,
          foodLevel: b.foodLevel,
          baseLevel: b.baseLevel,
          allyAgeIndex: b.allyAgeIndex,
          clearedStageIds: nextCleared,
          highestUnlockedStageIdx: nextUnlocked,
          seenGroupTip: prev.seenGroupTip || b.unitsDeployed >= 3,
          unlockedCgIds: nextCgIds,
        };
      });
    },
    []
  );

  const startBattleForStage = useCallback(
    (stageIdx: number, extraFood = 0, saveOverride?: SaveData, openingSurgeSeconds = 0) => {
      const stage = STAGES[Math.max(0, Math.min(STAGES.length - 1, stageIdx))];
      const activeSave = saveOverride ?? saveRef.current;
      setSelectedStageIdx(stageIdx);
      const nextBattle = createBattleState(stage, activeSave, extraFood, openingSurgeSeconds);
      battleRef.current = nextBattle;
      resetBattleCollisionAudio();
      resetBattleLog('Battle Started', `${stage.id} · ${stage.title}`);
      setClaimedRunRewardAd(false);
      setClaimedSalvageAd(false);
      setNewlyUnlockedCgId(null);
      setDismissedTip(false);
      setActiveSubModal('none');
      phaseRef.current = 'playing';
      setPhase('playing');
      syncHudFromBattle(nextBattle);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    [resetBattleCollisionAudio, resetBattleLog, syncHudFromBattle]
  );

  // Support ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startBattleForStage(selectedStageIdxRef.current, 0);
    }
  }, [startBattleForStage]);

  // Keyboard shortcuts: Enter/Space to Start from Title, Esc/P to Pause/Resume
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === 'title' && activeSubModal === 'none') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startBattleForStage(selectedStageIdxRef.current, 0);
        }
      } else if (phaseRef.current === 'playing') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setPhase('paused');
        }
      } else if (phaseRef.current === 'paused') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setPhase('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSubModal, startBattleForStage]);

  // Isolated 60fps Canvas Loop (mounts once; Title ambient clash + Active Battle simulation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freezeStatic = new URLSearchParams(window.location.search).get('freeze') === '1';

    let rafId = 0;
    let yieldTimer: number | null = null;
    let disposed = false;
    let lastTime = performance.now();
    let hudTick = 0;

    const isAutostart = new URLSearchParams(window.location.search).get('autostart') === '1';

    // Seed ambient title battle preview when on Title screen
    if (!isAutostart && phaseRef.current === 'title' && battleRef.current.units.length === 0) {
      seedTitleShowcase(battleRef.current);
    }

    const drawCanvasFrame = () => {
      const b = battleRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cssW = canvas.clientWidth || 360;
      const cssH = canvas.clientHeight || 640;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      renderBattleCanvas(ctx, b, cssW, cssH);
      ctx.restore();

      if (foodBarRef.current) {
        const pct = Math.min(100, (b.food / b.maxFood) * 100);
        foodBarRef.current.style.width = `${pct.toFixed(1)}%`;
      }
      if (waveBarRef.current) {
        const wavePct = Math.min(100, b.waveProgress * 100);
        waveBarRef.current.style.width = `${wavePct.toFixed(1)}%`;
        if (waveMarkerRef.current) {
          waveMarkerRef.current.style.left = `${wavePct.toFixed(1)}%`;
        }
      }
    };

    const tick = (now: number) => {
      if (disposed) return;
      const frameStart = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const curPhase = phaseRef.current;
      const b = battleRef.current;

      if (curPhase === 'title') {
        if (
          b.food >= 8 &&
          b.units.filter((u) => u.faction === 'ally' && u.state !== 'die').length < 4
        ) {
          summonPlayerUnit(b, b.unitsDeployed % 2 === 0 ? 'melee' : 'ranged');
        }
        stepBattle(b, rawDt);
        if (b.phase !== 'playing') {
          const fresh = createBattleState(
            STAGES[selectedStageIdxRef.current],
            saveRef.current,
            0
          );
          seedTitleShowcase(fresh);
          battleRef.current = fresh;
        }
      } else if (curPhase === 'playing') {
        const prevBattlePhase = b.phase;
        stepBattle(
          b,
          rawDt,
          (ev) => {
            gameAudio.trigger(ev);
            recordBattleLogSoundRef.current(ev, b);
          },
          (col) => {
            handleBattleCollisionRef.current(col);
            recordBattleLogCollisionRef.current(col, b.time);
          }
        );
        recordBattleLogStepChecksRef.current(b);

        if (b.phase === 'victory' && prevBattlePhase === 'playing') {
          persistBattleProgressToSave(b, true, true);
          syncHudFromBattle(b);
        } else if (b.phase === 'defeat' && prevBattlePhase === 'playing') {
          persistBattleProgressToSave(b, false, true);
          syncHudFromBattle(b);
        } else if (b.phase !== 'playing' && b.endBeatTimer <= 0) {
          phaseRef.current = b.phase;
          setPhase(b.phase);
          syncHudFromBattle(b);
        }
      }

      drawCanvasFrame();

      hudTick += rawDt;
      if (hudTick >= 0.12 && curPhase === 'playing') {
        hudTick = 0;
        const nextFood = Math.floor(b.food);
        const nextSurgeSec = Math.ceil(b.openingSurgeTimer);
        const nextWaveIdx = b.incomingHugeWave?.index ?? 0;
        const nextWaveCd = b.incomingHugeWave ? Math.ceil(b.incomingHugeWave.countdown) : 0;
        const nextWavePct = b.incomingHugeWave
          ? Math.round((b.incomingHugeWave.countdown / b.incomingHugeWave.duration) * 100)
          : 0;
        const nextActiveIdx = b.activeHugeWaveBanner?.index ?? 0;
        setHud((prev) => {
          if (
            prev.food === nextFood &&
            prev.openingSurgeTimer === nextSurgeSec &&
            prev.coins === b.coins &&
            prev.allyBaseHp === Math.ceil(b.allyBaseHp) &&
            prev.enemyBaseHp === Math.ceil(b.enemyBaseHp) &&
            prev.allyAgeIndex === b.allyAgeIndex &&
            prev.foodLevel === b.foodLevel &&
            prev.baseLevel === b.baseLevel &&
            prev.hugeWavesTriggered === b.hugeWavesTriggered &&
            prev.incomingWaveIndex === nextWaveIdx &&
            prev.incomingWaveCountdown === nextWaveCd &&
            prev.incomingWavePct === nextWavePct &&
            prev.activeWaveBannerIndex === nextActiveIdx &&
            prev.allWavesDeployed === b.allWavesDeployed &&
            prev.finalChargeActive === b.finalChargeActive
          ) {
            return prev;
          }
          return {
            timeline: b.timeline,
            food: nextFood,
            maxFood: b.maxFood,
            openingSurgeTimer: nextSurgeSec,
            foodRate: Number(
              (
                computeFoodRate(b.stage.baseFoodRate, b.foodLevel) *
                (b.openingSurgeTimer > 0 ? 1.5 : 1)
              ).toFixed(2)
            ),
            coins: b.coins,
            foodLevel: b.foodLevel,
            baseLevel: b.baseLevel,
            allyAgeIndex: b.allyAgeIndex,
            speed: b.speedMultiplier,
            unitsDeployed: b.unitsDeployed,
            enemiesDefeated: b.enemiesDefeated,
            coinsEarned: b.coinsEarnedThisRun,
            allyBaseHp: Math.ceil(b.allyBaseHp),
            allyBaseMaxHp: b.allyBaseMaxHp,
            enemyBaseHp: Math.ceil(b.enemyBaseHp),
            enemyBaseMaxHp: b.enemyBaseMaxHp,
            clearTime: Math.round(b.time),
            waveProgress: b.waveProgress,
            hugeWaveFlags: b.hugeWaveFlags,
            hugeWavesTriggered: b.hugeWavesTriggered,
            incomingWaveIndex: nextWaveIdx,
            incomingWaveTitle: b.incomingHugeWave?.title ?? '',
            incomingWaveCountdown: nextWaveCd,
            incomingWavePct: nextWavePct,
            incomingWaveComp: b.incomingHugeWave?.composition ?? { melee: 0, ranged: 0, heavy: 0 },
            activeWaveBannerIndex: nextActiveIdx,
            activeWaveBannerTitle: b.activeHugeWaveBanner?.title ?? '',
            activeWaveBannerComp: b.activeHugeWaveBanner?.composition ?? { melee: 0, ranged: 0, heavy: 0 },
            allWavesDeployed: b.allWavesDeployed,
            finalChargeActive: b.finalChargeActive,
          };
        });
      }

      if (!freezeStatic) {
        const costMs = performance.now() - frameStart;
        if (costMs > 10) {
          yieldTimer = window.setTimeout(() => {
            if (!disposed) rafId = requestAnimationFrame(tick);
          }, 10);
        } else {
          rafId = requestAnimationFrame(tick);
        }
      }
    };

    drawCanvasFrame();
    if (!freezeStatic) {
      rafId = requestAnimationFrame(tick);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (yieldTimer !== null) clearTimeout(yieldTimer);
    };
  }, [persistBattleProgressToSave, syncHudFromBattle]);

  // Handlers inside Active Battle
  const handleSummon = (role: UnitRole) => {
    const b = battleRef.current;
    if (
      summonPlayerUnit(b, role, (ev) => {
        gameAudio.trigger(ev);
        recordBattleLogSound(ev, b);
      })
    ) {
      syncHudFromBattle(b);
    }
  };

  const handleBattleFoodUpgrade = () => {
    const b = battleRef.current;
    if (upgradeFoodInBattle(b, (ev) => gameAudio.trigger(ev))) {
      persistBattleProgressToSave(b, false);
      syncHudFromBattle(b);
    }
  };

  const handleBattleBaseUpgrade = () => {
    const b = battleRef.current;
    if (upgradeBaseInBattle(b, (ev) => gameAudio.trigger(ev))) {
      persistBattleProgressToSave(b, false);
      syncHudFromBattle(b);
    }
  };

  const handleBattleEvolveAge = () => {
    const b = battleRef.current;
    if (
      evolveAgeInBattle(b, (ev) => {
        gameAudio.trigger(ev);
        recordBattleLogSound(ev, b);
      })
    ) {
      persistBattleProgressToSave(b, false);
      syncHudFromBattle(b);
    }
  };

  const handleToggleSpeed = () => {
    const b = battleRef.current;
    b.speedMultiplier = b.speedMultiplier === 1 ? 2 : 1;
    syncHudFromBattle(b);
  };

  const currentStage = STAGES[selectedStageIdx];
  const currentAge = AGES[Math.min(AGES.length - 1, hud.allyAgeIndex)];
  const nextAge = AGES[hud.allyAgeIndex + 1];
  const foodUpCost = getFoodUpgradeCost(hud.foodLevel);
  const baseUpCost = getBaseUpgradeCost(hud.baseLevel);
  const showGroupTip =
    phase === 'playing' &&
    currentStage.id === '1-1' &&
    !save.seenGroupTip &&
    !dismissedTip &&
    hud.unitsDeployed < 2;

  const activeResultCg =
    phase === 'victory' || phase === 'defeat'
      ? selectBattleCg(phase, {
          stageChapter: currentStage.chapter,
          allyAgeIndex: hud.allyAgeIndex,
          unitsDeployed: hud.unitsDeployed,
          enemyBaseHpRatio: hud.enemyBaseHp / Math.max(1, hud.enemyBaseMaxHp),
          clearTime: hud.clearTime,
        })
      : null;

  const unclaimedAchievementCount = save.unlockedCgIds.filter(
    (id) => !save.claimedAchievementIds.includes(id)
  ).length;

  const openCgGallery = (tab: CgOutcome, focusId?: string) => {
    setCgGalleryTab(tab);
    setCgGalleryFocusId(focusId);
    setActiveSubModal('cgs');
  };

  const handleClaimAchievementReward = (cgId: string, rewardCoins: number) => {
    const cur = saveRef.current;
    if (!cur.unlockedCgIds.includes(cgId) || cur.claimedAchievementIds.includes(cgId)) {
      return;
    }
    gameAudio.trigger('upgrade');
    battleRef.current.coins += rewardCoins;
    setSave((prev) => {
      if (!prev.unlockedCgIds.includes(cgId) || prev.claimedAchievementIds.includes(cgId)) {
        return prev;
      }
      return {
        ...prev,
        coins: prev.coins + rewardCoins,
        claimedAchievementIds: [...prev.claimedAchievementIds, cgId],
      };
    });
    setHud((prev) => ({
      ...prev,
      coins: prev.coins + rewardCoins,
    }));
  };

  const handleAdvanceTimeline = () => {
    const nextSave = advanceTimelineSave(saveRef.current);
    saveRef.current = nextSave;
    setSave(nextSave);
    gameAudio.trigger('evolve');

    const launchTimeline = () => startBattleForStage(0, 0, nextSave);

    if (!nextSave.adsRemoved && phase === 'victory' && currentStage.battle === 3) {
      setPendingAd({
        offer: AD_OFFERS.interstitial_post_battle,
        onClaim: () => {
          setPendingAd(null);
          launchTimeline();
        },
      });
    } else {
      launchTimeline();
    }
  };

  const handleContinueNextStage = () => {
    if (selectedStageIdx >= STAGES.length - 1) {
      handleAdvanceTimeline();
      return;
    }

    const nextIdx = selectedStageIdx + 1;
    const launchNext = () => startBattleForStage(nextIdx, 0);

    // Interstitial ad slot at natural Chapter-end transitions (unless Remove Ads purchased)
    if (!save.adsRemoved && currentStage.battle === 3) {
      setPendingAd({
        offer: AD_OFFERS.interstitial_post_battle,
        onClaim: () => {
          setPendingAd(null);
          launchNext();
        },
      });
    } else {
      launchNext();
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#1C1612] flex items-center justify-center sm:p-4">
      {/* Vertical Portrait Mobile Shell */}
      <div className="relative w-full max-w-[430px] h-dvh sm:h-[780px] sm:max-h-[92dvh] sm:rounded-[32px] sm:border-[6px] sm:border-[#2E241E] bg-[#F3ECE0] shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden select-none">
        {/* Live 60fps Watercolor Canvas */}
        <canvas
          ref={canvasRef}
          data-testid="inkfolk-battle-canvas"
          className="absolute inset-0 w-full h-full block"
        />

        {/* TITLE SCREEN */}
        {phase === 'title' && (
          <div
            data-testid="title-screen"
            className="absolute inset-0 z-20 flex flex-col justify-between p-5 pt-7"
            style={{
              background:
                'linear-gradient(180deg, rgba(249,243,230,0.65) 0%, rgba(249,243,230,0.08) 45%, rgba(58,43,35,0.08) 70%, rgba(58,43,35,0.45) 100%)',
            }}
          >
            {/* Top Utility Row */}
            <div className="flex items-center justify-between gap-2">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-extrabold font-mono-num"
                style={panelFrame}
              >
                <FlorinCoinIcon />
                <span>{save.coins}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="title-no-ads-btn"
                  onClick={() => setActiveSubModal('noads')}
                  aria-label="No-Ads Pass"
                  className="h-10 px-2.5 rounded-lg flex items-center gap-1 text-xs font-extrabold cursor-pointer"
                  style={{
                    ...panelFrame,
                    backgroundColor: save.adsRemoved ? '#E1ECE8' : '#FFF5D9',
                    color: save.adsRemoved ? '#2E6F7E' : '#7D4B09',
                  }}
                >
                  <Crown className="w-3.5 h-3.5 text-[#C98A2C] shrink-0" />
                  <span>{save.adsRemoved ? 'VIP' : 'No-Ads'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSave((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
                  }
                  aria-label="Toggle Sound"
                  className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer"
                  style={panelFrame}
                >
                  {save.soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-[#7D6A5C]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubModal('settings')}
                  aria-label="Settings"
                  className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer"
                  style={panelFrame}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Upper Sky Title Lockup & Tribe Status */}
            <div className="mt-2 mb-auto text-center space-y-2">
              <InkfolkTitleLockup />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F9F3E6]/90 border border-[#3A2B23]/40 text-xs font-bold text-[#3A2B23]">
                <span className="text-[#2E6F7E] font-extrabold">TL {save.timeline}</span>
                <span aria-hidden="true">·</span>
                <span>{AGES[save.allyAgeIndex].eraTag}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {currentStage.id}
                </span>
              </div>
            </div>

            {/* Bottom Primary CTAs */}
            <div className="space-y-2.5 pb-1">
              <button
                type="button"
                data-start="true"
                onClick={() => startBattleForStage(selectedStageIdx, 0)}
                className="w-full py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 text-base font-extrabold tracking-wide transition-transform active:translate-y-0.5 cursor-pointer"
                style={{
                  backgroundColor: '#C98A2C',
                  color: '#FFFDF7',
                  border: '2px solid #3A2B23',
                  boxShadow: '0 4px 0 #3A2B23',
                }}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Battle ({currentStage.id})</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubModal('chapters')}
                  className="py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-transform active:translate-y-0.5 cursor-pointer"
                  style={panelFrame}
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#2E6F7E] shrink-0" />
                  <span>Chapters</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubModal('upgrades')}
                  className="py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-transform active:translate-y-0.5 cursor-pointer"
                  style={panelFrame}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#A4423C] shrink-0" />
                  <span>Upgrades</span>
                </button>
                <button
                  type="button"
                  data-testid="open-achievements-btn"
                  onClick={() => openCgGallery('victory')}
                  className="relative py-2.5 px-1.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold transition-transform active:translate-y-0.5 cursor-pointer"
                  style={panelFrame}
                >
                  <Trophy className="w-3.5 h-3.5 text-[#C98A2C] shrink-0" />
                  <span className="truncate">Awards {save.unlockedCgIds.length}/6</span>
                  {unclaimedAchievementCount > 0 && (
                    <span
                      data-testid="achievements-unclaimed-dot"
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C98A2C] border-2 border-[#3A2B23] text-[#FFFDF7] text-[9.5px] font-extrabold font-mono-num flex items-center justify-center animate-pulse"
                      aria-label={`${unclaimedAchievementCount} unclaimed achievement rewards`}
                    >
                      {unclaimedAchievementCount}
                    </span>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] font-semibold text-[#F9F3E6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                Rally Royal Vanguards · Each knight cleaves enemy hordes · Enter to start
              </p>
            </div>
          </div>
        )}

        {/* ACTIVE BATTLE HUD */}
        {(phase === 'playing' || phase === 'paused') && (
          <div
            data-testid="battle-hud"
            className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 pt-4"
          >
            {/* Top HUD Row */}
            <div className="space-y-2">
              <div className="pointer-events-auto flex items-center justify-between gap-2">
                <div
                  className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-extrabold font-mono-num"
                  style={panelFrame}
                >
                  <FlorinCoinIcon />
                  <span data-testid="hud-coins">{hud.coins}</span>
                </div>

                <div
                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide truncate max-w-[175px]"
                  style={panelFrame}
                >
                  TL{hud.timeline} · {currentStage.id} · {currentStage.title}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleSpeed}
                    aria-label="Toggle battle speed"
                    className="h-9 px-2.5 rounded-lg text-xs font-extrabold font-mono-num cursor-pointer"
                    style={{
                      ...panelFrame,
                      backgroundColor: hud.speed === 2 ? '#C98A2C' : '#F9F3E6',
                      color: hud.speed === 2 ? '#FFFDF7' : '#3A2B23',
                    }}
                  >
                    {hud.speed}x
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('paused')}
                    aria-label="Pause Battle"
                    className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer"
                    style={panelFrame}
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2B PvZ-Style 3-Wave Progress Bar */}
              <div
                data-testid="wave-progress-bar"
                className="mx-auto max-w-[356px] px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'rgba(249, 243, 230, 0.92)',
                  color: '#3A2B23',
                  border: '1.5px solid #3A2B23',
                  boxShadow: '0 2px 0 rgba(58,43,35,0.85)',
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-extrabold leading-none mb-1.5">
                  <span className="uppercase tracking-wider text-[#5C493C]">
                    {hud.finalChargeActive
                      ? 'FINAL CHARGE · +80% SPD · +50% SIEGE'
                      : hud.incomingWaveIndex > 0
                        ? `Wave ${hud.incomingWaveIndex}/3 · ${hud.incomingWaveTitle}`
                        : hud.activeWaveBannerIndex > 0
                          ? `Wave ${hud.activeWaveBannerIndex}/3 · ${hud.activeWaveBannerTitle}`
                          : hud.allWavesDeployed
                            ? 'Wave 3/3 · All Waves Deployed'
                            : `Wave ${hud.hugeWavesTriggered}/3 · Horde Advance`}
                  </span>
                  <span
                    className={`font-mono-num ${
                      hud.finalChargeActive ? 'text-[#B46B17]' : 'text-[#A4423C]'
                    }`}
                  >
                    {hud.finalChargeActive ? 'CHARGE!' : `${hud.hugeWavesTriggered}/3 Flags`}
                  </span>
                </div>

                <div className="relative h-2.5 rounded-full bg-[#E6DAC2] border border-[#3A2B23] overflow-visible">
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div
                      ref={waveBarRef}
                      className={`h-full ${
                        hud.finalChargeActive
                          ? 'bg-gradient-to-r from-[#2E6F7E] to-[#E9BA58]'
                          : 'bg-gradient-to-r from-[#C98A2C] to-[#A4423C]'
                      }`}
                      style={{
                        width: `${Math.min(100, hud.waveProgress * 100).toFixed(1)}%`,
                      }}
                    />
                  </div>

                  {/* 3 Crimson Wave Flags (Vanguard Surge, Warband Onslaught, Final Siege) */}
                  {hud.hugeWaveFlags.map((flagPos, idx) => {
                    const waveNum = idx + 1;
                    const triggered = hud.hugeWavesTriggered >= waveNum;
                    const approaching = hud.incomingWaveIndex === waveNum;
                    const clampedPct = Math.min(97, Math.max(8, flagPos * 100));
                    return (
                      <div
                        key={waveNum}
                        style={{ left: `${clampedPct}%` }}
                        className={`absolute top-1/2 -translate-x-1/2 -translate-y-[68%] transition-transform ${
                          approaching ? 'scale-125' : ''
                        }`}
                      >
                        <svg width="12" height="15" viewBox="0 0 12 15" aria-hidden="true">
                          <line
                            x1="3"
                            y1="1"
                            x2="3"
                            y2="14"
                            stroke="#3A2B23"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M3.5 1.5 L11.5 4.2 L3.5 7 Z"
                            fill={triggered ? '#C98A2C' : approaching ? '#E11D48' : '#A4423C'}
                            stroke="#3A2B23"
                            strokeWidth="1.1"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    );
                  })}

                  {/* Advancing Horde Marker */}
                  <div
                    ref={waveMarkerRef}
                    style={{ left: `${Math.min(100, hud.waveProgress * 100).toFixed(1)}%` }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[1.5px] border-[#3A2B23] shadow-sm flex items-center justify-center ${
                      hud.finalChargeActive ? 'bg-[#C98A2C]' : 'bg-[#A4423C]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFFDF7]" />
                  </div>
                </div>
              </div>

              {/* 2B Upper-Sky Ink-Stamp Countdown & Huge Wave Callout / C1 Final Charge Banner */}
              {hud.finalChargeActive ? (
                <div
                  data-testid="final-charge-banner"
                  className="mx-auto max-w-[336px] px-3 py-1.5 rounded-xl flex items-center justify-between gap-2.5"
                  style={{
                    backgroundColor: '#FFF7DF',
                    color: '#3A2B23',
                    border: '2px solid #C98A2C',
                    boxShadow: '0 3px 0 #3A2B23',
                  }}
                >
                  <div className="min-w-0 text-left">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#B46B17]">
                      All 3 Waves Cleared · Final Charge!
                    </div>
                    <div className="font-display-serif text-sm font-black leading-tight text-[#3A2B23]">
                      BREAK THE ENEMY BASE!
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded-lg border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] font-mono-num font-black text-[11px] shrink-0">
                    +80% SPD
                  </div>
                </div>
              ) : (
                (hud.incomingWaveIndex > 0 || hud.activeWaveBannerIndex > 0) && (() => {
                  const isIncoming = hud.incomingWaveIndex > 0;
                  const comp = isIncoming ? hud.incomingWaveComp : hud.activeWaveBannerComp;
                  return (
                    <div
                      data-testid="huge-wave-banner"
                      className="mx-auto max-w-[346px] rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: isIncoming ? '#1E252C' : '#2A221B',
                        color: '#FAF3E6',
                        border: '2px solid #C98A2C',
                        boxShadow: '0 4px 0 #1A1512, 0 6px 18px rgba(20, 28, 36, 0.42)',
                      }}
                    >
                      <div className="px-3 py-2 flex items-center justify-between gap-2.5">
                        <div className="min-w-0 text-left">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#E9BA58]">
                            {isIncoming
                              ? `Warhorn · Wave ${hud.incomingWaveIndex} of 3 · ${hud.incomingWaveTitle}`
                              : `Wave ${hud.activeWaveBannerIndex} Unleashed!`}
                          </div>
                          <div className="font-display-serif text-[14px] font-black leading-tight text-[#FFFDF7] tracking-wide">
                            {isIncoming
                              ? 'A HUGE WAVE IS APPROACHING!'
                              : `${hud.activeWaveBannerTitle.toUpperCase()}!`}
                          </div>
                        </div>
                        <div
                          className={`w-9 h-9 rounded-lg border-2 border-[#FFF1D6]/85 bg-[#C98A2C] text-[#1E1712] font-mono-num font-black text-base flex items-center justify-center shrink-0 ${
                            isIncoming ? 'animate-pulse' : ''
                          }`}
                          aria-label="Wave countdown"
                        >
                          {isIncoming ? hud.incomingWaveCountdown : '!'}
                        </div>
                      </div>

                      {/* T2 Enemy Troop Composition Scout Row */}
                      <div
                        data-testid="huge-wave-composition"
                        className="px-3 py-1.5 bg-[#151B21]/90 border-t border-[#C98A2C]/45 flex items-center justify-between gap-2"
                      >
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#C6BBA8] shrink-0">
                          Scouted
                        </span>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {comp.heavy > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#A4423C] border border-[#F5C16C]/90 text-[10.5px] font-extrabold font-mono-num text-[#FFF8E7] shadow-sm">
                              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                                <rect
                                  x="2"
                                  y="1.5"
                                  width="8"
                                  height="4"
                                  rx="1"
                                  fill="#F5C16C"
                                  stroke="#2A1614"
                                  strokeWidth="0.9"
                                />
                                <path
                                  d="M6 5.5 V10.8"
                                  stroke="#F5C16C"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span>Giant ×{comp.heavy}</span>
                            </span>
                          )}
                          {comp.melee > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2B353F] border border-[#C98A2C]/55 text-[10.5px] font-extrabold font-mono-num text-[#F9F3E6]">
                              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                                <path
                                  d="M2.5 9.5 L8.8 3.2 M7.2 2 L10 4.8 M2 10 L4 8"
                                  stroke="#E9BA58"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span>Melee ×{comp.melee}</span>
                            </span>
                          )}
                          {comp.ranged > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2B353F] border border-[#C98A2C]/55 text-[10.5px] font-extrabold font-mono-num text-[#F9F3E6]">
                              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                                <path
                                  d="M3.5 2 C7.8 3.5 7.8 8.5 3.5 10 M3.5 2 L3.5 10 M4.5 6 L10.5 6"
                                  fill="none"
                                  stroke="#E9BA58"
                                  strokeWidth="1.4"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span>Ranged ×{comp.ranged}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Shrinking amber-gold warhorn countdown strip */}
                      {isIncoming && (
                        <div className="h-1 w-full bg-[#11161B]">
                          <div
                            className="h-full bg-gradient-to-r from-[#7BA8B0] via-[#E9BA58] to-[#C98A2C] transition-[width] duration-100"
                            style={{ width: `${hud.incomingWavePct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Micro-Innovation #3: Short Onboarding Group-Summon Tip on Stage 1-1 */}
              {showGroupTip && (
                <div
                  data-testid="onboarding-group-tip"
                  className="pointer-events-auto mx-auto max-w-[330px] px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-xs font-bold"
                  style={{
                    backgroundColor: '#FFF8E6',
                    color: '#3A2B23',
                    border: '1.5px solid #C98A2C',
                    boxShadow: '0 2px 6px rgba(58,43,35,0.18)',
                  }}
                >
                  <span>
                    Tip: Save Food and deploy a squad together — each knight cleaves whole enemy packs!
                  </span>
                  <button
                    type="button"
                    onClick={() => setDismissedTip(true)}
                    aria-label="Dismiss tip"
                    className="p-1 text-[#7D6A5C] hover:text-[#3A2B23] cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Area: Real-Time Battle Log (bottom-left) + Commander Dock */}
            <div className="flex flex-col gap-2">
              <BattleLogOverlay entries={battleLogEntries} />

              {/* Bottom Commander Dock */}
              <div className="pointer-events-auto space-y-2 pb-0.5">
              {/* In-Battle Upgrades & Age Evolution Row */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={hud.coins < foodUpCost}
                  onClick={handleBattleFoodUpgrade}
                  className="py-1.5 px-2 rounded-lg flex items-center justify-between text-[11px] font-bold cursor-pointer active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={panelFrame}
                >
                  <span className="truncate">Food Lv.{hud.foodLevel}</span>
                  <span className="font-mono-num text-[#B46B17] shrink-0">{foodUpCost}</span>
                </button>

                <button
                  type="button"
                  disabled={hud.coins < baseUpCost}
                  onClick={handleBattleBaseUpgrade}
                  className="py-1.5 px-2 rounded-lg flex items-center justify-between text-[11px] font-bold cursor-pointer active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={panelFrame}
                >
                  <span className="truncate">Base Lv.{hud.baseLevel}</span>
                  <span className="font-mono-num text-[#B46B17] shrink-0">{baseUpCost}</span>
                </button>

                <button
                  type="button"
                  disabled={!nextAge || hud.coins < currentAge.evolveCost}
                  onClick={handleBattleEvolveAge}
                  className="py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 text-[11px] font-extrabold cursor-pointer active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    ...panelFrame,
                    backgroundColor:
                      nextAge && hud.coins >= currentAge.evolveCost ? '#2E6F7E' : '#E7DEC8',
                    color:
                      nextAge && hud.coins >= currentAge.evolveCost ? '#FFFDF7' : '#3A2B23',
                  }}
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {nextAge ? `Age ${hud.allyAgeIndex + 2} (${currentAge.evolveCost})` : 'Max Age'}
                  </span>
                </button>
              </div>

              {/* Food Production Bar */}
              <div
                className="px-3 py-1.5 rounded-xl flex items-center justify-between gap-2.5"
                style={{
                  ...panelFrame,
                  borderColor: hud.openingSurgeTimer > 0 ? '#C98A2C' : '#3A2B23',
                  backgroundColor: hud.openingSurgeTimer > 0 ? '#FFF9E6' : '#F9F3E6',
                }}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <RationBreadIcon />
                  <span
                    data-testid="hud-food"
                    className="text-sm font-extrabold font-mono-num"
                  >
                    {hud.food}/{hud.maxFood}
                  </span>
                </div>

                <div className="flex-1 h-3 rounded-full bg-black/10 border border-[#3A2B23] overflow-hidden">
                  <div
                    ref={foodBarRef}
                    className={`h-full ${
                      hud.openingSurgeTimer > 0
                        ? 'bg-gradient-to-r from-[#C98A2C] to-[#F5C16C]'
                        : 'bg-[#C98A2C]'
                    }`}
                    style={{
                      width: `${Math.min(100, (hud.food / hud.maxFood) * 100)}%`,
                    }}
                  />
                </div>

                {hud.openingSurgeTimer > 0 ? (
                  <span
                    data-testid="hud-food-surge"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#C98A2C] text-[#FFFDF7] text-[10px] font-extrabold font-mono-num shrink-0"
                  >
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    <span>×1.5 · {hud.openingSurgeTimer}s</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold font-mono-num text-[#7D6A5C] shrink-0">
                    +{hud.foodRate}/s
                  </span>
                )}
              </div>

              {/* 3 Royal Vanguard Summon Cards (Melee, Ranged, High-Cost Game-Changer Giant) */}
              <div className="grid grid-cols-3 gap-2">
                {(['melee', 'ranged', 'heavy'] as UnitRole[]).map((role) => {
                  const unit = currentAge.units[role];
                  const canSummon = hud.food >= unit.cost;
                  const isGiant = role === 'heavy';
                  return (
                    <button
                      key={role}
                      type="button"
                      data-testid={`summon-${role}`}
                      onClick={() => handleSummon(role)}
                      disabled={!canSummon}
                      className={`relative overflow-hidden py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-transform active:translate-y-0.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                        isGiant && canSummon ? 'ring-2 ring-[#E9BA58] ring-offset-1 ring-offset-[#F3ECE0]' : ''
                      }`}
                      style={{
                        ...panelFrame,
                        backgroundColor: !canSummon
                          ? '#E2D8C4'
                          : isGiant
                            ? '#FFF6DB'
                            : '#F9F3E6',
                        borderColor: isGiant && canSummon ? '#B46B17' : '#3A2B23',
                        boxShadow:
                          isGiant && canSummon
                            ? '0 3px 0 #3A2B23, 0 0 12px rgba(233, 186, 88, 0.55)'
                            : '0 3px 0 #3A2B23',
                      }}
                    >
                      {isGiant && (
                        <span
                          className={`absolute top-1 right-1 px-1 py-px rounded text-[8px] font-black uppercase tracking-wider ${
                            canSummon
                              ? 'bg-[#C98A2C] text-[#FFFDF7]'
                              : 'bg-[#3A2B23]/15 text-[#5C493C]'
                          }`}
                        >
                          GIANT
                        </span>
                      )}
                      <UnitBadgeSvg role={role} />
                      <span className="text-xs font-extrabold leading-tight truncate max-w-full">
                        {unit.name}
                      </span>
                      <span
                        className={`text-[11px] font-bold font-mono-num whitespace-nowrap ${
                          isGiant ? 'text-[#9E530B]' : 'text-[#B46B17]'
                        }`}
                      >
                        {unit.cost} Food
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        )}

        {/* PAUSE MODAL */}
        {phase === 'paused' && (
          <div
            className="absolute inset-0 z-30 bg-[#231914]/60 flex items-center justify-center p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Game Paused"
          >
            <div className="w-full rounded-xl p-5 space-y-3 text-center" style={panelFrame}>
              <h2 className="font-display-serif text-2xl font-extrabold">Battle Paused</h2>
              <p className="text-xs text-[#7D6A5C]">
                {currentStage.id} · {currentStage.title} · {currentAge.name}
              </p>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('playing')}
                  className="w-full py-3 rounded-xl border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] font-extrabold text-sm cursor-pointer"
                >
                  Resume Battle
                </button>
                <button
                  type="button"
                  onClick={() => startBattleForStage(selectedStageIdx, 0)}
                  className="w-full py-2.5 rounded-xl border-2 border-[#3A2B23] bg-[#EFE5D1] font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Stage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubModal('settings')}
                  className="w-full py-2.5 rounded-xl border-2 border-[#3A2B23] bg-[#EFE5D1] font-bold text-sm cursor-pointer"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fresh = createBattleState(currentStage, save, 0);
                    seedTitleShowcase(fresh);
                    battleRef.current = fresh;
                    setPhase('title');
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#3A2B23]/40 text-xs font-bold text-[#7D6A5C] cursor-pointer"
                >
                  Back to Title
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VICTORY MODAL */}
        {phase === 'victory' && activeResultCg && (
          <div
            className="absolute inset-0 z-30 bg-[#231914]/65 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Victory"
          >
            <div className="w-full rounded-xl p-4 space-y-2.5 text-center" style={panelFrame}>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2E6F7E]">
                  Stage Cleared · {currentStage.id}
                </p>
                <h2 className="font-display-serif text-2xl font-extrabold leading-tight">
                  Victory!
                </h2>
              </div>

              {/* Dynamic Victory CG Artwork */}
              <div className="rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] overflow-hidden text-left">
                <button
                  type="button"
                  onClick={() => openCgGallery('victory', activeResultCg.id)}
                  className="relative w-full aspect-video block overflow-hidden cursor-pointer group"
                  aria-label={`Inspect ${activeResultCg.title}`}
                >
                  <img
                    src={activeResultCg.imagePath}
                    alt={activeResultCg.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#231914]/80 text-[#FFFDF7] text-[10px] font-extrabold">
                    {activeResultCg.slotLabel} · {activeResultCg.title}
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-[#F9F3E6]/90 border border-[#3A2B23]/40 text-[10px] font-bold text-[#3A2B23]">
                    Achievements
                  </span>
                </button>
                <p className="px-2.5 py-1.5 text-[11px] font-semibold text-[#5C493C] leading-snug">
                  {activeResultCg.caption}
                </p>
              </div>

              {newlyUnlockedCgId === activeResultCg.id && (
                <button
                  type="button"
                  data-testid="new-achievement-banner"
                  onClick={() => openCgGallery('victory')}
                  className="w-full px-2.5 py-2 rounded-lg border-2 border-[#C98A2C] bg-[#FFF7DF] flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-4 h-4 text-[#C98A2C] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#B46B17]">
                        New Achievement Unlocked
                      </div>
                      <div className="text-xs font-extrabold text-[#3A2B23] truncate">
                        {activeResultCg.achievementName}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md border border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-[10.5px] font-extrabold font-mono-num shrink-0">
                    {save.claimedAchievementIds.includes(activeResultCg.id)
                      ? 'Claimed'
                      : `Claim +${activeResultCg.rewardCoins}`}
                  </span>
                </button>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-1.5 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/25">
                  <div className="text-[#7D6A5C] text-[10px]">Time</div>
                  <div className="font-extrabold font-mono-num text-sm">
                    {hud.clearTime}s
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/25">
                  <div className="text-[#7D6A5C] text-[10px]">Deployed</div>
                  <div className="font-extrabold font-mono-num text-sm">
                    {hud.unitsDeployed}
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/25">
                  <div className="text-[#7D6A5C] text-[10px]">Earned</div>
                  <div className="font-extrabold font-mono-num text-sm text-[#B46B17]">
                    +{hud.coinsEarned}
                  </div>
                </div>
              </div>

              {/* M1 Rewarded Video / No-Ads VIP Instant Claim: Double Victory Spoils */}
              {!claimedRunRewardAd && (() => {
                const bonus = Math.max(10, hud.coinsEarned);
                const applyDoubleCoins = () => {
                  gameAudio.trigger('upgrade');
                  battleRef.current.coins += bonus;
                  setSave((prev) => ({ ...prev, coins: prev.coins + bonus }));
                  setHud((prev) => ({
                    ...prev,
                    coins: prev.coins + bonus,
                    coinsEarned: prev.coinsEarned + bonus,
                  }));
                  setClaimedRunRewardAd(true);
                  setPendingAd(null);
                };
                return (
                  <button
                    type="button"
                    data-testid="victory-double-coins-btn"
                    onClick={() => {
                      if (save.adsRemoved) {
                        applyDoubleCoins();
                      } else {
                        setPendingAd({
                          offer: AD_OFFERS.victory_double_coins,
                          onClaim: applyDoubleCoins,
                        });
                      }
                    }}
                    className={`w-full py-2 px-3 rounded-xl border-2 border-[#3A2B23] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                      save.adsRemoved
                        ? 'bg-[#FFF3CC] text-[#7D4B09]'
                        : 'bg-[#2E6F7E] text-[#FFFDF7]'
                    }`}
                  >
                    {save.adsRemoved ? (
                      <Crown className="w-3.5 h-3.5 text-[#C98A2C]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {save.adsRemoved
                        ? `No-Ads Pass · Instant +${bonus} Bonus Coins`
                        : `Watch Ad · Double Coins (+${bonus})`}
                    </span>
                  </button>
                );
              })()}

              <div className="space-y-1.5">
                <button
                  type="button"
                  data-start="true"
                  onClick={handleContinueNextStage}
                  className="w-full py-2.5 px-3 rounded-xl border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] font-extrabold text-sm cursor-pointer"
                >
                  {selectedStageIdx < STAGES.length - 1
                    ? 'Next Battle'
                    : `Enter Timeline ${save.timeline + 1} (Enemy ×${getTimelineEnemyMult(save.timeline + 1)})`}
                </button>
                {selectedStageIdx === STAGES.length - 1 && (
                  <p className="text-[10.5px] font-semibold text-[#5C493C] leading-snug px-1">
                    Resets chapters & era to Stone Age · Keeps coins & achievements · Vanguard ×
                    {getTimelineAllyMult(save.timeline + 1)} · Coins ×
                    {getTimelineCoinMult(save.timeline + 1)}
                  </p>
                )}
                <div className={`grid gap-2 ${selectedStageIdx === STAGES.length - 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {selectedStageIdx === STAGES.length - 1 && (
                    <button
                      type="button"
                      onClick={() => startBattleForStage(selectedStageIdx, 0)}
                      className="py-1.5 rounded-xl border border-[#3A2B23]/40 bg-[#EFE5D1] text-xs font-bold text-[#3A2B23] cursor-pointer"
                    >
                      Replay 5-3
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openCgGallery('victory')}
                    className="py-1.5 rounded-xl border border-[#3A2B23]/40 bg-[#EFE5D1] text-xs font-bold text-[#3A2B23] cursor-pointer"
                  >
                    Achievements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = createBattleState(currentStage, save, 0);
                      seedTitleShowcase(fresh);
                      battleRef.current = fresh;
                      setPhase('title');
                    }}
                    className="py-1.5 rounded-xl border border-[#3A2B23]/35 text-xs font-bold text-[#7D6A5C] cursor-pointer"
                  >
                    Return to Title
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEFEAT MODAL */}
        {phase === 'defeat' && activeResultCg && (
          <div
            className="absolute inset-0 z-30 bg-[#231914]/65 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Defeat"
          >
            <div className="w-full rounded-xl p-4 space-y-2.5 text-center" style={panelFrame}>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#A4423C]">
                  Outpost Fallen · {currentStage.id}
                </p>
                <h2 className="font-display-serif text-2xl font-extrabold leading-tight">
                  Retreat!
                </h2>
              </div>

              {/* Dynamic Defeat CG Artwork */}
              <div className="rounded-lg border-2 border-[#3A2B23] bg-[#EFE5D1] overflow-hidden text-left">
                <button
                  type="button"
                  onClick={() => openCgGallery('defeat', activeResultCg.id)}
                  className="relative w-full aspect-video block overflow-hidden cursor-pointer group"
                  aria-label={`Inspect ${activeResultCg.title}`}
                >
                  <img
                    src={activeResultCg.imagePath}
                    alt={activeResultCg.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#231914]/80 text-[#FFFDF7] text-[10px] font-extrabold">
                    {activeResultCg.slotLabel} · {activeResultCg.title}
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-[#F9F3E6]/90 border border-[#3A2B23]/40 text-[10px] font-bold text-[#3A2B23]">
                    Achievements
                  </span>
                </button>
                <p className="px-2.5 py-1.5 text-[11px] font-semibold text-[#5C493C] leading-snug">
                  {activeResultCg.caption}
                </p>
              </div>

              {newlyUnlockedCgId === activeResultCg.id && (
                <button
                  type="button"
                  data-testid="new-achievement-banner"
                  onClick={() => openCgGallery('defeat')}
                  className="w-full px-2.5 py-2 rounded-lg border-2 border-[#C98A2C] bg-[#FFF7DF] flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-4 h-4 text-[#C98A2C] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#B46B17]">
                        New Achievement Unlocked
                      </div>
                      <div className="text-xs font-extrabold text-[#3A2B23] truncate">
                        {activeResultCg.achievementName}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md border border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] text-[10.5px] font-extrabold font-mono-num shrink-0">
                    {save.claimedAchievementIds.includes(activeResultCg.id)
                      ? 'Claimed'
                      : `Claim +${activeResultCg.rewardCoins}`}
                  </span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-1.5 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/25">
                  <div className="text-[#7D6A5C] text-[10px]">Enemy Base Left</div>
                  <div className="font-extrabold font-mono-num text-sm">
                    {Math.round((hud.enemyBaseHp / hud.enemyBaseMaxHp) * 100)}% (
                    {hud.enemyBaseHp} HP)
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#EFE5D1] border border-[#3A2B23]/25">
                  <div className="text-[#7D6A5C] text-[10px]">Coins Salvaged</div>
                  <div className="font-extrabold font-mono-num text-sm text-[#B46B17]">
                    +{hud.coinsEarned}
                  </div>
                </div>
              </div>

              {/* M1 Post-Defeat Rescue Slots (Zero Pre-Battle Ads; Instant-Claim with No-Ads Pass) */}
              <div className="space-y-1.5">
                {!claimedSalvageAd && (() => {
                  const salvageBonus = Math.max(8, hud.coinsEarned);
                  const applyDoubleSalvage = () => {
                    gameAudio.trigger('upgrade');
                    battleRef.current.coins += salvageBonus;
                    setSave((prev) => ({ ...prev, coins: prev.coins + salvageBonus }));
                    setHud((prev) => ({
                      ...prev,
                      coins: prev.coins + salvageBonus,
                      coinsEarned: prev.coinsEarned + salvageBonus,
                    }));
                    setClaimedSalvageAd(true);
                    setPendingAd(null);
                  };
                  return (
                    <button
                      type="button"
                      data-testid="defeat-double-salvage-btn"
                      onClick={() => {
                        if (save.adsRemoved) {
                          applyDoubleSalvage();
                        } else {
                          setPendingAd({
                            offer: AD_OFFERS.defeat_double_coins,
                            onClaim: applyDoubleSalvage,
                          });
                        }
                      }}
                      className={`w-full py-2 px-3 rounded-xl border-2 border-[#3A2B23] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                        save.adsRemoved
                          ? 'bg-[#FFF3CC] text-[#7D4B09]'
                          : 'bg-[#3A2B23] text-[#FFFDF7]'
                      }`}
                    >
                      {save.adsRemoved ? (
                        <Crown className="w-3.5 h-3.5 text-[#C98A2C]" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[#E9BA58]" />
                      )}
                      <span>
                        {save.adsRemoved
                          ? `No-Ads Pass · Instant +${salvageBonus} Salvage Coins`
                          : `Watch Ad · Double Salvage (+${salvageBonus} Coins)`}
                      </span>
                    </button>
                  );
                })()}

                {!claimedRunRewardAd && (() => {
                  const launchComebackRetry = () => {
                    gameAudio.trigger('upgrade');
                    setClaimedRunRewardAd(true);
                    setPendingAd(null);
                    startBattleForStage(selectedStageIdx, 18, undefined, 15);
                  };
                  return (
                    <button
                      type="button"
                      data-testid="defeat-comeback-surge-btn"
                      onClick={() => {
                        if (save.adsRemoved) {
                          launchComebackRetry();
                        } else {
                          setPendingAd({
                            offer: AD_OFFERS.defeat_bonus_food_start,
                            onClaim: launchComebackRetry,
                          });
                        }
                      }}
                      className={`w-full py-2 px-3 rounded-xl border-2 border-[#3A2B23] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                        save.adsRemoved
                          ? 'bg-[#FFF3CC] text-[#7D4B09]'
                          : 'bg-[#2E6F7E] text-[#FFFDF7]'
                      }`}
                    >
                      {save.adsRemoved ? (
                        <Zap className="w-3.5 h-3.5 text-[#C98A2C] fill-current" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {save.adsRemoved
                          ? 'No-Ads Pass · Free Retry (+18 Food & 15s Surge)'
                          : 'Watch Ad · Retry (+18 Food & 15s ×1.5 Surge)'}
                      </span>
                    </button>
                  );
                })()}

                <button
                  type="button"
                  data-start="true"
                  onClick={() => startBattleForStage(selectedStageIdx, 0)}
                  className="w-full py-2.5 rounded-xl border-2 border-[#3A2B23] bg-[#C98A2C] text-[#FFFDF7] font-extrabold text-sm cursor-pointer"
                >
                  Try Again
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = createBattleState(currentStage, save, 0);
                      seedTitleShowcase(fresh);
                      battleRef.current = fresh;
                      setPhase('title');
                      setActiveSubModal('upgrades');
                    }}
                    className="py-1.5 rounded-xl border-2 border-[#3A2B23] bg-[#EFE5D1] text-xs font-bold cursor-pointer"
                  >
                    Upgrade Tribe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = createBattleState(currentStage, save, 0);
                      seedTitleShowcase(fresh);
                      battleRef.current = fresh;
                      setPhase('title');
                    }}
                    className="py-1.5 rounded-xl border border-[#3A2B23]/40 text-xs font-bold text-[#7D6A5C] cursor-pointer"
                  >
                    Title Screen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODALS */}
        {activeSubModal === 'chapters' && (
          <ChaptersModal
            save={save}
            selectedStageIdx={selectedStageIdx}
            onSelectStage={(idx) => startBattleForStage(idx, 0)}
            onAdvanceTimeline={handleAdvanceTimeline}
            onClose={() => setActiveSubModal('none')}
          />
        )}

        {activeSubModal === 'upgrades' && (
          <UpgradesModal
            save={save}
            onUpgradeFood={() => {
              const cost = getFoodUpgradeCost(save.foodLevel);
              if (save.coins < cost) return;
              gameAudio.trigger('upgrade');
              setSave((prev) => ({
                ...prev,
                coins: prev.coins - cost,
                foodLevel: prev.foodLevel + 1,
              }));
            }}
            onUpgradeBase={() => {
              const cost = getBaseUpgradeCost(save.baseLevel);
              if (save.coins < cost) return;
              gameAudio.trigger('upgrade');
              setSave((prev) => ({
                ...prev,
                coins: prev.coins - cost,
                baseLevel: prev.baseLevel + 1,
              }));
            }}
            onEvolveAge={() => {
              const age = AGES[save.allyAgeIndex];
              if (save.allyAgeIndex >= AGES.length - 1 || save.coins < age.evolveCost) return;
              gameAudio.trigger('evolve');
              setSave((prev) => ({
                ...prev,
                coins: prev.coins - age.evolveCost,
                allyAgeIndex: prev.allyAgeIndex + 1,
              }));
            }}
            onClose={() => setActiveSubModal('none')}
          />
        )}

        {activeSubModal === 'settings' && (
          <SettingsModal
            save={save}
            onToggleSound={() =>
              setSave((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
            }
            onToggleHaptics={() =>
              setSave((prev) => ({ ...prev, hapticsEnabled: !prev.hapticsEnabled }))
            }
            onToggleRemoveAds={() =>
              setSave((prev) => ({ ...prev, adsRemoved: !prev.adsRemoved }))
            }
            onResetSave={() => {
              const clearedSave = clearSaveData();
              setSave(clearedSave);
              setSelectedStageIdx(0);
              const freshBattle = createBattleState(STAGES[0], clearedSave, 0);
              seedTitleShowcase(freshBattle);
              battleRef.current = freshBattle;
              setActiveSubModal('none');
              setPhase('title');
            }}
            onOpenArtPitch={() => {
              setActiveSubModal('none');
              onOpenArtPitch();
            }}
            onClose={() => setActiveSubModal('none')}
          />
        )}

        {activeSubModal === 'cgs' && (
          <CgGalleryModal
            save={save}
            initialTab={cgGalleryTab}
            initialCgId={cgGalleryFocusId}
            onClaimReward={handleClaimAchievementReward}
            onClose={() => setActiveSubModal('none')}
          />
        )}

        {activeSubModal === 'noads' && (
          <NoAdsPassModal
            adsRemoved={save.adsRemoved}
            onToggleRemoveAds={() => {
              gameAudio.trigger('upgrade');
              setSave((prev) => ({ ...prev, adsRemoved: !prev.adsRemoved }));
            }}
            onClose={() => setActiveSubModal('none')}
          />
        )}

        {pendingAd && (
          <SimulatedAdModal
            offer={pendingAd.offer}
            onComplete={pendingAd.onClaim}
            onUnlockNoAds={() => {
              gameAudio.trigger('evolve');
              setSave((prev) => ({ ...prev, adsRemoved: true }));
              pendingAd.onClaim();
            }}
            onCancel={() => setPendingAd(null)}
          />
        )}
      </div>
    </div>
  );
}

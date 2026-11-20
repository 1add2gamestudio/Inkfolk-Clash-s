export type CgOutcome = 'victory' | 'defeat';

export interface BattleCgSpec {
  id: string;
  outcome: CgOutcome;
  slotLabel: string;
  achievementName: string;
  rewardCoins: number;
  title: string;
  triggerRule: string;
  caption: string;
  directorNote: string;
  imagePath: string;
}

export interface CgSelectionContext {
  stageChapter: number;
  allyAgeIndex: number;
  unitsDeployed: number;
  enemyBaseHpRatio: number;
  clearTime: number;
}

export const VICTORY_CGS: BattleCgSpec[] = [
  {
    id: 'victory_banner_dawn',
    outcome: 'victory',
    slotLabel: 'Victory CG I',
    achievementName: 'First Dawn',
    rewardCoins: 25,
    title: 'Banner at Sunrise',
    triggerRule: 'Standard early-era victory (Chapters 1–3)',
    caption: 'The Hearthclan gatehouse falls at first light as fresh bread passes along the wall.',
    directorNote:
      'Low-angle hero composition with a strong diagonal pennant cutting warm sunrise negative space; grounds victory in warmth and camaraderie rather than cold conquest.',
    imagePath: '/src/assets/images/victory_banner_dawn_1795078405542.jpg',
  },
  {
    id: 'victory_swarm_surge',
    outcome: 'victory',
    slotLabel: 'Victory CG II',
    achievementName: 'Tide of Vanguard',
    rewardCoins: 35,
    title: 'Tide of the Inkfolk',
    triggerRule: 'Win a battle after deploying 10+ Royal Elites',
    caption: 'United across the brook bridge, your Royal Vanguards shatter the enemy palisade.',
    directorNote:
      'Sweeping S-curve depth charge celebrating a decisive elite breakthrough; high-chroma teal silhouettes stay crisp even across dense crowd layering.',
    imagePath: '/src/assets/images/victory_swarm_surge_1795078403724.jpg',
  },
  {
    id: 'victory_astral_crown',
    outcome: 'victory',
    slotLabel: 'Victory CG III',
    achievementName: 'Sovereign of the Spire',
    rewardCoins: 50,
    title: 'Triumph of the Spire',
    triggerRule: 'Win in Chapters 4–5 or after evolving to Age III+',
    caption: 'Lanterns drift above the Sun Spire while rival banners bow beneath the twilight sky.',
    directorNote:
      'Ceremonial scale contrast pairing towering brass colossus armor and golden observatory optics against cool cerulean twilight wash for an unforgettable campaign climax.',
    imagePath: '/src/assets/images/victory_astral_crown_1795078445702.jpg',
  },
];

export const DEFEAT_CGS: BattleCgSpec[] = [
  {
    id: 'defeat_rain_retreat',
    outcome: 'defeat',
    slotLabel: 'Defeat CG I',
    achievementName: 'Rain Before Dawn',
    rewardCoins: 15,
    title: 'Lantern in the Rain',
    triggerRule: 'Early-stage defeat (Enemy base > 35% HP remaining)',
    caption: 'Shields raised against the valley rain, a single warm lantern guides the tribe home.',
    directorNote:
      'Empathetic, zero-humiliation defeat beat: cool slate rain wash isolates one glowing amber lantern to keep morale intact and encourage an immediate regroup.',
    imagePath: '/src/assets/images/defeat_rain_retreat_1795078407722.jpg',
  },
  {
    id: 'defeat_inches_short',
    outcome: 'defeat',
    slotLabel: 'Defeat CG II',
    achievementName: 'One Stone Short',
    rewardCoins: 25,
    title: 'One Stone Too Far',
    triggerRule: 'Razor-close defeat (Enemy base <= 35% HP remaining)',
    caption: 'The enemy wall cracked beneath your vanguard assault—one more knight will break it open.',
    directorNote:
      'High-tension near-miss tableau framing a fractured fortress wall and lone golden arrow in ember light, directly motivating the "+12 Starting Food" comeback retry.',
    imagePath: '/src/assets/images/defeat_inches_short_1795078407840.jpg',
  },
  {
    id: 'defeat_siege_eclipse',
    outcome: 'defeat',
    slotLabel: 'Defeat CG III',
    achievementName: 'Bell of Defiance',
    rewardCoins: 35,
    title: 'Bell of the Last Stand',
    triggerRule: 'Fall under prolonged or late-era siege (Ch.3+ or 35s+)',
    caption: 'Towering brass walkers shadow the fallen bell, yet one drummer beats for tomorrow.',
    directorNote:
      'Operatic silhouette framing with backlit crimson-ochre dust and ink splatter; turns a tough siege loss into dramatic spectacle and signals time to upgrade Food/Age.',
    imagePath: '/src/assets/images/defeat_siege_eclipse_1795078407548.jpg',
  },
];

export const BATTLE_CGS: BattleCgSpec[] = [...VICTORY_CGS, ...DEFEAT_CGS];

export function selectBattleCg(
  outcome: CgOutcome,
  ctx: CgSelectionContext
): BattleCgSpec {
  if (outcome === 'victory') {
    if (ctx.stageChapter >= 4 || ctx.allyAgeIndex >= 2) {
      return VICTORY_CGS[2];
    }
    if (ctx.unitsDeployed >= 10) {
      return VICTORY_CGS[1];
    }
    return VICTORY_CGS[0];
  }

  if (ctx.enemyBaseHpRatio <= 0.35) {
    return DEFEAT_CGS[1];
  }
  if (ctx.stageChapter >= 3 || ctx.clearTime >= 35) {
    return DEFEAT_CGS[2];
  }
  return DEFEAT_CGS[0];
}

export function getCgById(id: string): BattleCgSpec | undefined {
  return BATTLE_CGS.find((cg) => cg.id === id);
}

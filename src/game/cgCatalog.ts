import defeatInchesShortImg from '../assets/images/defeat_inches_short_1795078407840.jpg';
import defeatRainRetreatImg from '../assets/images/defeat_rain_retreat_1795571655585.jpg';
import defeatSiegeEclipseImg from '../assets/images/defeat_siege_eclipse_1795570789261.jpg';
import victoryAstralCrownImg from '../assets/images/victory_astral_crown_1795078445702.jpg';
import victoryBannerDawnImg from '../assets/images/victory_banner_dawn_1795078405542.jpg';
import victorySwarmSurgeImg from '../assets/images/victory_swarm_surge_1795078403724.jpg';

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
  allyBaseHpRatio: number;
  allyBaseDamageTaken?: number;
  enemyBaseHpRatio: number;
}

export const VICTORY_CGS: BattleCgSpec[] = [
  {
    id: 'victory_banner_dawn',
    outcome: 'victory',
    slotLabel: 'Victory CG I',
    achievementName: 'First Dawn',
    rewardCoins: 0,
    title: 'Banner at Sunrise',
    triggerRule: 'Win a battle after losing more than 40% of your castle HP',
    caption: 'The Hearthclan gatehouse falls at first light as fresh bread passes along the wall.',
    directorNote:
      'Low-angle hero composition with a strong diagonal pennant cutting warm sunrise negative space; grounds victory in warmth and camaraderie rather than cold conquest.',
    imagePath: victoryBannerDawnImg,
  },
  {
    id: 'victory_swarm_surge',
    outcome: 'victory',
    slotLabel: 'Victory CG II',
    achievementName: 'Tide of Vanguard',
    rewardCoins: 0,
    title: 'Tide of the Inkfolk',
    triggerRule: 'Win a battle after taking 1%–40% damage to your castle',
    caption: 'United across the brook bridge, your Royal Vanguards shatter the enemy palisade.',
    directorNote:
      'Sweeping S-curve depth charge celebrating a decisive elite breakthrough; high-chroma teal silhouettes stay crisp even across dense crowd layering.',
    imagePath: victorySwarmSurgeImg,
  },
  {
    id: 'victory_astral_crown',
    outcome: 'victory',
    slotLabel: 'Victory CG III',
    achievementName: 'Sovereign of the Spire',
    rewardCoins: 0,
    title: 'Triumph of the Spire',
    triggerRule: 'Win a battle with your castle at 100% HP (no damage taken)',
    caption: 'Lanterns drift above the Sun Spire while rival banners bow beneath the twilight sky.',
    directorNote:
      'Ceremonial scale contrast pairing towering brass colossus armor and golden observatory optics against cool cerulean twilight wash for an unforgettable campaign climax.',
    imagePath: victoryAstralCrownImg,
  },
];

export const DEFEAT_CGS: BattleCgSpec[] = [
  {
    id: 'defeat_rain_retreat',
    outcome: 'defeat',
    slotLabel: 'Defeat CG I',
    achievementName: 'Rain Before Dawn',
    rewardCoins: 0,
    title: 'The Long Road Back',
    triggerRule: 'Fall in battle after dealing 1%–40% damage to the enemy tower',
    caption: 'Cold rain drowns the burning outpost behind them as battered remnants limp into the mist.',
    directorNote:
      'Somber watercolor retreat framing exhausted, mud-splattered Inkfolk soldiers supporting their wounded away from a smoking gatehouse under slate-gray rain.',
    imagePath: defeatRainRetreatImg,
  },
  {
    id: 'defeat_inches_short',
    outcome: 'defeat',
    slotLabel: 'Defeat CG II',
    achievementName: 'One Stone Short',
    rewardCoins: 0,
    title: 'One Stone Too Far',
    triggerRule: 'Fall in battle after dealing more than 40% damage to the enemy tower',
    caption: 'The enemy wall cracked beneath your vanguard assault—one more knight will break it open.',
    directorNote:
      'High-tension near-miss tableau framing a fractured fortress wall and lone golden arrow in ember light, directly motivating the "+12 Starting Food" comeback retry.',
    imagePath: defeatInchesShortImg,
  },
  {
    id: 'defeat_siege_eclipse',
    outcome: 'defeat',
    slotLabel: 'Defeat CG III',
    achievementName: 'Ashes of the Siege',
    rewardCoins: 0,
    title: 'Silence of the Fallen Bell',
    triggerRule: 'Fall in battle while the enemy tower remains at 100% HP',
    caption: 'The siege bell lies cracked in the ash as giant shadows loom over the fallen vanguard.',
    directorNote:
      'Somber defeat composition pairing a slumped, exhausted Inkfolk soldier beside a cracked bronze bell against looming steam colossi in ash-choked twilight.',
    imagePath: defeatSiegeEclipseImg,
  },
];

export const BATTLE_CGS: BattleCgSpec[] = [...VICTORY_CGS, ...DEFEAT_CGS];

export function selectBattleCg(
  outcome: CgOutcome,
  ctx: CgSelectionContext
): BattleCgSpec {
  if (outcome === 'victory') {
    const allyRatio = Math.max(0, Math.min(1, ctx.allyBaseHpRatio));
    const tookDamage =
      ctx.allyBaseDamageTaken !== undefined
        ? ctx.allyBaseDamageTaken > 0
        : allyRatio < 0.999999;
    if (!tookDamage && allyRatio >= 0.999999) {
      return VICTORY_CGS[2]; // Victory CG III: Flawless 100% HP victory
    }
    const allyLoss = 1 - allyRatio;
    if (allyLoss <= 0.400001) {
      return VICTORY_CGS[1]; // Victory CG II: 1%-40% castle HP lost
    }
    return VICTORY_CGS[0]; // Victory CG I: >40% castle HP lost
  }

  const enemyRatio = Math.max(0, Math.min(1, ctx.enemyBaseHpRatio));
  const enemyLoss = 1 - enemyRatio;
  if (enemyLoss <= 0.000001) {
    return DEFEAT_CGS[2]; // Defeat CG III (most devastating): Enemy tower at 100% HP
  }
  if (enemyLoss <= 0.400001) {
    return DEFEAT_CGS[0]; // Defeat CG I (moderate retreat): Enemy tower lost 1%-40% HP
  }
  return DEFEAT_CGS[1]; // Defeat CG II (narrowest defeat): Enemy tower lost >40% HP
}

export function getCgById(id: string): BattleCgSpec | undefined {
  return BATTLE_CGS.find((cg) => cg.id === id);
}

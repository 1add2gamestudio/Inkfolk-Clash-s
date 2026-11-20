export type ArtStyleId =
  | 'doodle-bean'
  | 'pixel-crusade'
  | 'ink-watercolor'
  | 'papercraft'
  | 'comic-pop'
  | 'ukiyo-woodblock';

export type PreviewScreenMode = 'menu' | 'battle';
export type UnitRole = 'melee' | 'ranged' | 'heavy';

export interface UnitArchetype {
  role: UnitRole;
  name: string;
  cost: number;
  hp: number;
  dmg: number;
  range: number;
  speed: number;
  attackCooldown: number;
  scale: number;
}

export interface ArtStyleSpec {
  id: ArtStyleId;
  index: string;
  title: string;
  subtitle: string;
  tag: string;
  summary: string;
  eraLabel: string;
  battleLabel: string;
  playerBaseName: string;
  enemyBaseName: string;
  foodLabel: string;
  coinLabel: string;
  palette: {
    skyTop: string;
    skyBottom: string;
    horizon: string;
    groundMain: string;
    groundTrack: string;
    groundShadow: string;
    ink: string;
    allyPrimary: string;
    allySecondary: string;
    enemyPrimary: string;
    enemySecondary: string;
    accent: string;
    accentText: string;
    panelBg: string;
    panelBorder: string;
    panelText: string;
    mutedText: string;
    hpAlly: string;
    hpEnemy: string;
    foodBar: string;
    dmgText: string;
  };
  swatches: string[];
  units: Record<UnitRole, UnitArchetype>;
}

export const ART_STYLES: ArtStyleSpec[] = [
  {
    id: 'doodle-bean',
    index: '01',
    title: 'Doodle Bean Swarm',
    subtitle: 'Reference Visual Direction',
    tag: 'Flat Inked Cartoon',
    summary:
      'Minimalist flat doodle cartoon with bean-shaped silhouettes, uniform dark ink strokes, solid earthy fills, and a slight top-down lane tilt built for crisp 100+ unit swarms.',
    eraLabel: 'AGE 1 · STONE CLAN',
    battleLabel: 'TIMELINE 1 · BATTLE 2',
    playerBaseName: 'Timber Palisade',
    enemyBaseName: 'Skull Totem',
    foodLabel: 'Meat',
    coinLabel: 'Coins',
    palette: {
      skyTop: '#EDE2C8',
      skyBottom: '#DFCEAA',
      horizon: '#B8A67E',
      groundMain: '#C7AF83',
      groundTrack: '#B59B6D',
      groundShadow: 'rgba(44, 34, 30, 0.22)',
      ink: '#2C221E',
      allyPrimary: '#4D7C5B',
      allySecondary: '#84A98C',
      enemyPrimary: '#B85443',
      enemySecondary: '#D8836E',
      accent: '#D98A2B',
      accentText: '#FFF8EB',
      panelBg: '#F4EAD2',
      panelBorder: '#2C221E',
      panelText: '#2C221E',
      mutedText: '#6E5B4B',
      hpAlly: '#4D7C5B',
      hpEnemy: '#B85443',
      foodBar: '#D98A2B',
      dmgText: '#2C221E',
    },
    swatches: ['#EDE2C8', '#4D7C5B', '#B85443', '#D98A2B', '#2C221E'],
    units: {
      melee: {
        role: 'melee',
        name: 'Clubber',
        cost: 3,
        hp: 45,
        dmg: 9,
        range: 18,
        speed: 38,
        attackCooldown: 0.78,
        scale: 1,
      },
      ranged: {
        role: 'ranged',
        name: 'Slinger',
        cost: 5,
        hp: 28,
        dmg: 11,
        range: 92,
        speed: 34,
        attackCooldown: 1.05,
        scale: 0.96,
      },
      heavy: {
        role: 'heavy',
        name: 'Mammoth',
        cost: 10,
        hp: 150,
        dmg: 22,
        range: 24,
        speed: 25,
        attackCooldown: 1.2,
        scale: 1.42,
      },
    },
  },
  {
    id: 'pixel-crusade',
    index: '02',
    title: '16-Bit Pixel Crusade',
    subtitle: 'Crisp Retro Arcade',
    tag: 'Pixel Art',
    summary:
      'Snap-aligned 16-bit pixel sprites, dithered twilight skies, beveled brass-and-slate HUD plates, and sharp arcade hit flashes with unmistakable pixel silhouettes.',
    eraLabel: 'ERA II · IRON BASTION',
    battleLabel: 'STAGE 2-3 · CAUSEWAY',
    playerBaseName: 'Royal Keep',
    enemyBaseName: 'Dread Citadel',
    foodLabel: 'Rations',
    coinLabel: 'Gold',
    palette: {
      skyTop: '#243B67',
      skyBottom: '#4E7AA8',
      horizon: '#355A52',
      groundMain: '#477D4F',
      groundTrack: '#6B6559',
      groundShadow: 'rgba(15, 21, 36, 0.35)',
      ink: '#141824',
      allyPrimary: '#3B82F6',
      allySecondary: '#93C5FD',
      enemyPrimary: '#EF4444',
      enemySecondary: '#FCA5A5',
      accent: '#F59E0B',
      accentText: '#141824',
      panelBg: '#1E2538',
      panelBorder: '#64748B',
      panelText: '#F8FAFC',
      mutedText: '#94A3B8',
      hpAlly: '#22C55E',
      hpEnemy: '#EF4444',
      foodBar: '#F59E0B',
      dmgText: '#FEF08A',
    },
    swatches: ['#243B67', '#477D4F', '#3B82F6', '#EF4444', '#F59E0B'],
    units: {
      melee: {
        role: 'melee',
        name: 'Squire',
        cost: 3,
        hp: 48,
        dmg: 10,
        range: 18,
        speed: 39,
        attackCooldown: 0.76,
        scale: 1,
      },
      ranged: {
        role: 'ranged',
        name: 'Longbow',
        cost: 5,
        hp: 28,
        dmg: 12,
        range: 98,
        speed: 35,
        attackCooldown: 1.0,
        scale: 0.96,
      },
      heavy: {
        role: 'heavy',
        name: 'Golem',
        cost: 10,
        hp: 160,
        dmg: 24,
        range: 24,
        speed: 24,
        attackCooldown: 1.22,
        scale: 1.44,
      },
    },
  },
  {
    id: 'ink-watercolor',
    index: '03',
    title: 'Storybook Ink & Wash',
    subtitle: 'Franco-Belgian Watercolor',
    tag: 'Hand-Painted Wash',
    summary:
      'Cold-press parchment washes, expressive sepia fountain-pen linework, botanical sage and burnt sienna pigments, and wax-sealed ribbon HUD panels.',
    eraLabel: 'CHAPTER III · CLOCKWORK',
    battleLabel: 'FOLIO IV · VERDANT PASS',
    playerBaseName: 'Guild Belfry',
    enemyBaseName: 'Alchemist Tower',
    foodLabel: 'Supply',
    coinLabel: 'Florins',
    palette: {
      skyTop: '#F3ECE0',
      skyBottom: '#E0D5C1',
      horizon: '#9CA894',
      groundMain: '#A6B191',
      groundTrack: '#C9B79C',
      groundShadow: 'rgba(58, 43, 35, 0.18)',
      ink: '#3A2B23',
      allyPrimary: '#2E6F7E',
      allySecondary: '#7BA8B0',
      enemyPrimary: '#A4423C',
      enemySecondary: '#D47B6A',
      accent: '#C98A2C',
      accentText: '#FFFDF7',
      panelBg: '#F9F3E6',
      panelBorder: '#6B5344',
      panelText: '#3A2B23',
      mutedText: '#7D6A5C',
      hpAlly: '#3B8271',
      hpEnemy: '#A4423C',
      foodBar: '#C98A2C',
      dmgText: '#7C2D12',
    },
    swatches: ['#F3ECE0', '#2E6F7E', '#A4423C', '#C98A2C', '#3A2B23'],
    units: {
      melee: {
        role: 'melee',
        name: 'Lancer',
        cost: 3,
        hp: 44,
        dmg: 9,
        range: 20,
        speed: 40,
        attackCooldown: 0.78,
        scale: 1,
      },
      ranged: {
        role: 'ranged',
        name: 'Chemist',
        cost: 5,
        hp: 30,
        dmg: 11,
        range: 90,
        speed: 34,
        attackCooldown: 1.05,
        scale: 0.98,
      },
      heavy: {
        role: 'heavy',
        name: 'Automaton',
        cost: 10,
        hp: 155,
        dmg: 23,
        range: 24,
        speed: 25,
        attackCooldown: 1.18,
        scale: 1.4,
      },
    },
  },
  {
    id: 'papercraft',
    index: '04',
    title: 'Papercraft Diorama',
    subtitle: 'Tactile Cutout Theater',
    tag: 'Layered Cardstock',
    summary:
      'Die-cut construction paper layers with directional studio drop shadows, stitched-cardboard controls, coral-vs-teal silhouettes, and confetti impact snips.',
    eraLabel: 'ACT 1 · ORIGAMI FRONT',
    battleLabel: 'SCENE 3 · FOLDED RIDGE',
    playerBaseName: 'Cardboard Keep',
    enemyBaseName: 'Crimson Bastion',
    foodLabel: 'Stamps',
    coinLabel: 'Buttons',
    palette: {
      skyTop: '#D8EEF2',
      skyBottom: '#F5EFE2',
      horizon: '#8EC5B8',
      groundMain: '#77B899',
      groundTrack: '#E6D6B8',
      groundShadow: 'rgba(30, 41, 59, 0.20)',
      ink: '#24303C',
      allyPrimary: '#0F8B8D',
      allySecondary: '#64C4C3',
      enemyPrimary: '#E15554',
      enemySecondary: '#F2948E',
      accent: '#E8A838',
      accentText: '#24303C',
      panelBg: '#FFFDF8',
      panelBorder: '#24303C',
      panelText: '#24303C',
      mutedText: '#62717E',
      hpAlly: '#0F8B8D',
      hpEnemy: '#E15554',
      foodBar: '#E8A838',
      dmgText: '#E15554',
    },
    swatches: ['#D8EEF2', '#0F8B8D', '#E15554', '#E8A838', '#FFFDF8'],
    units: {
      melee: {
        role: 'melee',
        name: 'Foldguard',
        cost: 3,
        hp: 46,
        dmg: 9,
        range: 18,
        speed: 38,
        attackCooldown: 0.78,
        scale: 1,
      },
      ranged: {
        role: 'ranged',
        name: 'Glider',
        cost: 5,
        hp: 27,
        dmg: 11,
        range: 96,
        speed: 36,
        attackCooldown: 1.0,
        scale: 0.96,
      },
      heavy: {
        role: 'heavy',
        name: 'Box Titan',
        cost: 10,
        hp: 155,
        dmg: 23,
        range: 24,
        speed: 24,
        attackCooldown: 1.2,
        scale: 1.42,
      },
    },
  },
  {
    id: 'comic-pop',
    index: '05',
    title: 'Comic Pop Strikeforce',
    subtitle: 'Bold Graphic Novel',
    tag: 'Halftone Pop Ink',
    summary:
      'High-impact graphic novel ink lines, halftone shading dots, electric cobalt vs. crimson-orange contrast, skewed comic plaques, and starburst impact callouts.',
    eraLabel: 'ISSUE #4 · MECH UPRISING',
    battleLabel: 'SECTOR 7 · OVERPASS',
    playerBaseName: 'Aegis Bunker',
    enemyBaseName: 'Syndicate Spire',
    foodLabel: 'Energy',
    coinLabel: 'Chips',
    palette: {
      skyTop: '#F8EFE0',
      skyBottom: '#FCD5A8',
      horizon: '#6B7280',
      groundMain: '#4B5563',
      groundTrack: '#374151',
      groundShadow: 'rgba(17, 24, 39, 0.36)',
      ink: '#111827',
      allyPrimary: '#1D4ED8',
      allySecondary: '#60A5FA',
      enemyPrimary: '#EA580C',
      enemySecondary: '#FDBA74',
      accent: '#FACC15',
      accentText: '#111827',
      panelBg: '#FFFDF5',
      panelBorder: '#111827',
      panelText: '#111827',
      mutedText: '#4B5563',
      hpAlly: '#2563EB',
      hpEnemy: '#EA580C',
      foodBar: '#FACC15',
      dmgText: '#EA580C',
    },
    swatches: ['#F8EFE0', '#1D4ED8', '#EA580C', '#FACC15', '#111827'],
    units: {
      melee: {
        role: 'melee',
        name: 'Brawler',
        cost: 3,
        hp: 46,
        dmg: 10,
        range: 18,
        speed: 41,
        attackCooldown: 0.74,
        scale: 1,
      },
      ranged: {
        role: 'ranged',
        name: 'Blaster',
        cost: 5,
        hp: 28,
        dmg: 12,
        range: 94,
        speed: 35,
        attackCooldown: 0.98,
        scale: 0.96,
      },
      heavy: {
        role: 'heavy',
        name: 'Iron Mech',
        cost: 10,
        hp: 162,
        dmg: 25,
        range: 25,
        speed: 25,
        attackCooldown: 1.2,
        scale: 1.44,
      },
    },
  },
  {
    id: 'ukiyo-woodblock',
    index: '06',
    title: 'Ukiyo-e War Scroll',
    subtitle: 'Woodblock Edo Chronicle',
    tag: 'Mulberry Ink Print',
    summary:
      'Carved woodblock sumi ink silhouettes on warm mulberry washi paper, Prussian indigo vs. vermilion seal stamps, cedar ridges, and brush-stroke slash effects.',
    eraLabel: 'SCROLL II · SHOGUNATE',
    battleLabel: 'PASS III · CEDAR BRIDGE',
    playerBaseName: 'Indigo Keep',
    enemyBaseName: 'Oni Torii',
    foodLabel: 'Rice',
    coinLabel: 'Koban',
    palette: {
      skyTop: '#EFE5CE',
      skyBottom: '#DFCFAF',
      horizon: '#6B7D6E',
      groundMain: '#8A9678',
      groundTrack: '#B8A482',
      groundShadow: 'rgba(28, 25, 23, 0.24)',
      ink: '#1C1917',
      allyPrimary: '#1D3557',
      allySecondary: '#457B9D',
      enemyPrimary: '#B8332A',
      enemySecondary: '#E07A5F',
      accent: '#C9962B',
      accentText: '#FFF8EA',
      panelBg: '#F3E9D2',
      panelBorder: '#1C1917',
      panelText: '#1C1917',
      mutedText: '#665848',
      hpAlly: '#1D3557',
      hpEnemy: '#B8332A',
      foodBar: '#C9962B',
      dmgText: '#B8332A',
    },
    swatches: ['#EFE5CE', '#1D3557', '#B8332A', '#C9962B', '#1C1917'],
    units: {
      melee: {
        role: 'melee',
        name: 'Spearman',
        cost: 3,
        hp: 45,
        dmg: 9,
        range: 21,
        speed: 39,
        attackCooldown: 0.78,
        scale: 1,
      },
      ranged: {
        role: 'ranged',
        name: 'Yumi',
        cost: 5,
        hp: 27,
        dmg: 12,
        range: 98,
        speed: 34,
        attackCooldown: 1.04,
        scale: 0.96,
      },
      heavy: {
        role: 'heavy',
        name: 'Kabuto',
        cost: 10,
        hp: 158,
        dmg: 24,
        range: 24,
        speed: 25,
        attackCooldown: 1.2,
        scale: 1.42,
      },
    },
  },
];

export const ART_STYLE_MAP: Record<ArtStyleId, ArtStyleSpec> = ART_STYLES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<ArtStyleId, ArtStyleSpec>
);

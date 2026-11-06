// CLAWW design tokens — ported from the design system's tokens/*.css
// (claude.ai/design project "CLAWW / Apex Pro Design System").

export const COLORS = {
  // Base surfaces (dark-only)
  bg: '#050505',
  surface: '#0F0F10',
  card: '#151517',
  cardHover: '#1A1A1D',
  cardHeaderStrip: '#1A1A1C',

  // Foreground
  fg: '#FFFFFF',
  fgGray: '#A1A1AA',
  fgGrayDim: '#71717A',
  fgGrayDimmer: '#52525B',
  // NG PHASE 1: readable greys for text (4.5:1 or better on card and bg; lib/contrast.test.ts).
  // fgGrayDim / fgGrayDimmer stay only for icons, borders and inactive tab icons, never text.
  textMuted: '#9A9AA3',
  textFaint: '#8A8A93',

  // NG PHASE 1: the Coach's Pen is one white pen everywhere.
  pen: '#FFFFFF',

  // NG PHASE 1: food ratings. Poor is grey on purpose, never red.
  ratingGood: '#4ADE80',
  ratingOkay: '#FBBF24',
  ratingPoor: '#C4C4CC',

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderHair: 'rgba(255,255,255,0.07)',

  // Workouts — blue
  blue: '#3B82F6',
  blueMid: '#2563EB',
  blueDeep: '#1D4ED8',
  /** Pale blue: the band of light that crosses the logo on the welcome animation. */
  blueTint: '#BFDBFE',
  blueDim: 'rgba(59,130,246,0.14)',
  blueBorder: 'rgba(59,130,246,0.30)',

  // Nutrition — green (positive)
  greenDeep: '#166534',
  greenMid: '#16A34A',
  green: '#22C55E',
  greenGlow: 'rgba(34,197,94,0.11)',
  greenBorder: 'rgba(34,197,94,0.22)',
  greenBorderMd: 'rgba(34,197,94,0.38)',

  // Nutrition — burgundy (caution / fats)
  burgundyDeep: '#7F1D1D',
  burgundyBright: '#B91C1C',
  burgundyText: '#EF4444',

  // Tracker — strict black & white
  trackerWhite: '#FFFFFF',
  trackerWhiteDim: '#D4D4D8',
  trackerGray: '#A1A1AA',
  trackerGrayDim: '#52525B',

  // Profile / More — amber
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.25)',

  // AI — purple
  purple: '#A855F7',
  purpleDim: 'rgba(168,85,247,0.15)',
  purpleBorder: 'rgba(168,85,247,0.28)',

  // Sleep — indigo
  indigo: '#818CF8',
  indigoDim: 'rgba(129,140,248,0.13)',
  indigoBorder: 'rgba(129,140,248,0.28)',
  indigoDeep: '#4338CA',

  // Water — sky (V2 plan color map; WaterWidget already uses this value)
  water: '#38BDF8',

  // Semantic / one-offs
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerDim: 'rgba(239,68,68,0.10)',
  dangerBorder: 'rgba(239,68,68,0.20)',
  flame: '#FF4500',
  pink: '#EC4899',
  mint: '#00D68F',
  indigo2: '#6366F1',
};

export const FONT = 'Inter';
/** NG PHASE 1: Caveat, only for the Coach's Pen notes (the one-line handwritten reason). */
export const FONT_HAND = 'Caveat';

// AppHeader/TabBar float over scrollable content now (real translucent
// material needs something behind it to blur) — these are their own
// content heights, excluding safe-area insets, which each screen adds
// back via useSafeAreaInsets() so content clears them.
export const HEADER_CONTENT_HEIGHT = 46;
export const TAB_BAR_CONTENT_HEIGHT = 52;

// Per-tab accents (bottom nav + header wordmark buckets)
export const TAB_ACCENTS: Record<string, { accent: string; wordmark: string }> = {
  index: { accent: '#FFFFFF', wordmark: '#A1A1AA' },
  workouts: { accent: '#3B82F6', wordmark: '#3B82F6' },
  nutrition: { accent: '#22C55E', wordmark: '#22C55E' },
  tracker: { accent: '#E2E8F0', wordmark: '#A1A1AA' },
  more: { accent: '#A1A1AA', wordmark: '#A1A1AA' },
};

/** `#RRGGBB` + alpha suffix helper matching the design's `accent + '18'` pattern. */
export function alpha(hex: string, suffix: string): string {
  return `${hex}${suffix}`;
}

/**
 * V2 PHASE 4.1 — one color per area, used everywhere that area appears
 * (Home, Tracker, sheets). Cards stay black; color goes only on data — lines,
 * bars, rings, section labels. The CLAWW Score stays white. Fats keep
 * COLORS.danger inside macro charts only.
 */
export const AREA_COLORS = {
  workouts: '#3B82F6',
  nutrition: '#22C55E',
  recovery: '#2DD4BF',
  sleep: '#818CF8',
  steps: '#F59E0B',
  burned: '#FB923C',
  streak: '#F472B6',
  water: COLORS.water,
  engine: '#A855F7',
  score: '#FFFFFF',
} as const;

export type Area = keyof typeof AREA_COLORS;

/** Polish step 2: each onboarding choice borrows an area colour, so the glow when picked matches the feature it leads to. */
export const GOAL_COLORS = {
  fat: AREA_COLORS.burned,
  gain: AREA_COLORS.steps,
  muscle: AREA_COLORS.workouts,
  strong: AREA_COLORS.streak,
  fit: AREA_COLORS.recovery,
} as const;

export const STYLE_COLORS = {
  gym: AREA_COLORS.workouts,
  calisthenics: AREA_COLORS.streak,
  home: AREA_COLORS.steps,
  yoga: AREA_COLORS.recovery,
  mobility: AREA_COLORS.sleep,
} as const;

/** An area color at low opacity, for icon wells and tinted strips (0..1). */
export function tint(hex: string, opacity: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

/**
 * NG PHASE 1: the textured surfaces (build plan section 5.3). Gradients run top to bottom
 * unless a component says otherwise.
 */
export const SURFACES = {
  cardTop: '#1A1A1D',
  cardBottom: '#131315',
  cardBorder: 'rgba(255,255,255,0.09)',
  topLight: 'rgba(255,255,255,0.07)',
  well: '#0B0B0C',
  sheetTop: '#1A1A1D',
  sheetBottom: '#0F0F10',
  heroBlue: ['#0F172A', '#1E3A5F', '#1D4ED8'] as const,
  heroGreen: ['#052E16', '#14532D', '#166534'] as const,
} as const;

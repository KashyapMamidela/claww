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

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderHair: 'rgba(255,255,255,0.07)',

  // Workouts — blue
  blue: '#3B82F6',
  blueMid: '#2563EB',
  blueDeep: '#1D4ED8',
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

// CLAWW showreel design tokens.
//
// The app is dark, so the film is light: warm ivory and pastel canvases make
// the dark phone screens read as the hero. Each scene owns one CLAWW area
// color (the same AREA_COLORS the app uses); the background, glows, wipes and
// accent type all take that scene's color so color and motion stay in sync.

export const FPS = 30;
/** Edit grid: 120 BPM, one beat = 15 frames. Every cut lands on a beat, so any 120 BPM track drops straight in. */
export const BEAT = 15;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** App colors, straight from app/lib/theme.ts AREA_COLORS. */
export const AREA = {
  workouts: '#3B82F6',
  nutrition: '#22C55E',
  recovery: '#2DD4BF',
  sleep: '#818CF8',
  steps: '#F59E0B',
  burned: '#FB923C',
  engine: '#A855F7',
  brand: '#2563EB',
} as const;

/** Darker cuts of each area color, for type on light backgrounds (contrast). */
export const AREA_INK = {
  workouts: '#1D4ED8',
  nutrition: '#15803D',
  recovery: '#0F766E',
  sleep: '#4F46E5',
  steps: '#B45309',
  engine: '#7E22CE',
  brand: '#1E40AF',
} as const;

export const INK = '#0B0B0C';
export const INK_SOFT = '#4B4B52';
export const IVORY = '#F3F0E9';

/** The app's own dark surfaces, used inside the phone screens. */
export const APP = {
  bg: '#050505',
  surface: '#0F0F10',
  card: '#151517',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  fg: '#FFFFFF',
  gray: '#A1A1AA',
  grayDim: '#71717A',
  grayDimmer: '#52525B',
  green: '#22C55E',
  danger: '#EF4444',
  amber: '#F59E0B',
} as const;

/** Light canvas per scene: base, and the glow color that drifts behind the content. */
export const CANVAS = {
  ivory: { base: '#F3F0E9', glow: '#E8DFFF' },
  engine: { base: '#F2EEFB', glow: '#D9C6FB' },
  workouts: { base: '#ECF1FC', glow: '#BCD2FB' },
  recovery: { base: '#E9F6F3', glow: '#B4EDE3' },
  nutrition: { base: '#EDF6EE', glow: '#C2EBCB' },
  tracker: { base: '#EEF0FA', glow: '#C9CEF6' },
  brand: { base: '#2563EB', glow: '#5B8CF5' },
} as const;

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

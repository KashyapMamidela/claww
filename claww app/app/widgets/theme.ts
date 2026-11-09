// One look for every CLAWW widget, taken from the app: the same area colours and Bricolage Grotesque, on dark glass.

export const W = {
  text: '#FFFFFF',
  muted: 'rgba(255, 255, 255, 0.62)',
  faint: 'rgba(255, 255, 255, 0.45)',
  track: 'rgba(255, 255, 255, 0.14)',
  button: 'rgba(255, 255, 255, 0.14)',
  // label tints, lighter than the app's so they read on glass
  workout: '#60A5FA',
  food: '#4ADE80',
  recovery: '#5EEAD4',
  steps: '#FCD34D',
  stepsFill: '#F59E0B',
  streak: '#FDBA74',
  water: '#38BDF8',
  waterLabel: '#7DD3FC',
  protein: '#F9A8D4',
  proteinBar: '#F472B6',
  carbs: '#FCD34D',
  carbsBar: '#F59E0B',
  fat: '#7DD3FC',
  fatBar: '#38BDF8',
  over: '#F59E0B',
  radius: 26,
  pad: 16,
  // ring colours stay the app's own
  ringWorkout: '#3B82F6',
  ringFood: '#22C55E',
  ringRecovery: '#2DD4BF',
} as const;

/** Bricolage Grotesque files copied into the build by the widget plugin (see app.json); missing ones fall back to Roboto. */
export const F = {
  m: 'BricolageGrotesque_500Medium',
  sb: 'BricolageGrotesque_600SemiBold',
  b: 'BricolageGrotesque_700Bold',
  xb: 'BricolageGrotesque_800ExtraBold',
} as const;

/** Glass tints per widget: [top-left pool, bottom-right pool]. */
export const GLASS = {
  rings: ['#3B82F6', '#2DD4BF'],
  food: ['#22C55E', '#22C55E'],
  steps: ['#F59E0B', '#FB7185'],
  water: ['#38BDF8', '#6366F1'],
} as const;

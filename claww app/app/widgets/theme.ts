// One look for every CLAWW widget, taken from the app: the smoked dark card, Bricolage Grotesque, the same area colours.

export const W = {
  bgFrom: '#1A1A20',
  bgTo: '#0B0B0E',
  border: 'rgba(255, 255, 255, 0.08)',
  well: 'rgba(255, 255, 255, 0.06)',
  text: '#F4F4F5',
  muted: '#A1A1AA',
  faint: '#71717A',
  workout: '#3B82F6',
  food: '#22C55E',
  recovery: '#2DD4BF',
  steps: '#F59E0B',
  streak: '#FB923C',
  water: '#38BDF8',
  protein: '#F472B6',
  carbs: '#F59E0B',
  fat: '#38BDF8',
  over: '#F59E0B',
  radius: 26,
  pad: 16,
} as const;

/** Bricolage Grotesque files copied into the build by the widget plugin (see app.json); missing ones fall back to Roboto. */
export const F = {
  m: 'BricolageGrotesque_500Medium',
  sb: 'BricolageGrotesque_600SemiBold',
  b: 'BricolageGrotesque_700Bold',
  xb: 'BricolageGrotesque_800ExtraBold',
} as const;

export const card = {
  height: 'match_parent' as const,
  width: 'match_parent' as const,
  borderRadius: W.radius,
  borderWidth: 1,
  borderColor: W.border,
  backgroundGradient: { from: W.bgFrom, to: W.bgTo, orientation: 'TL_BR' as const },
  padding: W.pad,
};

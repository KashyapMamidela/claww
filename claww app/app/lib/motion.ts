import { Easing, Keyframe, ReduceMotion } from 'react-native-reanimated';

// NG PHASE 1: the motion rules from build plan section 5.5, in one place.
// Cards rise once on first mount; rings fill once; the pen underline draws once;
// a hero's sheen sweeps once. Nothing loops. With the phone's Reduce motion on,
// nothing rises or sweeps and rings appear filled (Reanimated's ReduceMotion.System).

export const MOTION = {
  riseDistance: 10,
  riseDuration: 320,
  riseStagger: 40,
  /** Only the first few cards stagger; the rest rise with the last one, so a long list never waits. */
  riseMaxStaggered: 8,
  ringFillDuration: 1200,
  penDrawDuration: 350,
  sheenDuration: 1100,
  pressScale: 0.96,
} as const;

/** Strong ease-out for UI (animate-expo skill). */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Delay before card `index` (0-based) rises in. */
export function riseDelay(index: number): number {
  const i = Math.max(0, Math.min(Math.floor(index), MOTION.riseMaxStaggered));
  return i * MOTION.riseStagger;
}

/**
 * Layout animation for a card on first mount: up 10 px and fade in, 40 ms after the card before it.
 * Use as `entering={riseIn(i)}` on an `Animated.View`. Respects the system's Reduce motion.
 */
export function riseIn(index = 0) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: MOTION.riseDistance }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
  })
    .duration(MOTION.riseDuration)
    .delay(riseDelay(index))
    .reduceMotion(ReduceMotion.System);
}

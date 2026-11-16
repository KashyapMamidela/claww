import { Easing, interpolate, spring } from 'remotion';

/** Strong ease-out: the default for anything entering. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** For things moving across the frame. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/** Exits accelerate away. */
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** interpolate() clamped, with an easing: `tween(frame, 10, 25, 0, 1)`. */
export function tween(frame: number, start: number, end: number, from: number, to: number, easing = EASE_OUT): number {
  return interpolate(frame, [start, end], [from, to], { ...CLAMP, easing });
}

/** A spring that starts at `delay` frames. 0 -> 1, with a little life in it. */
export function pop(frame: number, fps: number, delay = 0, damping = 14, stiffness = 140): number {
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.9 } });
}

/** A spring with no overshoot, for heavy objects like the phone. */
export function settle(frame: number, fps: number, delay = 0): number {
  return spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 90 } });
}

/** Counts a number up between two frames, rounded to `decimals`. */
export function countUp(frame: number, start: number, end: number, from: number, to: number, decimals = 0): string {
  const v = tween(frame, start, end, from, to, EASE_OUT);
  return v.toFixed(decimals);
}

export const SLEEP_TARGET_HOURS = 8;

/** Last night's logged sleep as a percentage of the 8-hour target, capped at
 * 100. No log (null) or a non-positive value is 0, never a guess. */
export function sleepRingPct(hours: number | null | undefined): number {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min((hours / SLEEP_TARGET_HOURS) * 100, 100);
}

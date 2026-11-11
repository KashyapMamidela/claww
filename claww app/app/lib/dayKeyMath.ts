// Pure date helper for useDayKey (kept apart so tests don't load react-native).

/** Milliseconds from `now` until the next local midnight (at least 1 s, so a timer never fires twice at 00:00). */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

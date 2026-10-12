export const SLEEP_TARGET_HOURS = 8;

/** Last night's logged sleep as a percentage of the 8-hour target, capped at
 * 100. No log (null) or a non-positive value is 0, never a guess. */
export function sleepRingPct(hours: number | null | undefined): number {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min((hours / SLEEP_TARGET_HOURS) * 100, 100);
}

export type SleepQuality = 'Good' | 'Fair' | 'Short';

/** Plain-word quality for a night: 7 h or more is Good, 6 to under 7 Fair, under 6 Short. */
export function sleepQuality(hours: number): SleepQuality {
  if (hours >= 7) return 'Good';
  if (hours >= 6) return 'Fair';
  return 'Short';
}

/** Hours per local day for the last 7 days ending today (oldest first); null where nothing was logged. Latest log of a day wins. */
export function lastSevenNights(logs: { hours: number; logged_at: string }[], now: Date): (number | null)[] {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const byDay = new Map<string, { hours: number; at: number }>();
  for (const l of logs) {
    const at = new Date(l.logged_at).getTime();
    const k = key(new Date(at));
    const prev = byDay.get(k);
    if (!prev || at > prev.at) byDay.set(k, { hours: l.hours, at });
  }
  const out: (number | null)[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(byDay.get(key(d))?.hours ?? null);
  }
  return out;
}

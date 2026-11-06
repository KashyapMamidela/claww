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

/** Longest gap between waking and now at which a night still counts as "last night". */
export const LAST_NIGHT_WINDOW_HOURS = 18;

interface SleepLike {
  wake_time: string | null;
  logged_at: string;
}

const sameLocalDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const wokeAt = (l: SleepLike) => new Date(l.wake_time ?? l.logged_at).getTime();

/**
 * Polish step 1: the one definition of last night's sleep, used by Home, the coach line, the Recovery note and the
 * Tracker. It is the log whose wake time is today; failing that, the most recent log whose wake time is within 18 hours
 * of now. It does not depend on when the entry was typed in, so a night logged before midnight, or the evening after,
 * still counts. null when there is none.
 */
export function lastNightSleep<T extends SleepLike>(logs: T[], now: Date): T | null {
  const newestFirst = [...logs].sort((a, b) => wokeAt(b) - wokeAt(a));
  const today = newestFirst.find((l) => sameLocalDay(new Date(wokeAt(l)), now));
  if (today) return today;
  const limit = now.getTime() - LAST_NIGHT_WINDOW_HOURS * 3600 * 1000;
  return newestFirst.find((l) => wokeAt(l) >= limit && wokeAt(l) <= now.getTime()) ?? null;
}

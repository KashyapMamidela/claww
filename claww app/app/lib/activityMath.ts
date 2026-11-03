// Pure helpers for Home's Steps and Streak sheets (V2 PHASE 4.2). No RN or
// Supabase imports, so Vitest can test them.

export const DEFAULT_STEPS_GOAL = 8000;

export interface TimeRange {
  start: Date;
  end: Date;
}

/** One range per hour of today, from midnight to the current hour (the last one ends at `now`). */
export function hourlyRanges(now: Date): TimeRange[] {
  const out: TimeRange[] = [];
  for (let h = 0; h <= now.getHours(); h++) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
    const end = h === now.getHours() ? new Date(now) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1, 0, 0, 0);
    out.push({ start, end });
  }
  return out;
}

/** One range per calendar day for the last `days` days, oldest first; today's ends at `now`. */
export function dailyRanges(now: Date, days: number): TimeRange[] {
  const out: TimeRange[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
    const end = i === 0 ? new Date(now) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1, 0, 0, 0, 0);
    out.push({ start, end });
  }
  return out;
}

/**
 * Walking distance from steps. Stride ≈ 0.415 × height (a standard walking
 * estimate); 170 cm when height isn't set. An estimate, labelled as one.
 */
export function stepsToKm(steps: number, heightCm: number | null): number {
  const stride = ((heightCm && heightCm > 0 ? heightCm : 170) * 0.415) / 100;
  return Math.round(((steps * stride) / 1000) * 100) / 100;
}

export interface DayActivity {
  sleep: boolean;
  meal: boolean;
  workout: boolean;
}

export interface StreakGridDay {
  date: Date;
  active: boolean;
  reasons: DayActivity;
  isToday: boolean;
}

export interface StreakStats {
  current: number;
  best: number;
  grid: StreakGridDay[];
}

/** Key a day the same way getActivityStreak does (local toDateString). */
export function dayKey(d: Date): string {
  return d.toDateString();
}

/**
 * Current streak by getActivityStreak's rule (consecutive days with a sleep,
 * meal or workout log, ending today — or yesterday if nothing's logged today
 * yet), the best run in the data, and a grid of the last `gridDays` days.
 */
export function streakStats(days: Map<string, DayActivity>, now: Date, gridDays = 21): StreakStats {
  const isActive = (d: Date) => {
    const a = days.get(dayKey(d));
    return !!a && (a.sleep || a.meal || a.workout);
  };

  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!isActive(cursor)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (isActive(cursor)) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const activeTimes = [...days.entries()]
    .filter(([, a]) => a.sleep || a.meal || a.workout)
    .map(([k]) => new Date(k).getTime())
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of activeTimes) {
    const consecutive = prev !== null && Math.round((t - prev) / 86_400_000) === 1;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  best = Math.max(best, current);

  const grid: StreakGridDay[] = [];
  for (let i = gridDays - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const reasons = days.get(dayKey(date)) ?? { sleep: false, meal: false, workout: false };
    grid.push({ date, active: reasons.sleep || reasons.meal || reasons.workout, reasons, isToday: i === 0 });
  }

  return { current, best, grid };
}

/** The last 7 days (oldest first) as active/inactive, for the Streak tile's week hint. */
export function lastSevenDays(days: Map<string, DayActivity>, now: Date): boolean[] {
  return streakStats(days, now, 7).grid.map((d) => d.active);
}

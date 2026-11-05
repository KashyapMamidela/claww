// NG PHASE 11.2: the trend reader. Deterministic: reads the last 1 to 4 weeks of the user's own logs and reports what it
// found. It decides nothing; penRules.ts maps each finding to one allowed change. Pure.

export type Slot = 'breakfast' | 'lunch' | 'dinner';

export interface LiftHistory {
  name: string;
  /** One entry per session, oldest first: the best estimated one-rep max of that session. */
  sessions: { date: string; e1rm: number }[];
}

export interface MealEntry {
  date: string;
  slot: Slot;
  protein: number;
  skipped: boolean;
}

export interface TrendInput {
  /** Today, YYYY-MM-DD (local). */
  today: string;
  goal: 'muscle_gain' | 'fat_loss' | 'maintain' | 'other';
  lifts: LiftHistory[];
  meals: MealEntry[];
  proteinTarget: number | null;
  sleep: { date: string; hours: number }[];
  weights: { date: string; kg: number }[];
  /** Planned sessions in the past 28 days with whether each was done. */
  plannedDays: { date: string; weekday: string; done: boolean }[];
}

export type Finding =
  | { type: 'stalled_lift'; name: string; sessions: number; e1rm: number }
  | { type: 'progress_streak'; name: string; count: number; fromE1rm: number; toE1rm: number }
  | { type: 'protein_miss'; slot: Slot; days: number; avgG: number; targetG: number }
  | { type: 'short_sleep'; nights: number; avgHours: number }
  | { type: 'skipped_meals'; slot: Slot; count: number }
  | { type: 'missed_days'; weekday: string; count: number; dates: string[] }
  | { type: 'flat_weight'; weeks: number; deltaKg: number; kg: number; goal: 'muscle_gain' | 'fat_loss' };

export const SLOT_SHARE: Record<Slot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.4 };
export const PROTEIN_MISS_RATIO = 0.7;
export const PROTEIN_MISS_DAYS = 3;
export const SHORT_SLEEP_HOURS = 6.5;
export const SKIPPED_MEALS_MIN = 2;
export const MISSED_DAYS_MIN = 2;
export const FLAT_WEIGHT_KG = 0.3;
export const FLAT_WEIGHT_MIN_DAYS = 14;

const DAY = 86_400_000;
const ms = (key: string) => new Date(`${key}T00:00:00`).getTime();
const within = (today: string, key: string, days: number) => ms(today) - ms(key) < days * DAY && ms(key) <= ms(today);

export function readTrends(i: TrendInput): Finding[] {
  const out: Finding[] = [];

  for (const lift of i.lifts) {
    const s = lift.sessions;
    if (s.length >= 4) {
      const last3 = s.slice(-3);
      const priorBest = Math.max(...s.slice(0, -3).map((x) => x.e1rm));
      if (last3.every((x) => x.e1rm <= priorBest)) out.push({ type: 'stalled_lift', name: lift.name, sessions: 3, e1rm: Math.round(priorBest * 10) / 10 });
    }
    if (s.length >= 4) {
      const t = s.slice(-4);
      if (t[1].e1rm > t[0].e1rm && t[2].e1rm > t[1].e1rm && t[3].e1rm > t[2].e1rm) {
        out.push({ type: 'progress_streak', name: lift.name, count: 3, fromE1rm: Math.round(t[0].e1rm * 10) / 10, toE1rm: Math.round(t[3].e1rm * 10) / 10 });
      }
    }
  }

  // Protein by meal over the last 7 days: a meal that is under 70 % of its share on 3 or more days.
  if (i.proteinTarget && i.proteinTarget > 0) {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as Slot[]) {
      const rows = i.meals.filter((m) => m.slot === slot && !m.skipped && within(i.today, m.date, 7));
      const share = i.proteinTarget * SLOT_SHARE[slot];
      const low = rows.filter((m) => m.protein < share * PROTEIN_MISS_RATIO);
      if (rows.length >= PROTEIN_MISS_DAYS && low.length >= PROTEIN_MISS_DAYS) {
        const avg = low.reduce((s, m) => s + m.protein, 0) / low.length;
        out.push({ type: 'protein_miss', slot, days: low.length, avgG: Math.round(avg), targetG: Math.round(share) });
      }
    }
  }

  // Short sleep: the two most recent nights, on consecutive dates, both under 6.5 h.
  const nights = [...i.sleep].filter((n) => within(i.today, n.date, 4)).sort((a, b) => b.date.localeCompare(a.date));
  if (nights.length >= 2 && ms(nights[0].date) - ms(nights[1].date) === DAY && nights[0].hours < SHORT_SLEEP_HOURS && nights[1].hours < SHORT_SLEEP_HOURS) {
    out.push({ type: 'short_sleep', nights: 2, avgHours: Math.round(((nights[0].hours + nights[1].hours) / 2) * 10) / 10 });
  }

  for (const slot of ['breakfast', 'lunch', 'dinner'] as Slot[]) {
    const n = i.meals.filter((m) => m.slot === slot && m.skipped && within(i.today, m.date, 7)).length;
    if (n >= SKIPPED_MEALS_MIN) out.push({ type: 'skipped_meals', slot, count: n });
  }

  const missed = i.plannedDays.filter((d) => !d.done && within(i.today, d.date, 14) && d.date < i.today);
  if (missed.length >= MISSED_DAYS_MIN) {
    const byDay = new Map<string, string[]>();
    for (const d of missed) byDay.set(d.weekday, [...(byDay.get(d.weekday) ?? []), d.date]);
    const top = [...byDay.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
    out.push({ type: 'missed_days', weekday: top[0], count: missed.length, dates: top[1].sort() });
  }

  // Flat weight against the goal: at least 3 logs over 14+ days, first half and second half within 0.3 kg.
  if (i.goal === 'muscle_gain' || i.goal === 'fat_loss') {
    const w = [...i.weights].filter((x) => within(i.today, x.date, 28)).sort((a, b) => a.date.localeCompare(b.date));
    if (w.length >= 3 && ms(w[w.length - 1].date) - ms(w[0].date) >= FLAT_WEIGHT_MIN_DAYS * DAY) {
      const half = Math.floor(w.length / 2);
      const avg = (xs: { kg: number }[]) => xs.reduce((s, x) => s + x.kg, 0) / xs.length;
      const first = avg(w.slice(0, half));
      const second = avg(w.slice(w.length - half));
      const delta = second - first;
      if (Math.abs(delta) < FLAT_WEIGHT_KG) out.push({ type: 'flat_weight', weeks: Math.max(2, Math.round((ms(w[w.length - 1].date) - ms(w[0].date)) / (7 * DAY))), deltaKg: Math.round(delta * 10) / 10, kg: Math.round(second * 10) / 10, goal: i.goal });
    }
  }

  return out;
}

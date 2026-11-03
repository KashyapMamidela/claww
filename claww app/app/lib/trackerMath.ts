// The numbers behind the Tracker (V2 PHASE 9). Pure and deterministic: data
// rows in, series out. No model is involved anywhere, including the insight
// line, which is worded from these computed numbers.

import { catalogKey, MAJOR_MUSCLES, type Catalog } from './muscleRecovery';

export type Range = 'week' | 'month' | 'all';

// ─── Sets ───────────────────────────────────────────────────────────────────

export interface TrainLog {
  exerciseName: string;
  completedAt: string;
  reps: number;
  weight: number;
}

export interface RawSetRow {
  exercise_name: string;
  reps_achieved: number | null;
  reps_prescribed: number | null;
  weight_achieved: number | null;
  weight_prescribed: number | null;
  completed_at: string;
}

/** Achieved values win; prescribed ones fill gaps (the same convention as the rest of the app). */
export function toTrainLogs(rows: RawSetRow[]): TrainLog[] {
  return rows.map((r) => ({
    exerciseName: r.exercise_name,
    completedAt: r.completed_at,
    reps: r.reps_achieved ?? r.reps_prescribed ?? 0,
    weight: r.weight_achieved ?? r.weight_prescribed ?? 0,
  }));
}

/** Epley estimated one-rep max: weight x (1 + reps / 30); one rep is the weight itself. 0 when it cannot be estimated. */
export function epley1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return Math.round(weight * 10) / 10;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ─── Time buckets ───────────────────────────────────────────────────────────

export type BucketKind = 'day' | 'week' | 'month';

export interface Bucket {
  start: Date;
  /** Exclusive. */
  end: Date;
  label: string;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function mondayOf(d: Date): Date {
  const s = startOfDay(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7));
}

/** `n` buckets of the given size, oldest first, the last one containing `now`. */
export function makeBuckets(kind: BucketKind, n: number, now: Date): Bucket[] {
  const out: Bucket[] = [];
  const today = startOfDay(now);
  for (let i = n - 1; i >= 0; i--) {
    let start: Date;
    let end: Date;
    let label: string;
    if (kind === 'day') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      label = n <= 7 ? start.toLocaleDateString([], { weekday: 'narrow' }) : (n - 1 - i) % 5 === 4 ? `${start.getDate()}` : '';
    } else if (kind === 'week') {
      const monday = mondayOf(today);
      start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      label = n <= 6 || (n - 1 - i) % 2 === 0 ? `${start.getDate()}/${start.getMonth() + 1}` : '';
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      label = start.toLocaleDateString([], { month: 'short' }).slice(0, 3);
    }
    out.push({ start, end, label });
  }
  return out;
}

/** The buckets for a chart's range: Week = 7 days, Month = the last 5 weeks, All = the last 12 months. */
export function bucketsForRange(range: Range, now: Date): Bucket[] {
  if (range === 'week') return makeBuckets('day', 7, now);
  if (range === 'month') return makeBuckets('week', 5, now);
  return makeBuckets('month', 12, now);
}

export function bucketIndex(iso: string | Date, buckets: Bucket[]): number {
  const t = (iso instanceof Date ? iso : new Date(iso)).getTime();
  return buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
}

// ─── Strength trend ─────────────────────────────────────────────────────────

export interface LiftSeries {
  name: string;
  /** Best estimated 1RM in each bucket, null where the lift wasn't trained. */
  values: (number | null)[];
  /** First and last known values, and their difference (null with fewer than two points). */
  first: number | null;
  last: number | null;
  delta: number | null;
}

/** The user's most-trained main lifts (loadable, role main), by sets logged. Ties break by name. */
export function pickMainLifts(logs: TrainLog[], catalog: Catalog, count = 3): string[] {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const e = catalog[catalogKey(l.exerciseName)];
    if (!e || e.role !== 'main' || e.loadable !== true || !(l.weight > 0) || !(l.reps > 0)) continue;
    counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([name]) => name);
}

export function strengthSeries(logs: TrainLog[], lifts: string[], buckets: Bucket[]): LiftSeries[] {
  return lifts.map((name) => {
    const key = catalogKey(name);
    const values: (number | null)[] = buckets.map(() => null);
    for (const l of logs) {
      if (catalogKey(l.exerciseName) !== key) continue;
      const i = bucketIndex(l.completedAt, buckets);
      if (i === -1) continue;
      const e = epley1RM(l.weight, l.reps);
      if (e > 0 && (values[i] === null || e > (values[i] as number))) values[i] = e;
    }
    const known = values.filter((v): v is number => v !== null);
    const first = known.length ? known[0] : null;
    const last = known.length ? known[known.length - 1] : null;
    return { name, values, first, last, delta: known.length >= 2 ? Math.round(((last as number) - (first as number)) * 10) / 10 : null };
  });
}

// ─── Weekly sets per muscle ─────────────────────────────────────────────────

/** Sets per week per muscle the bars are measured against (a design threshold, like the 3-workout unlock). */
export const WEEKLY_SETS_TARGET = 10;
const SECONDARY_SHARE = 0.5;

/** Effective sets per major muscle between two dates: a set counts 1 for its primary muscle and half for each secondary. */
export function setsPerMuscle(logs: TrainLog[], catalog: Catalog, from: Date, to: Date): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(MAJOR_MUSCLES.map((m) => [m, 0]));
  for (const l of logs) {
    const t = new Date(l.completedAt).getTime();
    if (t < from.getTime() || t >= to.getTime()) continue;
    const e = catalog[catalogKey(l.exerciseName)];
    if (!e) continue;
    if (e.primaryMuscle && e.primaryMuscle in out) out[e.primaryMuscle] += 1;
    for (const m of e.secondaryMuscles) if (m in out) out[m] += SECONDARY_SHARE;
  }
  for (const m of Object.keys(out)) out[m] = Math.round(out[m] * 10) / 10;
  return out;
}

/** Total effective sets (all muscles) per bucket, for the weekly-sets trend. */
export function totalSetsByBucket(logs: TrainLog[], catalog: Catalog, buckets: Bucket[]): number[] {
  return buckets.map((b) => {
    const per = setsPerMuscle(logs, catalog, b.start, b.end);
    return Math.round(Object.values(per).reduce((a, c) => a + c, 0) * 10) / 10;
  });
}

// ─── Consistency ────────────────────────────────────────────────────────────

export interface ConsistencyGrid {
  /** weeks[w][d]: true = trained, false = didn't, null = in the future. d is Monday 0 ... Sunday 6; w is oldest first. */
  weeks: (boolean | null)[][];
  sessions: number;
}

/** A day counts as a session when any set was logged on it (the same convention as getCompletedWorkoutDays). */
export function consistencyGrid(logs: TrainLog[], now: Date, weekCount: number): ConsistencyGrid {
  const days = new Set(logs.map((l) => startOfDay(new Date(l.completedAt)).getTime()));
  const monday = mondayOf(now);
  const today = startOfDay(now).getTime();
  const weeks: (boolean | null)[][] = [];
  let sessions = 0;
  for (let w = weekCount - 1; w >= 0; w--) {
    const row: (boolean | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - w * 7 + d);
      const t = day.getTime();
      if (t > today) row.push(null);
      else {
        const hit = days.has(t);
        if (hit) sessions += 1;
        row.push(hit);
      }
    }
    weeks.push(row);
  }
  return { weeks, sessions };
}

// ─── Personal records ───────────────────────────────────────────────────────

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  /** Estimated 1RM for loaded sets; the rep count for bodyweight ones. */
  score: number;
  achievedAt: string;
}

/** Each exercise's best set (highest estimated 1RM, or most reps for bodyweight), the most recent records first. */
export function personalRecords(logs: TrainLog[], limit = 3): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const l of logs) {
    if (!(l.reps > 0)) continue;
    const score = l.weight > 0 ? epley1RM(l.weight, l.reps) : l.reps;
    const key = catalogKey(l.exerciseName);
    const cur = best.get(key);
    const better = !cur || score > cur.score || (score === cur.score && l.completedAt < cur.achievedAt);
    if (better) best.set(key, { exerciseName: l.exerciseName, weight: l.weight, reps: l.reps, score, achievedAt: l.completedAt });
  }
  return [...best.values()].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)).slice(0, limit);
}

// ─── Nutrition and sleep ────────────────────────────────────────────────────

export interface MealRow {
  calories: number | null;
  protein_g: number | null;
  logged_at: string;
}

export interface NutritionDay {
  calories: number;
  proteinG: number;
  logged: boolean;
  /** Distinct calendar days with a meal in the bucket (for per-day averages over weeks and months). */
  loggedDays: number;
}

/** Calories and protein for each bucket (days), summed. */
export function nutritionByBucket(meals: MealRow[], buckets: Bucket[]): NutritionDay[] {
  const out: NutritionDay[] = buckets.map(() => ({ calories: 0, proteinG: 0, logged: false, loggedDays: 0 }));
  const seen = buckets.map(() => new Set<number>());
  for (const m of meals) {
    const i = bucketIndex(m.logged_at, buckets);
    if (i === -1) continue;
    out[i].calories += m.calories ?? 0;
    out[i].proteinG += m.protein_g ?? 0;
    out[i].logged = true;
    seen[i].add(startOfDay(new Date(m.logged_at)).getTime());
  }
  out.forEach((o, i) => (o.loggedDays = seen[i].size));
  return out;
}

/** A day hits its protein target at this share of it. */
export const PROTEIN_HIT_SHARE = 0.9;

export function proteinHitDays(days: NutritionDay[], targetG: number | null): number | null {
  if (!targetG || targetG <= 0) return null;
  return days.filter((d) => d.logged && d.proteinG >= targetG * PROTEIN_HIT_SHARE).length;
}

/** Protein per logged day in each bucket (a day bucket is just that day's total); null where nothing was logged. */
export function proteinPerDay(days: NutritionDay[]): (number | null)[] {
  return days.map((d) => (d.loggedDays > 0 ? Math.round(d.proteinG / d.loggedDays) : null));
}

export function averageCalories(days: NutritionDay[]): number | null {
  const logged = days.filter((d) => d.logged);
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);
}

export interface SleepSummary {
  averageHours: number | null;
  nightsLogged: number;
  nightsUnder: number;
}

/** Hours below which a night counts as short in the summary. */
export const SHORT_NIGHT_HOURS = 6.5;

export function summarizeSleep(nights: (number | null)[]): SleepSummary {
  const known = nights.filter((n): n is number => n !== null);
  return {
    averageHours: known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : null,
    nightsLogged: known.length,
    nightsUnder: known.filter((n) => n < SHORT_NIGHT_HOURS).length,
  };
}

export interface SleepRow {
  hours: number | null;
  logged_at: string;
}

/** Average hours slept per bucket (a day bucket is that night); null where nothing was logged. */
export function sleepByBucket(rows: SleepRow[], buckets: Bucket[]): (number | null)[] {
  const sums = buckets.map(() => ({ total: 0, n: 0 }));
  for (const r of rows) {
    if (r.hours === null || r.hours <= 0) continue;
    const i = bucketIndex(r.logged_at, buckets);
    if (i === -1) continue;
    sums[i].total += r.hours;
    sums[i].n += 1;
  }
  return sums.map((x) => (x.n > 0 ? Math.round((x.total / x.n) * 10) / 10 : null));
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 60 ? `${h + 1}h 00m` : `${h}h ${String(m).padStart(2, '0')}m`;
}

// ─── Insight ────────────────────────────────────────────────────────────────

export interface InsightInput {
  /** Effective sets per muscle for this week and the one before. */
  thisWeekSets: Record<string, number>;
  lastWeekSets: Record<string, number>;
  /** Lowest per-muscle recovery score right now, when known. */
  lowestMuscle: { muscle: string; score: number } | null;
  proteinHits: number | null;
  nutritionDaysLogged: number;
  sleep: SleepSummary;
  sessionsLast4Weeks: number;
}

export interface Insight {
  text: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One line, picked by fixed rules and written from the numbers (no model):
 * 1. a muscle under half the weekly target two weeks running,
 * 2. protein target missed on most logged days,
 * 3. short sleep on several nights,
 * 4. otherwise a plain consistency line.
 */
export function buildInsight(i: InsightInput): Insight {
  const half = WEEKLY_SETS_TARGET / 2;
  const lagging = MAJOR_MUSCLES.filter((m) => (i.thisWeekSets[m] ?? 0) < half && (i.lastWeekSets[m] ?? 0) < half).sort(
    (a, b) => (i.thisWeekSets[a] ?? 0) + (i.lastWeekSets[a] ?? 0) - ((i.thisWeekSets[b] ?? 0) + (i.lastWeekSets[b] ?? 0))
  );
  if (i.sessionsLast4Weeks >= 4 && lagging.length > 0) {
    const m = lagging[0];
    const recovery = i.lowestMuscle && i.lowestMuscle.muscle === m ? ` Its recovery score is ${i.lowestMuscle.score}.` : '';
    return {
      text: `${cap(m)} is under target for the second week: ${i.thisWeekSets[m] ?? 0} sets this week and ${i.lastWeekSets[m] ?? 0} last week, against ${WEEKLY_SETS_TARGET}.${recovery}`,
    };
  }
  if (i.proteinHits !== null && i.nutritionDaysLogged >= 4 && i.proteinHits <= Math.floor(i.nutritionDaysLogged / 2)) {
    return { text: `Protein target hit on ${i.proteinHits} of the ${i.nutritionDaysLogged} days you logged meals. A protein-first meal each day would close the gap.` };
  }
  if (i.sleep.nightsLogged >= 4 && i.sleep.nightsUnder >= 3) {
    return { text: `${i.sleep.nightsUnder} of ${i.sleep.nightsLogged} logged nights were under ${SHORT_NIGHT_HOURS} hours, averaging ${formatHours(i.sleep.averageHours ?? 0)}. Sleep is the cheapest recovery there is.` };
  }
  if (i.sessionsLast4Weeks > 0) {
    return { text: `${i.sessionsLast4Weeks} training day${i.sessionsLast4Weeks === 1 ? '' : 's'} in the last 4 weeks. Keep the rhythm and the numbers will follow.` };
  }
  return { text: 'Log a few sessions and CLAWW will start pointing out what to adjust.' };
}

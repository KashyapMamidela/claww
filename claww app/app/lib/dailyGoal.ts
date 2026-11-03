// NG PHASE 2: Home's Daily Progress rings are Workout, Nutrition and Recovery
// (build plan section 2). Sleep keeps its own row and Tracker card, so it isn't
// counted twice: it already feeds the Recovery score.
//
//   Workout    today's planned session: done = 100, partly done = sets done / sets planned,
//              nothing planned today (a rest day) = 100, so a rest day doesn't drag the goal down
//   Nutrition  calories eaten / target (the raw value can pass 100 for the ring's overflow arc)
//   Recovery   the one recovery score, 0..100
//   Daily Goal the average of the rings that have data

import { isWeekdayPlan, localWeekday, weekdayIndex } from './trainingWeek';

export interface WorkoutToday {
  /** A session is planned for today. */
  planned: boolean;
  /** Today's session was finished (a 'completed' day event today). */
  completed: boolean;
  /** Sets logged today, local date. */
  setsDone: number;
  /** Sets in today's planned session. */
  setsPlanned: number;
}

export function workoutRingPct(w: WorkoutToday): number {
  if (!w.planned || w.completed) return 100;
  if (w.setsPlanned <= 0) return 0;
  return Math.max(0, Math.min(100, (w.setsDone / w.setsPlanned) * 100));
}

/** Unclamped, so the ring can draw its overflow arc on a day well past target. */
export function nutritionRingPctRaw(consumedKcal: number, targetKcal: number): number {
  if (!(targetKcal > 0)) return 0;
  return Math.max(0, (consumedKcal / targetKcal) * 100);
}

export function nutritionRingPct(consumedKcal: number, targetKcal: number): number {
  return Math.min(100, nutritionRingPctRaw(consumedKcal, targetKcal));
}

export function recoveryRingPct(score: number | null | undefined): number | null {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, score));
}

/** Average of the rings that have data, rounded. Recovery is left out until there is a score. */
export function dailyGoalPct(workoutPct: number, nutritionPct: number, recoveryPct: number | null): number {
  const parts = [workoutPct, Math.min(100, nutritionPct), ...(recoveryPct === null ? [] : [recoveryPct])];
  return Math.round(parts.reduce((s, v) => s + v, 0) / parts.length);
}

/**
 * Is a session planned today? Weekday plans ("Monday", "Thursday"): only on those weekdays.
 * "Day 1, Day 2" plans have no calendar, so the suggested day is always today's session.
 */
export function isSessionPlannedToday(dayLabels: string[], now: Date): boolean {
  if (dayLabels.length === 0) return false;
  if (!isWeekdayPlan(dayLabels)) return true;
  const today = localWeekday(now);
  return dayLabels.some((l) => weekdayIndex(l) === today);
}

/** "Push day at 6 pm" from a session name and an optional "HH:MM" usual time. */
export function sessionTimeNote(sessionName: string, usualTime?: string | null): string {
  const m = usualTime ? /^(\d{1,2}):(\d{2})$/.exec(usualTime) : null;
  if (!m) return sessionName;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? 'am' : 'pm';
  return `${sessionName} at ${h12}${min ? `:${String(min).padStart(2, '0')}` : ''} ${suffix}`;
}

/** The Workout row: value, unit and the note under the bar, as on screens 01 and 02. */
export function workoutRow(w: WorkoutToday, sessionName: string, usualTime?: string | null): { value: string; unit: string; note: string } {
  if (!w.planned) return { value: 'Rest', unit: 'day', note: 'Nothing planned today' };
  if (w.completed) return { value: 'Done', unit: '', note: `${sessionName} · ${w.setsDone} ${w.setsDone === 1 ? 'set' : 'sets'}` };
  if (w.setsDone > 0) return { value: `${w.setsDone} / ${w.setsPlanned}`, unit: 'sets', note: `${sessionName}, in progress` };
  return { value: '0 / 1', unit: 'session', note: sessionTimeNote(sessionName, usualTime) };
}

/** The Nutrition row's note: "breakfast logged", "2 of 3 meals logged", "nothing logged yet". */
export function nutritionNote(mealTypesLogged: string[]): string {
  const unique = Array.from(new Set(mealTypesLogged.map((m) => m.toLowerCase())));
  if (unique.length === 0) return 'nothing logged yet';
  if (unique.length === 1) return `${unique[0]} logged`;
  const main = unique.filter((m) => m === 'breakfast' || m === 'lunch' || m === 'dinner').length;
  return main > 0 ? `${main} of 3 meals logged` : `${unique.length} logged`;
}

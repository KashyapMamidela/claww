// Real training weekdays (V2 PHASE 6.1, decision D13). Pure and dependency-free
// so Vitest can run it. A plan whose day labels are all weekday names is
// "dated": each pill is tied to this week's occurrence of that weekday, which
// is what makes "Missed" possible. Plans labelled "Day 1, Day 2" keep working
// exactly as before.

import type { DayEventLike, DayState } from './workoutDayState';

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Monday is 0 ... Sunday is 6; null when the label isn't a weekday ("Day 1", "Push"). */
export function weekdayIndex(label: string): number | null {
  const l = label.trim().toLowerCase();
  if (l.length < 3) return null;
  const i = WEEKDAY_NAMES.findIndex((n) => n.toLowerCase() === l || n.slice(0, 3).toLowerCase() === l);
  return i === -1 ? null : i;
}

/** Weekday index (Monday 0) of a Date, in local time. */
export function localWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

// Mirrors FREQUENCY_TABLE in supabase/functions/generate-plan/index.ts (the
// RN bundle and Deno functions can't share an import, so keep them in sync).
const FREQUENCY_TABLE: Record<string, Record<string, number>> = {
  beginner: { sedentary: 2, moderate: 3, active: 3 },
  intermediate: { sedentary: 3, moderate: 4, active: 4 },
  advanced: { sedentary: 3, moderate: 4, active: 5 },
};

/** The days per week generate-plan would use when no weekdays are picked. */
export function trainingDaysPerWeek(experienceLevel: string | null, activityLevel: string | null, age: number | null): number {
  const row = FREQUENCY_TABLE[experienceLevel ?? ''] ?? FREQUENCY_TABLE.intermediate;
  let days = row[activityLevel ?? ''] ?? row.moderate;
  if (age !== null && age >= 55) days = Math.min(days, 4);
  return days;
}

const DEFAULT_SPREADS: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** A sensible spread of weekday names for a days-per-week count (3 -> Mon, Wed, Fri). */
export function defaultWeekdays(daysPerWeek: number): string[] {
  const n = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  return DEFAULT_SPREADS[n].map((i) => WEEKDAY_NAMES[i]);
}

/** Puts picked weekday names in calendar order, drops anything unknown and repeats. */
export function sortWeekdays(days: string[]): string[] {
  const idx = Array.from(new Set(days.map(weekdayIndex).filter((i): i is number => i !== null))).sort((a, b) => a - b);
  return idx.map((i) => WEEKDAY_NAMES[i]);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameLocalDay(iso: string, day: Date): boolean {
  const e = new Date(iso);
  return e.getFullYear() === day.getFullYear() && e.getMonth() === day.getMonth() && e.getDate() === day.getDate();
}

/** True when every label is a weekday name and none repeats. */
export function isWeekdayPlan(dayLabels: string[]): boolean {
  if (dayLabels.length === 0) return false;
  const idx = dayLabels.map(weekdayIndex);
  return idx.every((i) => i !== null) && new Set(idx).size === idx.length;
}

/** This week's (Monday-first) date for each weekday label. */
export function weekDates(now: Date): Date[] {
  const today = startOfDay(now);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - localWeekday(today));
  return WEEKDAY_NAMES.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export interface WeekdayDayState<E extends DayEventLike> {
  state: DayState;
  event: E | null;
  /** This week's date for the pill. */
  date: Date;
}

/**
 * One state per plan day for a weekday-labelled plan, tied to this week:
 * - a past planned day with an event for that label that day: completed or skipped
 * - a past planned day with no event on that date: missed (stays missed even if the
 *   user does that day's session later, "Either way, Tuesday stays marked as missed")
 * - today: completed / skipped if there's an event today, else suggested
 * - a later day: upcoming
 * Returns null when the plan isn't weekday-labelled; callers use the legacy states.
 */
export function computeWeekdayStates<E extends DayEventLike>(
  dayLabels: string[],
  eventsDesc: E[],
  now: Date
): WeekdayDayState<E>[] | null {
  if (!isWeekdayPlan(dayLabels)) return null;
  const dates = weekDates(now);
  const today = startOfDay(now);
  return dayLabels.map((label) => {
    const date = dates[weekdayIndex(label) as number];
    const event = eventsDesc.find((e) => e.dayLabel === label && sameLocalDay(e.createdAt, date)) ?? null;
    if (date.getTime() < today.getTime()) {
      return event ? { state: event.status, event, date } : { state: 'missed', event: null, date };
    }
    if (date.getTime() === today.getTime()) {
      return event ? { state: event.status, event, date } : { state: 'suggested', event: null, date };
    }
    return { state: 'upcoming', event: null, date };
  });
}

/** Today's plan day if today is a training weekday, else the next planned day (wrapping the week). Null for non-weekday plans. */
export function suggestedWeekdayIndex(dayLabels: string[], now: Date): number | null {
  if (!isWeekdayPlan(dayLabels)) return null;
  const todayIdx = localWeekday(now);
  let best = 0;
  let bestDistance = 8;
  dayLabels.forEach((label, i) => {
    const distance = ((weekdayIndex(label) as number) - todayIdx + 7) % 7;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

/** Plan days whose date has passed this week with nothing logged. */
export function missedDayLabels<E extends DayEventLike>(dayLabels: string[], eventsDesc: E[], now: Date): string[] {
  const states = computeWeekdayStates(dayLabels, eventsDesc, now);
  if (!states) return [];
  return dayLabels.filter((_, i) => states[i].state === 'missed');
}

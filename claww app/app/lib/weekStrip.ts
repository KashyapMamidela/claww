// NG PHASE 12: the week strip on Workouts (screen 06): seven days Monday to Sunday with the session name, rest
// days, what is done or missed, today, and a pen note for a missed day. Pure; built on computeWeekdayStates.

import { computeWeekdayStates, weekdayIndex, WEEKDAY_NAMES } from './trainingWeek';
import type { DayEventLike } from './workoutDayState';

export type StripState = 'done' | 'missed' | 'rest' | 'today' | 'upcoming';

export interface StripCell {
  /** Monday is 0. */
  weekday: number;
  letter: string;
  dateNumber: number;
  /** Short session name ("Push") or "Rest". */
  label: string;
  state: StripState;
  /** Index into the plan's days, or null for a rest day. */
  planIndex: number | null;
}

export interface WeekStrip {
  cells: StripCell[];
  /** Handwritten note under the strip when a planned day was missed, else null. */
  note: string | null;
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** First word of a session name, so "Upper A" reads "Upper" in a narrow cell. */
export function shortLabel(focus: string): string {
  const first = focus.trim().split(/\s+/)[0] ?? '';
  return first.length > 0 ? first : 'Session';
}

export function weekStrip(days: { day: string; focus: string }[], eventsDesc: DayEventLike[], now: Date): WeekStrip | null {
  const states = computeWeekdayStates(days.map((d) => d.day), eventsDesc, now);
  if (!states) return null;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const todayIdx = (now.getDay() + 6) % 7;
  const cells: StripCell[] = [];
  let note: string | null = null;
  for (let w = 0; w < 7; w++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + w);
    const planIndex = days.findIndex((d) => weekdayIndex(d.day) === w);
    const planned = planIndex >= 0;
    let state: StripState;
    if (!planned) {
      state = w === todayIdx ? 'today' : 'rest';
    } else {
      const s = states[planIndex].state;
      if (w === todayIdx) state = 'today';
      else if (s === 'completed') state = 'done';
      else if (s === 'missed' || s === 'skipped') state = 'missed';
      else state = 'upcoming';
    }
    if (planned && state === 'missed' && !note) {
      note = `${WEEKDAY_NAMES[w]}'s ${shortLabel(days[planIndex].focus)} is still open`;
    }
    cells.push({
      weekday: w,
      letter: LETTERS[w],
      dateNumber: date.getDate(),
      label: planned ? shortLabel(days[planIndex].focus) : 'Rest',
      state,
      planIndex: planned ? planIndex : null,
    });
  }
  return { cells, note };
}

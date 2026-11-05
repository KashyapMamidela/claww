// NG PHASE 10: which moment of the day it is, from the local time and which meals have an answer (logged or skipped).
// The Nutrition tab, Home and the 21:30 reminder all ask this one function. Pure.

export type DayMoment = 'morning' | 'day' | 'catch_up' | 'night_close';
export type Slot = 'breakfast' | 'lunch' | 'dinner';

export const SLOT_ORDER: Slot[] = ['breakfast', 'lunch', 'dinner'];

export const MORNING_FROM = 5 * 60;
export const MORNING_TO = 11 * 60;
export const CATCH_UP_FROM = 19 * 60 + 30;
export const NIGHT_CLOSE_FROM = 21 * 60 + 30;

const lower = (types: (string | null | undefined)[]) => new Set(types.map((t) => (t ?? '').toLowerCase()));

/** The meals with no answer yet. A skipped meal counts as answered. */
export function unanswered(answeredTypes: (string | null | undefined)[]): Slot[] {
  const done = lower(answeredTypes);
  return SLOT_ORDER.filter((s) => !done.has(s));
}

export interface MomentInput {
  hour: number;
  minute: number;
  /** meal_type of every meal log today, skipped ones included. */
  answeredTypes: (string | null | undefined)[];
}

/**
 * Night close from 21:30 with any meal unanswered; catch-up from 19:30 with breakfast or lunch unanswered;
 * morning 05:00 to 11:00 with nothing logged; otherwise an ordinary day.
 */
export function momentFor({ hour, minute, answeredTypes }: MomentInput): DayMoment {
  const t = hour * 60 + minute;
  const open = unanswered(answeredTypes);
  if (t >= NIGHT_CLOSE_FROM && open.length > 0) return 'night_close';
  if (t >= CATCH_UP_FROM && (open.includes('breakfast') || open.includes('lunch'))) return 'catch_up';
  if (t >= MORNING_FROM && t < MORNING_TO && open.length === SLOT_ORDER.length) return 'morning';
  return 'day';
}

/**
 * The meals the catch-up screen asks about: breakfast and lunch when they have no answer, and dinner too once the day is
 * closing (from 21:30). Before that dinner is still ahead, not missed.
 */
export function catchUpSlots(answeredTypes: (string | null | undefined)[], hour: number, minute: number): Slot[] {
  const t = hour * 60 + minute;
  return unanswered(answeredTypes).filter((s) => s !== 'dinner' || t >= NIGHT_CLOSE_FROM);
}

/** "Two meals aren't logged." */
export function countLine(n: number): string {
  const word = ['No', 'One', 'Two', 'Three'][n] ?? String(n);
  return n === 1 ? 'One meal isn’t logged.' : `${word} meals aren’t logged.`;
}

/** The text of the 21:30 reminder, or null when every meal has an answer. */
export function nightCloseText(unansweredCount: number): { title: string; body: string } | null {
  if (unansweredCount <= 0) return null;
  return { title: 'Close your day in 10 seconds', body: unansweredCount === 1 ? 'One meal is not logged. A rough answer keeps tomorrow right.' : `${unansweredCount} meals are not logged. A rough answer keeps tomorrow right.` };
}

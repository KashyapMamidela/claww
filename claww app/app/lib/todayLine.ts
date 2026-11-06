// Polish step 4: Home's Today line. The day as one list in time order: the meals, the session and sleep. Done items shrink
// to a tick, the current item carries its buttons, and a meal whose time has passed stays with As planned / Something else
// / Skipped. Pure; the screen feeds it the same slot views the Nutrition tab uses.

import type { MealSlot, SlotState } from './mealPlanView';

export const MEAL_MINUTES: Record<MealSlot, number> = { breakfast: 8 * 60 + 30, lunch: 13 * 60 + 30, dinner: 20 * 60 + 30 };
export const DEFAULT_SESSION_MINUTES = 18 * 60;
export const SLEEP_BY_MINUTES = 23 * 60;
/** A session this long after its usual time, still not started, reads as open rather than current. */
export const SESSION_OPEN_AFTER_MIN = 180;

export type TodayState = 'done' | 'current' | 'missed' | 'upcoming';
export type TodayKind = 'meal' | 'session' | 'sleep';

export interface TodayMealInput {
  slot: MealSlot;
  state: SlotState;
  /** The planned meal's name, e.g. "Poha, peanuts and 2 boiled eggs". */
  plannedName: string | null;
  /** What was logged, once it has been, e.g. "490 kcal, 26 g protein". */
  loggedLine: string | null;
}

export interface TodaySessionInput {
  name: string;
  minutes: number;
  done: boolean;
  usualMinutes: number | null;
  /** The pen note worth showing under the session, e.g. "Bench press 60 > 62.5 kg". */
  markLine: string | null;
}

export interface TodayItem {
  id: string;
  kind: TodayKind;
  slot?: MealSlot;
  /** Minutes after midnight, for ordering. */
  at: number;
  timeLabel: string;
  title: string;
  line: string | null;
  state: TodayState;
  /** True when the plan has a meal to eat as planned (so the Ate as planned button makes sense). */
  hasPlan?: boolean;
}

export const slotTitle = (s: MealSlot) => s.charAt(0).toUpperCase() + s.slice(1);

export function minutesLabel(m: number): string {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export interface TodayInput {
  nowMinutes: number;
  meals: TodayMealInput[];
  /** null when no session is planned today (a rest day). */
  session: TodaySessionInput | null;
  /** The target hours of sleep, for the line under "Sleep by 11". */
  sleepTargetHours: number;
}

export function todayLine(i: TodayInput): TodayItem[] {
  const items: TodayItem[] = i.meals.map((m) => {
    const base = { id: `meal-${m.slot}`, kind: 'meal' as const, slot: m.slot, at: MEAL_MINUTES[m.slot], timeLabel: minutesLabel(MEAL_MINUTES[m.slot]), title: slotTitle(m.slot), hasPlan: !!m.plannedName };
    if (m.state === 'as_planned' || m.state === 'swapped' || m.state === 'extra') return { ...base, state: 'done' as const, line: m.loggedLine ? `Done · ${m.loggedLine}` : 'Done' };
    if (m.state === 'skipped') return { ...base, state: 'done' as const, line: 'Skipped' };
    if (m.state === 'missed') return { ...base, state: 'missed' as const, line: m.plannedName };
    if (m.state === 'up_next') return { ...base, state: 'upcoming' as const, line: m.plannedName };
    return { ...base, state: 'upcoming' as const, line: m.plannedName };
  });

  if (i.session) {
    const at = i.session.usualMinutes ?? DEFAULT_SESSION_MINUTES;
    const line = i.session.done ? 'Done' : [`${i.session.minutes} min`, i.session.markLine].filter(Boolean).join(' · ');
    const lateOpen = !i.session.done && i.nowMinutes > at + SESSION_OPEN_AFTER_MIN;
    items.push({
      id: 'session',
      kind: 'session',
      at,
      timeLabel: minutesLabel(at),
      title: i.session.name,
      line,
      state: i.session.done ? 'done' : lateOpen ? 'missed' : 'upcoming',
    });
  }

  items.push({
    id: 'sleep',
    kind: 'sleep',
    at: SLEEP_BY_MINUTES,
    timeLabel: minutesLabel(SLEEP_BY_MINUTES),
    title: 'Sleep by 11',
    line: `${i.sleepTargetHours} hours keeps recovery up`,
    state: 'upcoming',
  });

  items.sort((a, b) => a.at - b.at);

  // The current item is the first thing still to do that is not already late: a meal that is up next, a session
  // that is waiting. Missed meals and sessions keep their buttons but do not take the "now" spot.
  const upNext = new Set(i.meals.filter((m) => m.state === 'up_next').map((m) => `meal-${m.slot}`));
  const current = items.find((it) => it.state === 'upcoming' && (it.kind === 'session' || upNext.has(it.id)));
  return items.map((it) => (it === current ? { ...it, state: 'current' as const } : it));
}

/** How many items are done, for a small "3 of 5" label. */
export function doneCount(items: TodayItem[]): { done: number; total: number } {
  const real = items.filter((x) => x.kind !== 'sleep');
  return { done: real.filter((x) => x.state === 'done').length, total: real.length };
}

const clockShort = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${min === 0 ? '' : `:${String(min).padStart(2, '0')}`} ${h >= 12 ? 'pm' : 'am'}`;
};

/** The Session tile under the rings: when it is, "Done", or "Rest" on a day with nothing planned. */
export function sessionTile(i: { planned: boolean; done: boolean; usualMinutes: number | null; name: string }): { value: string; sub: string } {
  if (!i.planned) return { value: 'Rest', sub: 'no session today' };
  if (i.done) return { value: 'Done', sub: i.name };
  return { value: clockShort(i.usualMinutes ?? DEFAULT_SESSION_MINUTES), sub: i.name };
}

// Polish step 7: the plan arrives as four tap-through cards (your week, first session, a day of food, what I watch)
// instead of one long page. Pure: this builds the content from the saved plan and the day's meal plan.

import type { PlanDay } from './data';
import { WEEKDAY_NAMES, weekdayIndex } from './trainingWeek';

export type WeekKind = 'gym' | 'yoga' | 'mobility' | 'rest';

export interface StoryWeekDay {
  day: string;
  what: string;
  minutes: number | null;
  kind: WeekKind;
}

const isFlow = (focus: string, kind: 'yoga' | 'mobility') => new RegExp(`^${kind}|, ${kind}|${kind} flow`, 'i').test(focus);

/** Minutes for a day: timed blocks add up, strength is sets x (40 s of work + 90 s of rest) plus a 5 minute warm-up. */
export function dayMinutes(day: PlanDay): number {
  if (isFlow(day.focus, 'yoga') || isFlow(day.focus, 'mobility')) {
    return day.exercises.reduce((n, e) => n + (Number(e.reps) || 0), 0);
  }
  const sets = day.exercises.reduce((n, e) => n + (Number(e.sets) || 0), 0);
  return Math.round((sets * 130) / 60 + 5);
}

export function kindOf(focus: string): WeekKind {
  if (isFlow(focus, 'yoga')) return 'yoga';
  if (isFlow(focus, 'mobility')) return 'mobility';
  return 'gym';
}

/** Monday to Sunday: the sessions on their weekdays and Rest between. A "Day 1, Day 2" plan lists its sessions in order. */
export function storyWeek(days: PlanDay[]): StoryWeekDay[] {
  const onWeekdays = days.length > 0 && days.every((d) => weekdayIndex(d.day) !== null);
  if (!onWeekdays) return days.map((d) => ({ day: d.day, what: d.focus, minutes: dayMinutes(d), kind: kindOf(d.focus) }));
  return WEEKDAY_NAMES.map((name, i) => {
    const d = days.find((x) => weekdayIndex(x.day) === i);
    return d
      ? { day: name.slice(0, 3), what: d.focus, minutes: dayMinutes(d), kind: kindOf(d.focus) }
      : { day: name.slice(0, 3), what: 'Rest', minutes: null, kind: 'rest' as const };
  });
}

/** The first session to do: today's if today is a training day, else the next one after today. */
export function firstSession(days: PlanDay[], now: Date): PlanDay | null {
  if (days.length === 0) return null;
  const onWeekdays = days.every((d) => weekdayIndex(d.day) !== null);
  if (!onWeekdays) return days[0];
  const today = (now.getDay() + 6) % 7;
  let best = days[0];
  let bestDistance = 8;
  for (const d of days) {
    const distance = (((weekdayIndex(d.day) as number) - today) + 7) % 7;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = d;
    }
  }
  return best;
}

export function summaryLine(days: PlanDay[]): string {
  const sessions = days.length;
  const total = days.reduce((n, d) => n + dayMinutes(d), 0);
  return `${sessions} ${sessions === 1 ? 'session' : 'sessions'} a week, about ${total} minutes in all`;
}

/** What the coach keeps an eye on, in plain words; each line is something the app really does. */
export const WATCH_LINES: { title: string; line: string }[] = [
  { title: 'Sleep and recovery', line: 'A short night or a sore muscle makes that session lighter. A good one lets the weight go up.' },
  { title: 'Your lifts', line: 'When every set feels easy the weight goes up a step. When it stalls, the plan holds it and tells you why.' },
  { title: 'Protein each day', line: 'Your meals are planned around your protein target and what you can get where you eat.' },
  { title: 'Missed days', line: 'Miss a session and it is offered again, never silently dropped.' },
];

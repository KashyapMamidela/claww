// Polish step 1: the one line on the Tracker's Adaptive card. On a rest day there is no session today, so the card says
// so and names the next session; it says nothing about "changes" (nothing is being changed today).

import { isWeekdayPlan, localWeekday, weekdayIndex } from './trainingWeek';

export function isRestDay(dayLabels: string[], now: Date): boolean {
  if (!isWeekdayPlan(dayLabels)) return false;
  const today = localWeekday(now);
  return !dayLabels.some((l) => weekdayIndex(l) === today);
}

export function adaptiveSummary(input: { dayLabels: string[]; focus: string; dayLabel: string; changed: number; answered: number; now: Date }): string {
  const { dayLabels, focus, dayLabel, changed, answered, now } = input;
  if (isRestDay(dayLabels, now)) return `Rest day · next is ${focus} on ${dayLabel}`;
  const changes = changed === 0 ? 'plan as written' : `${changed} ${changed === 1 ? 'change' : 'changes'} from your plan`;
  return `${focus} today · ${changes}${answered > 0 ? ' · check-in saved' : ''}`;
}

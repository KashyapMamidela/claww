// Polish step 10: the Sunday letter, a shareable 9:16 card for the weekly review: three numbers and what changed, in the
// pen. Pure; shows nothing private (no weight of the body, no email, no meal names).

import type { PenMark } from './engine';
import type { WeekFacts } from './weekReview';
import { isClimb } from './weekReview';

export interface LetterNumber {
  value: string;
  label: string;
}

/** The three numbers: sessions, protein days, and the climbs this week. A number with no data is left out, never zero-filled. */
export function letterNumbers(f: WeekFacts): LetterNumber[] {
  const out: LetterNumber[] = [];
  if (f.sessionsPlanned > 0) out.push({ value: `${f.sessionsDone} of ${f.sessionsPlanned}`, label: 'sessions done' });
  if (f.mealDays > 0) out.push({ value: String(f.proteinDays), label: f.proteinDays === 1 ? 'day protein was hit' : 'days protein was hit' });
  out.push({ value: String(f.climbs), label: f.climbs === 1 ? 'thing climbed' : 'things climbed' });
  return out.slice(0, 3);
}

/** "Bench press 60 > 62.5 kg": a short line for what changed, from the marks the user kept (undone ones are not shown). */
export function changeLine(m: PenMark): string {
  const item = m.target.exercise ?? (m.target.meal ? `${m.target.meal.charAt(0).toUpperCase()}${m.target.meal.slice(1)}` : m.target.key === 'calories' ? 'Calories' : m.kind === 'move_day' ? 'Session day' : 'Plan');
  return m.oldValue ? `${item}: ${m.oldValue} to ${m.newValue}` : `${item}: ${m.newValue}`;
}

/** Up to `limit` changes, climbs first, kept or still active only. */
export function letterChanges(marks: PenMark[], limit = 3): string[] {
  return marks
    .filter((m) => m.status !== 'undone' && m.status !== 'expired' && m.kind !== 'hold')
    .sort((a, b) => Number(isClimb(b)) - Number(isClimb(a)))
    .slice(0, limit)
    .map(changeLine);
}

export function letterFileName(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `claww-week-${date.getFullYear()}-${m}-${d}.png`;
}

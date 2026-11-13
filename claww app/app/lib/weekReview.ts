// NG PHASE 11.5: the numbers and words of "Your week, marked up" (screen 03). Pure.

import type { PenMark } from './engine';

const DAY = 86_400_000;

/** Monday 00:00 local of the week containing `now`. */
export function weekStart(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export interface WeekFacts {
  sessionsDone: number;
  sessionsPlanned: number;
  /** Days this week with protein at 90 % of target or more. */
  proteinDays: number;
  /** Days this week with any meal logged. */
  mealDays: number;
  /** Marks this week that raise something (weight, sets, calories up). */
  climbs: number;
}

/** "4 of 4 sessions, protein hit on 5 days. Next week climbs a little." */
export function reviewLine(f: WeekFacts): string {
  const parts: string[] = [];
  if (f.sessionsPlanned > 0) parts.push(`${f.sessionsDone} of ${f.sessionsPlanned} sessions`);
  if (f.mealDays > 0) parts.push(`protein hit on ${f.proteinDays} ${f.proteinDays === 1 ? 'day' : 'days'}`);
  if (parts.length === 0) return 'A quiet week. Next week starts from your plan.';
  const tail = f.climbs > 0 ? 'Next week climbs a little.' : 'Next week holds steady.';
  const head = parts.join(', ');
  return `${head.charAt(0).toUpperCase()}${head.slice(1)}. ${tail}`;
}

/** Marks shown in the review: made in the last 7 days and not expired, workouts first, oldest first within an area. */
export function marksForReview(marks: PenMark[], now: Date): PenMark[] {
  const since = now.getTime() - 7 * DAY;
  // One row per thing that was marked: the same meal or day marked again (a day moved Saturday to Sunday, then Sunday
  // to Monday) shows only its latest mark, so the review never lists the same item twice or contradicts itself.
  const latest = new Map<string, PenMark>();
  for (const m of marks) {
    if (m.status === 'expired' || new Date(m.createdAt).getTime() < since) continue;
    const k = `${m.area}|${m.kind}|${m.target.key}|${m.target.field ?? ''}`;
    const prev = latest.get(k);
    if (!prev || prev.createdAt < m.createdAt) latest.set(k, m);
  }
  return [...latest.values()]
    .sort((a, b) => (a.area === b.area ? a.createdAt.localeCompare(b.createdAt) : a.area === 'workout' ? -1 : 1));
}

/** True for a mark that makes something bigger: a heavier lift, more sets, more calories. */
export function isClimb(m: PenMark): boolean {
  if (m.kind !== 'change_number') return false;
  const a = parseFloat(m.oldValue ?? '');
  const b = parseFloat(m.newValue);
  if (Number.isFinite(a) && Number.isFinite(b)) return b > a;
  return false;
}

export function dateLine(now: Date, blockWeek: number | null, blockWeeks: number): string {
  const d = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  return blockWeek ? `${d} · week ${blockWeek} of ${blockWeeks}` : d;
}

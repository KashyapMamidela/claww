// NG PHASE 12: the streak on the session-complete card counts plan days followed. A planned day counts when its
// session was done; a rest day (nothing planned) counts as followed; a missed planned day breaks the streak
// unless an exam week protects it, in which case it neither counts nor breaks. Today never breaks the streak
// before it is over. Pure, on local calendar dates (YYYY-MM-DD).

export interface ExamWeek {
  /** Inclusive start and end, YYYY-MM-DD. */
  from: string;
  until: string;
}

export interface StreakInput {
  /** Local today, YYYY-MM-DD. */
  today: string;
  /** Weekdays with a planned session, Monday = 0 ... Sunday = 6. null means every day is a plan day (unnamed plan). */
  plannedWeekdays: number[] | null;
  /** Local dates on which a session was completed. */
  completedDates: Set<string>;
  examWeek: ExamWeek | null;
  /** Dates from which the plan existed: nothing earlier counts or breaks. */
  planStart?: string;
}

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;

export interface StreakResult {
  days: number;
  /** The first date of the run, for "plan followed every day since Friday". */
  since: string | null;
}

export function planStreak(i: StreakInput): StreakResult {
  let days = 0;
  let since: string | null = null;
  const cursor = parse(i.today);
  for (let step = 0; step < 400; step++) {
    const key = dateKey(cursor);
    if (i.planStart && key < i.planStart) break;
    const isToday = key === i.today;
    const planned = i.plannedWeekdays === null || i.plannedWeekdays.includes(weekdayOf(cursor));
    const done = i.completedDates.has(key);
    const protectedDay = !!i.examWeek && key >= i.examWeek.from && key <= i.examWeek.until;

    if (done) {
      days += 1;
      since = key;
    } else if (!planned) {
      days += 1; // a rest day followed
      since = key;
    } else if (protectedDay) {
      // neither counts nor breaks
    } else if (isToday) {
      // today's session is still to come: it can only add to the streak
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return { days, since };
}

/** "Plan followed every day since Friday" */
export function streakSentence(r: StreakResult, today: string): string {
  if (r.days <= 0 || !r.since) return 'Finish today and your streak starts.';
  if (r.since === today) return 'Plan followed today.';
  const name = parse(r.since).toLocaleDateString('en-US', { weekday: 'long' });
  return `Plan followed every day since ${name}.`;
}

/** An exam week of 7 days from `start` (inclusive). */
export function examWeekFrom(start: Date): ExamWeek {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: dateKey(start), until: dateKey(end) };
}

export function examWeekActive(week: ExamWeek | null, today: string): boolean {
  return !!week && today >= week.from && today <= week.until;
}

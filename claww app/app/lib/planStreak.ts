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
  /** Premium F6: dates the user froze (one missed planned day a week). A frozen day neither counts nor breaks the streak. */
  frozenDates?: string[];
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
    const protectedDay = (!!i.examWeek && key >= i.examWeek.from && key <= i.examWeek.until) || !!i.frozenDates?.includes(key);

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

// ─── NG PHASE 12 follow-up: one streak for Home, the Tracker and the session card ───────────────────────────

export type StreakDayStatus = 'done' | 'rest' | 'missed' | 'protected' | 'today';

export interface StreakGridDay {
  date: Date;
  key: string;
  status: StreakDayStatus;
  /** True when this day adds to the streak (a done session or a followed rest day). */
  counts: boolean;
}

export interface PlanStreakStats {
  current: number;
  best: number;
  since: string | null;
  /** The last `gridDays` days, oldest first. */
  grid: StreakGridDay[];
}

function statusOf(key: string, i: StreakInput, cursor: Date): StreakDayStatus {
  const planned = i.plannedWeekdays === null || i.plannedWeekdays.includes(weekdayOf(cursor));
  if (i.completedDates.has(key)) return key === i.today ? 'today' : 'done';
  if (!planned) return 'rest';
  if ((i.examWeek && key >= i.examWeek.from && key <= i.examWeek.until) || i.frozenDates?.includes(key)) return 'protected';
  return key === i.today ? 'today' : 'missed';
}

/** Current and best plan streak, and a grid of the last days with why each did or did not count. */
export function planStreakStats(i: StreakInput, gridDays = 21): PlanStreakStats {
  const { days, since } = planStreak(i);

  // Best: walk forward through the last year; done and rest days extend the run, protected days hold it, a miss ends it.
  const start = parse(i.today);
  start.setDate(start.getDate() - 364);
  let best = 0;
  let run = 0;
  const cur = new Date(start);
  for (let n = 0; n < 365; n++) {
    const key = dateKey(cur);
    if (!i.planStart || key >= i.planStart) {
      const s = statusOf(key, i, cur);
      if (s === 'done' || s === 'rest' || (s === 'today' && i.completedDates.has(key))) run += 1;
      else if (s === 'missed') run = 0;
      best = Math.max(best, run);
    }
    cur.setDate(cur.getDate() + 1);
  }
  best = Math.max(best, days);

  const grid: StreakGridDay[] = [];
  const g = parse(i.today);
  g.setDate(g.getDate() - (gridDays - 1));
  for (let n = 0; n < gridDays; n++) {
    const key = dateKey(g);
    const status = statusOf(key, i, g);
    grid.push({ date: new Date(g), key, status, counts: status === 'done' || status === 'rest' || (status === 'today' && i.completedDates.has(key)) });
    g.setDate(g.getDate() + 1);
  }
  return { current: days, best, since, grid };
}

/** Premium F6: the Monday-based week a date belongs to, as the date of that Monday. */
export function weekStartKey(key: string): string {
  const d = parse(key);
  d.setDate(d.getDate() - weekdayOf(d));
  return dateKey(d);
}

/**
 * Premium F6: the missed planned days of the last 7 days that a freeze could still cover: only when no freeze was
 * used in that same week, and never today. Newest first.
 */
export function freezeCandidates(i: StreakInput): string[] {
  const frozen = i.frozenDates ?? [];
  const usedWeeks = new Set(frozen.map(weekStartKey));
  const out: string[] = [];
  const cursor = parse(i.today);
  for (let step = 1; step <= 7; step++) {
    cursor.setDate(cursor.getDate() - 1);
    const key = dateKey(cursor);
    if (i.planStart && key < i.planStart) break;
    const planned = i.plannedWeekdays === null || i.plannedWeekdays.includes(weekdayOf(cursor));
    if (!planned || i.completedDates.has(key) || frozen.includes(key)) continue;
    if (i.examWeek && key >= i.examWeek.from && key <= i.examWeek.until) continue;
    if (usedWeeks.has(weekStartKey(key))) continue;
    out.push(key);
  }
  return out;
}

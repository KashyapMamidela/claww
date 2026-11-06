// Polish step 1: moving a missed session to a free weekday, as pure functions so the rules are tested.
// Two bugs came from doing this inline in penData: two missed days in one run both picked the same free weekday, and
// relabelling a day onto a weekday that was already a training day silently made a duplicate.

import { WEEKDAY_NAMES, weekdayIndex } from './trainingWeek';

/**
 * A picker of free weekdays for a plan on real weekdays. Each call returns the first weekday after the missed one that
 * no session uses, then reserves it (and the missed one), so a second call in the same run can never pick it again.
 * null when the week is full.
 */
export function makeFreeWeekday(labels: string[]): (missed: string) => string | null {
  const used = new Set<number | null>(labels.map((l) => weekdayIndex(l)));
  return (missed) => {
    const from = weekdayIndex(missed);
    if (from === null) return null;
    for (let step = 1; step <= 6; step++) {
      const idx = (from + step) % 7;
      if (!used.has(idx)) {
        used.add(idx);
        used.add(from);
        return WEEKDAY_NAMES[idx];
      }
    }
    return null;
  };
}

/**
 * The plan's days with the session on `from` moved to `to`, in calendar order. null (change nothing) when there is no
 * session on `from`, or `to` is already a training day, or either is not a weekday.
 */
export function moveSessionDay<D extends { day: string }>(days: D[], from: string, to: string): D[] | null {
  const f = weekdayIndex(from);
  const t = weekdayIndex(to);
  if (f === null || t === null || f === t) return null;
  if (!days.some((d) => weekdayIndex(d.day) === f)) return null;
  if (days.some((d) => weekdayIndex(d.day) === t)) return null;
  return days
    .map((d) => (weekdayIndex(d.day) === f ? { ...d, day: WEEKDAY_NAMES[t] } : d))
    .sort((a, b) => (weekdayIndex(a.day) ?? 99) - (weekdayIndex(b.day) ?? 99));
}

/** What the mark is about, in words: the session's name ("Full body day"), not "Plan". */
export function moveDayItemLabel(days: { day: string; focus: string }[], oldDay: string | null, newDay: string): string {
  const o = oldDay === null ? null : weekdayIndex(oldDay);
  const n = weekdayIndex(newDay);
  const d = days.find((x) => weekdayIndex(x.day) === n) ?? days.find((x) => o !== null && weekdayIndex(x.day) === o);
  const focus = d?.focus.trim();
  if (!focus) return 'Session day';
  return /\bday$/i.test(focus) ? focus : `${focus} day`;
}

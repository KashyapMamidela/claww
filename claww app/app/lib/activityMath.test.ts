import { describe, expect, it } from 'vitest';
import { dailyRanges, dayKey, hourlyRanges, lastSevenDays, stepsToKm, streakStats, type DayActivity } from './activityMath';

const now = new Date(2026, 9, 11, 14, 25); // Sat 11 Oct 2026, 14:25

describe('hourlyRanges', () => {
  it('covers midnight to now, one range per hour, last one ending now', () => {
    const r = hourlyRanges(now);
    expect(r).toHaveLength(15);
    expect(r[0].start.getHours()).toBe(0);
    expect(r[0].end.getHours()).toBe(1);
    expect(r[14].start.getHours()).toBe(14);
    expect(r[14].end.getTime()).toBe(now.getTime());
  });
});

describe('dailyRanges', () => {
  it('gives the last N days oldest first, today ending now', () => {
    const r = dailyRanges(now, 7);
    expect(r).toHaveLength(7);
    expect(r[0].start.getDate()).toBe(5);
    expect(r[6].start.getDate()).toBe(11);
    expect(r[6].end.getTime()).toBe(now.getTime());
    expect(r[5].end.getDate()).toBe(11);
  });
});

describe('stepsToKm', () => {
  it('uses 0.415 × height as stride', () => {
    expect(stepsToKm(10000, 180)).toBe(7.47);
  });

  it('falls back to 170 cm', () => {
    expect(stepsToKm(10000, null)).toBe(7.06);
    expect(stepsToKm(0, 180)).toBe(0);
  });
});

function days(entries: [Date, Partial<DayActivity>][]): Map<string, DayActivity> {
  const m = new Map<string, DayActivity>();
  for (const [d, a] of entries) m.set(dayKey(d), { sleep: false, meal: false, workout: false, ...a });
  return m;
}
const d = (n: number) => new Date(2026, 9, n);

describe('streakStats', () => {
  it('counts the current streak ending today', () => {
    const s = streakStats(days([[d(9), { meal: true }], [d(10), { sleep: true }], [d(11), { workout: true }]]), now);
    expect(s.current).toBe(3);
  });

  it('counts from yesterday when nothing is logged today yet', () => {
    const s = streakStats(days([[d(9), { meal: true }], [d(10), { meal: true }]]), now);
    expect(s.current).toBe(2);
  });

  it('is 0 when yesterday and today are both empty', () => {
    expect(streakStats(days([[d(8), { meal: true }]]), now).current).toBe(0);
  });

  it('finds the best run anywhere in the data', () => {
    const s = streakStats(
      days([
        [d(1), { meal: true }],
        [d(2), { meal: true }],
        [d(3), { meal: true }],
        [d(4), { meal: true }],
        [d(10), { meal: true }],
        [d(11), { meal: true }],
      ]),
      now
    );
    expect(s.current).toBe(2);
    expect(s.best).toBe(4);
  });

  it('builds a 21-day grid oldest first with the reasons for each day', () => {
    const s = streakStats(days([[d(11), { sleep: true, workout: true }]]), now);
    expect(s.grid).toHaveLength(21);
    expect(s.grid[20].isToday).toBe(true);
    expect(s.grid[20].reasons).toEqual({ sleep: true, meal: false, workout: true });
    expect(s.grid[0].date.getDate()).toBe(21);
    expect(s.grid[0].active).toBe(false);
  });
});

describe('lastSevenDays', () => {
  it('marks the last 7 days oldest first', () => {
    expect(lastSevenDays(days([[d(5), { meal: true }], [d(11), { meal: true }]]), now)).toEqual([true, false, false, false, false, false, true]);
  });
});

import { describe, expect, it } from 'vitest';
import { sessionsDoneThisWeek } from './weekReview';

const monday = new Date(2026, 10, 9);
const ev = (dayLabel: string, day: number, status = 'completed') => ({ status, dayLabel, createdAt: new Date(2026, 10, day, 18).toISOString() });

describe('sessionsDoneThisWeek', () => {
  it('counts each plan day once, however many times it was completed', () => {
    expect(sessionsDoneThisWeek([ev('Wednesday', 11), ev('Wednesday', 11), ev('Thursday', 12)], monday, 6)).toBe(2);
  });
  it('never exceeds the number of days in the plan', () => {
    const events = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((d, i) => ev(d, 9 + i));
    expect(sessionsDoneThisWeek(events, monday, 3)).toBe(3);
  });
  it('ignores skipped events and anything before this week', () => {
    expect(sessionsDoneThisWeek([ev('Monday', 9, 'skipped'), ev('Friday', 6)], monday, 4)).toBe(0);
  });
});

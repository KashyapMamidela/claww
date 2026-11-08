import { describe, expect, it } from 'vitest';
import { freezeCandidates, planStreak, weekStartKey } from './planStreak';

// 2026-11-08 is a Sunday. Planned: Mon, Wed, Fri (0, 2, 4).
const base = { today: '2026-11-08', plannedWeekdays: [0, 2, 4], examWeek: null };

describe('streak freeze (Premium F6)', () => {
  it('a missed planned day breaks the streak, a frozen one does not', () => {
    const completed = new Set(['2026-11-04', '2026-11-06']); // Wed, Fri done; Mon 2 Nov missed
    const unfrozen = planStreak({ ...base, completedDates: completed });
    const frozen = planStreak({ ...base, completedDates: completed, frozenDates: ['2026-11-02'] });
    expect(unfrozen.days).toBe(6); // Sun, Sat, Fri, Thu, Wed, Tue, then Monday breaks it
    expect(frozen.days).toBeGreaterThan(unfrozen.days);
  });
  it('offers the missed planned days of the last week, one freeze per week', () => {
    const c = freezeCandidates({ ...base, completedDates: new Set() });
    expect(c).toEqual(['2026-11-06', '2026-11-04', '2026-11-02']);
    const after = freezeCandidates({ ...base, completedDates: new Set(), frozenDates: ['2026-11-04'] });
    expect(after).toEqual([]); // that Monday-based week already used its freeze
  });
  it('never offers a day that was done, a rest day, or today', () => {
    const c = freezeCandidates({ ...base, completedDates: new Set(['2026-11-06']) });
    expect(c).not.toContain('2026-11-06');
    expect(c).not.toContain('2026-11-05'); // Thursday is a rest day
    expect(c).not.toContain('2026-11-08');
  });
  it('weeks start on Monday', () => {
    expect(weekStartKey('2026-11-08')).toBe('2026-11-02');
    expect(weekStartKey('2026-11-02')).toBe('2026-11-02');
  });
});

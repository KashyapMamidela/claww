import { describe, expect, it } from 'vitest';
import { coachLine, coachText } from './coachLine';

describe('coach line on a rest day', () => {
  const base = { sleepHours: 9, sessionPlanned: false, sessionDone: false, marks: [], proteinLeftG: null as number | null, hour: 8 };
  it('never says push when there is no session', () => {
    const t = coachText(coachLine(base));
    expect(t).not.toContain('push');
    expect(t).toBe("You slept 9 h. Rest today, and tomorrow's session starts fresh.");
  });
  it('after a short night it suggests catching up, not a lighter session', () => {
    expect(coachText(coachLine({ ...base, sleepHours: 5 }))).toBe('You slept 5 h. A rest day is a good one to catch up.');
  });
});

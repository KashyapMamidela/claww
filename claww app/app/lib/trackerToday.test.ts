import { describe, expect, it } from 'vitest';

import { smoothedWeights } from './trackerToday';

describe('smoothedWeights (Premium F8)', () => {
  const now = new Date('2026-11-08T12:00:00');
  const log = (d: string, kg: number) => ({ weightKg: kg, loggedAt: `${d}T08:00:00` });
  it('averages each day with the entries of the 7 days up to it', () => {
    const out = smoothedWeights([log('2026-11-01', 70), log('2026-11-03', 69), log('2026-11-07', 68)], 60, now);
    expect(out.map((p) => p.avg)).toEqual([70, 69.5, 69]);
  });
  it('keeps one entry per day and ignores entries outside the range', () => {
    const out = smoothedWeights([log('2026-08-01', 90), { weightKg: 68, loggedAt: '2026-11-07T07:00:00' }, { weightKg: 67.6, loggedAt: '2026-11-07T21:00:00' }], 60, now);
    expect(out).toHaveLength(1);
    expect(out[0].raw).toBe(67.6);
  });
  it('is empty with no logs', () => {
    expect(smoothedWeights([], 60, now)).toEqual([]);
  });
});

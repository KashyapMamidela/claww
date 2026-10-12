import { describe, expect, it } from 'vitest';
import { sleepRingPct } from './sleepTarget';

describe('sleepRingPct', () => {
  it('is 0 when no sleep is logged', () => {
    expect(sleepRingPct(null)).toBe(0);
    expect(sleepRingPct(undefined)).toBe(0);
  });

  it('is 0 for zero or invalid hours', () => {
    expect(sleepRingPct(0)).toBe(0);
    expect(sleepRingPct(-1)).toBe(0);
    expect(sleepRingPct(Number.NaN)).toBe(0);
  });

  it('scales against the 8-hour target', () => {
    expect(sleepRingPct(4)).toBe(50);
    expect(sleepRingPct(6)).toBe(75);
    expect(sleepRingPct(8)).toBe(100);
  });

  it('caps at 100', () => {
    expect(sleepRingPct(9.5)).toBe(100);
    expect(sleepRingPct(12)).toBe(100);
  });
});

import { lastSevenNights, sleepQuality } from './sleepTarget';

describe('sleepQuality', () => {
  it('uses 7 / 6 boundaries', () => {
    expect(sleepQuality(7)).toBe('Good');
    expect(sleepQuality(6.9)).toBe('Fair');
    expect(sleepQuality(6)).toBe('Fair');
    expect(sleepQuality(5.9)).toBe('Short');
  });
});

describe('lastSevenNights', () => {
  const now = new Date(2026, 9, 12, 10, 0);
  it('places logs by local day, oldest first, null for gaps', () => {
    const r = lastSevenNights(
      [
        { hours: 7.5, logged_at: new Date(2026, 9, 12, 7, 0).toISOString() },
        { hours: 6, logged_at: new Date(2026, 9, 10, 7, 0).toISOString() },
        { hours: 5, logged_at: new Date(2026, 9, 10, 9, 0).toISOString() },
      ],
      now
    );
    expect(r).toEqual([null, null, null, null, 5, null, 7.5]);
  });
});

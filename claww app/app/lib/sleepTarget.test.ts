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

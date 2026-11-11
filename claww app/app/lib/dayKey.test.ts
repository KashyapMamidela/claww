import { describe, expect, it } from 'vitest';
import { msUntilNextMidnight } from './dayKeyMath';

describe('msUntilNextMidnight', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 11, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextMidnight(new Date(2026, 10, 11, 12, 0, 0))).toBe(12 * 3_600_000);
  });
  it('never returns less than a second, so a timer at 00:00 cannot fire twice', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 11, 23, 59, 59, 900))).toBe(1000);
  });
  it('crosses month ends', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 30, 22, 0, 0))).toBe(2 * 3_600_000);
  });
});

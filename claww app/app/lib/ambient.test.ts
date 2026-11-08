import { describe, expect, it } from 'vitest';
import { ambientGlow, dayLight } from './ambient';

describe('ambient light', () => {
  it('changes through the day', () => {
    expect(dayLight(6).color).toBe('#F59E0B');
    expect(dayLight(12).color).toBe('#60A5FA');
    expect(dayLight(18).color).toBe('#FB923C');
    expect(dayLight(23).color).toBe('#818CF8');
    expect(dayLight(3).color).toBe('#818CF8');
  });
  it('mixes the tab colour with the time of day', () => {
    expect(ambientGlow(12, '#3B82F6', 0.2)).toMatch(/^rgba\(\d+, \d+, \d+, 0.2\)$/);
    expect(ambientGlow(18, '#3B82F6')).not.toBe(ambientGlow(12, '#3B82F6'));
  });
});

import { describe, expect, it } from 'vitest';
import { clock24, dayLabel, grams, hoursText, kcal, kg, litres, steps, timeLabel } from './format';

describe('format', () => {
  it('writes the day as Sunday 8 Nov', () => {
    expect(dayLabel(new Date(2026, 10, 8))).toBe('Sunday 8 Nov');
  });
  it('writes times in text and on the timeline', () => {
    const d = new Date(2026, 10, 8, 18, 0);
    expect(timeLabel(d)).toBe('6:00 pm');
    expect(timeLabel(new Date(2026, 10, 8, 0, 5))).toBe('12:05 am');
    expect(timeLabel(new Date(2026, 10, 8, 12, 30))).toBe('12:30 pm');
    expect(clock24(new Date(2026, 10, 8, 8, 30))).toBe('08:30');
  });
  it('keeps a number and its unit together', () => {
    expect(kcal(2461)).toBe('2,461 kcal');
    expect(kg(62.5)).toBe('62.5 kg');
    expect(kg(60)).toBe('60 kg');
    expect(grams(122)).toBe('122 g');
    expect(steps(3084)).toBe('3,084');
    expect(litres(2000)).toBe('2 L');
    expect(litres(1250)).toBe('1.25 L');
    expect(hoursText(7.5)).toBe('7.5 h');
  });
});

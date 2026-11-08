import { describe, expect, it } from 'vitest';
import { splitDescription } from './describeText';

describe('splitDescription', () => {
  it('splits on commas, and, plus and with', () => {
    expect(splitDescription('2 roti, 1 katori dal and chai')).toEqual(['2 roti', '1 katori dal', 'chai']);
    expect(splitDescription('chicken with rice + salad')).toEqual(['chicken', 'rice', 'salad']);
  });
  it('drops filler words and empties', () => {
    expect(splitDescription('a boiled egg, some curd,, ')).toEqual(['boiled egg', 'curd']);
  });
  it('keeps a single item whole', () => {
    expect(splitDescription('grilled chicken')).toEqual(['grilled chicken']);
    expect(splitDescription('')).toEqual([]);
  });
});

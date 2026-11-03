import { describe, expect, it } from 'vitest';
import { median, percentile, pushCapped, summarize } from './perfStats';

describe('perfStats', () => {
  it('median of odd and even counts', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([40, 10, 20, 30])).toBe(25);
    expect(median([])).toBeNull();
  });

  it('nearest-rank percentile', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(v, 90)).toBe(9);
    expect(percentile(v, 100)).toBe(10);
    expect(percentile([42], 90)).toBe(42);
    expect(percentile([], 90)).toBeNull();
  });

  it('summarize reports count, median and p90', () => {
    expect(summarize([50, 70, 60])).toEqual({ count: 3, median: 60, p90: 70 });
    expect(summarize([])).toEqual({ count: 0, median: null, p90: null });
  });

  it('pushCapped keeps only the newest values', () => {
    let v: number[] = [];
    for (let i = 1; i <= 55; i++) v = pushCapped(v, i);
    expect(v).toHaveLength(50);
    expect(v[0]).toBe(6);
    expect(v[49]).toBe(55);
  });
});

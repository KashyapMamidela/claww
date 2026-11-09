import { describe, it, expect } from 'vitest';
import { daysApart, photoDateLabel } from './progressPhotoMath';

describe('progress photo helpers', () => {
  it('counts calendar days across a month end, in either order', () => {
    expect(daysApart('2026-10-28', '2026-11-09')).toBe(12);
    expect(daysApart('2026-11-09', '2026-10-28')).toBe(12);
    expect(daysApart('2026-11-09', '2026-11-09')).toBe(0);
  });
  it('labels a date', () => {
    expect(photoDateLabel('2026-11-09')).toContain('Nov');
  });
});

import { describe, expect, it } from 'vitest';
import { basicsSummary, hasBasics, profileBasics } from './profileBasics';

describe('profileBasics', () => {
  it('keeps only real positive values', () => {
    expect(profileBasics({ height: 175, weight: 70, age: 28, gender: 'male' })).toEqual({ heightCm: 175, weightKg: 70, age: 28, gender: 'male' });
    expect(profileBasics({ height: 0, weight: null, age: -1, gender: null })).toEqual({ heightCm: null, weightKg: null, age: null, gender: null });
    expect(profileBasics(null).heightCm).toBeNull();
  });

  it('knows when a setup step can skip asking', () => {
    const b = profileBasics({ height: 175, weight: 70, age: null, gender: null });
    expect(hasBasics(b, ['heightCm', 'weightKg'])).toBe(true);
    expect(hasBasics(b, ['heightCm', 'weightKg', 'age'])).toBe(false);
  });

  it('summarises in the order asked, skipping gaps', () => {
    const b = profileBasics({ height: 175.4, weight: 70.26, age: 28, gender: null });
    expect(basicsSummary(b, ['heightCm', 'weightKg', 'age'])).toBe('175 cm · 70.3 kg · 28 yrs');
    expect(basicsSummary(profileBasics({ height: 175, weight: null, age: 28, gender: null }), ['heightCm', 'weightKg', 'age'])).toBe('175 cm · 28 yrs');
  });
});

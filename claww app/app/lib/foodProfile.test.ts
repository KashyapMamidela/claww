import { describe, expect, it } from 'vitest';
import { cuisineLabels, normalizeFoodProfile, shouldAskFoodProfile } from './foodProfile';

describe('normalizeFoodProfile', () => {
  it('handles missing or garbage input', () => {
    expect(normalizeFoodProfile(undefined)).toEqual({ cuisines: [], avoid: '', askedAt: undefined });
    expect(normalizeFoodProfile('x').cuisines).toEqual([]);
  });
  it('drops unknown cuisines and dedupes', () => {
    expect(normalizeFoodProfile({ cuisines: ['south_indian', 'south_indian', 'martian'] }).cuisines).toEqual(['south_indian']);
  });
  it('makes "anything" exclusive', () => {
    expect(normalizeFoodProfile({ cuisines: ['chinese', 'anything'] }).cuisines).toEqual(['anything']);
  });
  it('trims and caps avoid', () => {
    expect(normalizeFoodProfile({ avoid: `  ${'a'.repeat(200)} ` }).avoid.length).toBe(120);
  });
});

describe('shouldAskFoodProfile', () => {
  it('asks only users with targets who have not answered or dismissed', () => {
    expect(shouldAskFoodProfile(true, normalizeFoodProfile({}))).toBe(true);
    expect(shouldAskFoodProfile(false, normalizeFoodProfile({}))).toBe(false);
    expect(shouldAskFoodProfile(true, normalizeFoodProfile({ askedAt: '2026-10-12T00:00:00Z' }))).toBe(false);
  });
});

describe('cuisineLabels', () => {
  it('is empty for anything', () => {
    expect(cuisineLabels(normalizeFoodProfile({ cuisines: ['anything'] }))).toEqual([]);
    expect(cuisineLabels(normalizeFoodProfile({ cuisines: ['north_indian'] }))).toEqual(['North Indian']);
  });
});

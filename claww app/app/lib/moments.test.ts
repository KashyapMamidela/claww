import { describe, expect, it } from 'vitest';
import { goalsCrossed, goalsMet, mealMomentTitle, proteinToGo } from './moments';

const targets = { kcal: 2400, proteinG: 120, steps: 10000, waterMl: 2000 };
const zero = { kcal: 0, proteinG: 0, steps: 0, waterMl: 0 };

describe('goalsMet', () => {
  it('is empty at the start of the day', () => {
    expect(goalsMet(zero, targets)).toEqual([]);
  });
  it('finds protein, steps and water at their targets', () => {
    const keys = goalsMet({ kcal: 900, proteinG: 120, steps: 10000, waterMl: 2000 }, targets).map((g) => g.key);
    expect(keys).toEqual(['protein', 'steps', 'water']);
  });
  it('counts calories only inside 95 to 110 % of the target, so overeating is not a goal', () => {
    expect(goalsMet({ ...zero, kcal: 2300 }, targets).map((g) => g.key)).toEqual(['calories']);
    expect(goalsMet({ ...zero, kcal: 2700 }, targets)).toEqual([]);
    expect(goalsMet({ ...zero, kcal: 1900 }, targets)).toEqual([]);
  });
  it('skips goals without a target', () => {
    expect(goalsMet({ kcal: 5000, proteinG: 500, steps: 99999, waterMl: 0 }, { kcal: null, proteinG: null, steps: null, waterMl: 2000 })).toEqual([]);
  });
});

describe('goalsCrossed', () => {
  it('announces only what this meal pushed over the line', () => {
    const before = { ...zero, proteinG: 100 };
    const after = { ...zero, proteinG: 125 };
    expect(goalsCrossed(before, after, targets).map((g) => g.key)).toEqual(['protein']);
  });
  it('is silent for a goal that was already met', () => {
    const before = { ...zero, proteinG: 130 };
    const after = { ...zero, proteinG: 150 };
    expect(goalsCrossed(before, after, targets)).toEqual([]);
  });
});

describe('copy', () => {
  it('says what protein is left', () => {
    expect(proteinToGo({ ...zero, proteinG: 36 }, targets)).toBe('84 g protein to go');
    expect(proteinToGo({ ...zero, proteinG: 130 }, targets)).toBeNull();
    expect(proteinToGo(zero, { ...targets, proteinG: null })).toBeNull();
  });
  it('titles a meal moment', () => {
    expect(mealMomentTitle('breakfast')).toBe('Breakfast logged');
    expect(mealMomentTitle('SNACK')).toBe('Snack logged');
    expect(mealMomentTitle('')).toBe('Meal logged');
  });
});

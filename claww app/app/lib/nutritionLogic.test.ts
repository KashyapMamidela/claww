import { describe, expect, it } from 'vitest';
import {
  dayLine, mealsLoggedCount, microTargets, proteinGapNote, rateMeal, sodiumOver, sumMicros, usualsFrom,
  type DayNeeds, type LoggedMeal,
} from './nutritionLogic';

const NOW = new Date(2026, 10, 4, 12, 0);
const day = (n: number, h = 9) => new Date(2026, 10, 4 - n, h).toISOString();
const meal = (description: string, n: number, over: Partial<LoggedMeal> = {}): LoggedMeal => ({ description, calories: 90, protein_g: 1, carbs_g: 20, fats_g: 1, meal_type: 'Snack', logged_at: day(n), ...over });

describe('usuals', () => {
  it('top foods eaten at least twice in 14 days, most frequent first', () => {
    const rows = [
      meal('Chai + 2 tsp sugar', 1), meal('chai  + 2 tsp sugar', 2), meal('Chai + 2 tsp sugar', 3),
      meal('2 boiled eggs', 1, { calories: 156, protein_g: 12, meal_type: 'Breakfast' }), meal('2 boiled eggs', 4, { calories: 156, protein_g: 12, meal_type: 'Breakfast' }),
      meal('Once only', 2),
      meal('Old favourite', 20), meal('Old favourite', 21),
    ];
    const u = usualsFrom(rows, NOW);
    expect(u.map((x) => x.label)).toEqual(['Chai + 2 tsp sugar', '2 boiled eggs']);
    expect(u[0].count).toBe(3);
    expect(u[1]).toMatchObject({ kcal: 156, protein: 12, mealType: 'Breakfast' });
  });
  it('at most four, ties by recency, and an empty or tiny history gives none', () => {
    const rows: LoggedMeal[] = [];
    for (const [i, name] of ['a', 'b', 'c', 'd', 'e'].entries()) {
      rows.push(meal(name, 1 + i), meal(name, 8 + i));
    }
    const u = usualsFrom(rows, NOW);
    expect(u).toHaveLength(4);
    expect(u[0].label).toBe('a'); // the most recent of the tied
    expect(usualsFrom([], NOW)).toEqual([]);
    expect(usualsFrom([meal('x', 1)], NOW)).toEqual([]);
  });
});

describe('micronutrient targets', () => {
  it('by age and sex, and the sodium limit is the same', () => {
    expect(microTargets(25, 'male')).toMatchObject({ fibreG: 38, ironMg: 8, calciumMg: 1000, vitcMg: 90, b12Ug: 2.4, sodiumMg: 2300 });
    expect(microTargets(25, 'female')).toMatchObject({ fibreG: 25, ironMg: 18, vitcMg: 75 });
    expect(microTargets(60, 'female')).toMatchObject({ fibreG: 21, ironMg: 8, calciumMg: 1200 });
    expect(microTargets(75, 'male').calciumMg).toBe(1200);
    expect(microTargets(null, null).sodiumMg).toBe(2300);
  });
  it('sums only entries that have micronutrients and says how many', () => {
    const r = sumMicros([{ ironMg: 2.4, fibreG: 3, sodiumMg: 1240 }, null, {}, { ironMg: 1.6, vitcMg: 12 }]);
    expect(r.counted).toBe(2);
    expect(r.total).toBe(4);
    expect(r.totals.ironMg).toBeCloseTo(4, 5);
    expect(r.totals.fibreG).toBe(3);
  });
  it('sodium over the limit is flagged', () => {
    expect(sodiumOver(2400, 2300)).toBe(true);
    expect(sodiumOver(2300, 2300)).toBe(false);
  });
});

describe('meal rating: meals x moments', () => {
  const needs = (over: Partial<DayNeeds> = {}): DayNeeds => ({ kcalTarget: 2150, proteinTarget: 120, kcalBefore: 0, proteinBefore: 0, nextMeal: 'Lunch', ...over });
  const cases: [string, Parameters<typeof rateMeal>[0], Partial<DayNeeds>, 'good' | 'okay' | 'poor'][] = [
    ['poha and two eggs at breakfast (screen 18: good)', { kcal: 420, protein: 19 + 12, fats: 14, mealType: 'Breakfast' }, {}, 'good'],
    ['chicken fried rice at lunch, light on protein (okay)', { kcal: 634, protein: 29, fats: 25, mealType: 'Lunch' }, { kcalBefore: 420, nextMeal: 'Dinner' }, 'okay'],
    ['samosa and chai as a snack (poor)', { kcal: 340, protein: 6, fats: 18, mealType: 'Snack' }, { kcalBefore: 1054, nextMeal: 'Dinner' }, 'poor'],
    ['a boiled egg and banana snack is fine', { kcal: 180, protein: 8, fats: 5, mealType: 'Snack' }, {}, 'good'],
    ['a huge protein dinner is still good', { kcal: 800, protein: 55, fats: 24, mealType: 'Dinner' }, { kcalBefore: 1300, nextMeal: null }, 'good'],
    ['plain sweets for breakfast', { kcal: 500, protein: 4, fats: 22, mealType: 'Breakfast' }, {}, 'poor'],
    ['salty but strong lunch drops to okay', { kcal: 650, protein: 42, fats: 18, sodiumMg: 1800, mealType: 'Lunch' }, { kcalBefore: 420 }, 'okay'],
  ];
  for (const [name, meal, over, expected] of cases) {
    it(name, () => {
      const r = rateMeal(meal, needs(over));
      expect(r.rating).toBe(expected);
      expect(r.reason.length).toBeGreaterThan(10);
    });
  }
  it('the reason points at the next meal, or at tomorrow at the end of the day', () => {
    expect(rateMeal({ kcal: 634, protein: 29, fats: 25, mealType: 'Lunch' }, needs({ kcalBefore: 420, nextMeal: 'Dinner' })).reason).toContain('Dinner');
    expect(rateMeal({ kcal: 340, protein: 6, fats: 18, mealType: 'Dinner' }, needs({ nextMeal: null })).reason).toContain('tomorrow');
  });
  it('is deterministic', () => {
    const m = { kcal: 500, protein: 20, fats: 15, mealType: 'Lunch' };
    expect(rateMeal(m, needs())).toEqual(rateMeal(m, needs()));
  });
});

describe('the day line', () => {
  it('counts main meals and protein (acceptance: 3 of 3 meals logged · protein 82 %)', () => {
    expect(dayLine(['Breakfast', 'Lunch', 'Dinner'], 98, 120)).toBe('3 of 3 meals logged · protein 82 %');
    expect(dayLine(['Breakfast', 'Snack', 'snack'], 40, 120)).toBe('1 of 3 meals logged · protein 33 %');
    expect(dayLine([], 0, null)).toBe('0 of 3 meals logged');
    expect(mealsLoggedCount(['breakfast', 'Breakfast', 'Lunch'])).toBe(2);
  });
  it('the protein pen note', () => {
    expect(proteinGapNote(84, 120, 'Dinner')).toBe('36 g protein to go, dinner closes it');
    expect(proteinGapNote(84, 120, null)).toBe('36 g protein short today');
    expect(proteinGapNote(115, 120, 'Dinner')).toBeNull();
    expect(proteinGapNote(125, 120, 'Dinner')).toBe('protein target met');
    expect(proteinGapNote(10, null, 'Dinner')).toBeNull();
  });
});

import { normaliseSex } from './diaryLogic';
describe('sex from the profile', () => {
  it('only male and female change a target', () => {
    expect(normaliseSex('Male')).toBe('male');
    expect(normaliseSex(' female ')).toBe('female');
    expect(normaliseSex('Prefer not to say')).toBeNull();
    expect(normaliseSex(null)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { addCustom, addOnFor, customAddOns, customKey, customNamesFrom, customToAvailability, fitsDiet, MAX_CUSTOM_FOODS, removeCustom, withoutCustom } from './customFoods';
import type { Food } from './foodLookup';

const food = (over: Partial<Food> = {}): Food => ({
  id: 1, name: 'Rajma masala', aliases: [], kind: 'dish', cuisine: null, diet: 'veg', jainOk: false,
  kcal100g: 120, protein100g: 6, carbs100g: 15, fat100g: 4, fibre100g: null, ironMg100g: null, calciumMg100g: null,
  vitcMg100g: null, b12Ug100g: null, sodiumMg100g: null, sugar100g: null, costInr100g: null,
  units: [{ unit: 'katori', grams: 150, isDefault: true }], reviewed: false, ...over,
});

describe('custom foods', () => {
  it('round-trips through the saved availability keys, apart from the 29 rows', () => {
    const saved = { eggs: 'yes', ...customToAvailability(['Sattu', 'Ragi malt']) };
    expect(customNamesFrom(saved)).toEqual(['Sattu', 'Ragi malt']);
    expect(withoutCustom(saved)).toEqual({ eggs: 'yes' });
    expect(customKey('Sattu')).toBe('food:Sattu');
  });
  it('adds a name once, ignores blanks, and stops at the limit', () => {
    expect(addCustom(['Sattu'], 'sattu')).toEqual(['Sattu']);
    expect(addCustom([], '   ')).toEqual([]);
    const full = Array.from({ length: MAX_CUSTOM_FOODS }, (_, i) => `Food ${i}`);
    expect(addCustom(full, 'One more')).toBe(full);
    expect(removeCustom(['A', 'B'], 'A')).toEqual(['B']);
  });
  it('makes one default portion with numbers computed from the row', () => {
    const a = addOnFor(food());
    expect(a).toMatchObject({ key: 'food:Rajma masala', unit: 'katori', qty: 1, grams: 150, kcal: 180, protein: 9 });
  });
  it('only offers foods the diet allows, and skips names it cannot find', () => {
    const rajma = food();
    const chicken = food({ id: 2, name: 'Chicken curry', diet: 'nonveg' });
    expect(fitsDiet(chicken, 'veg')).toBe(false);
    expect(fitsDiet(chicken, 'nonveg')).toBe(true);
    expect(fitsDiet(food({ diet: null }), 'nonveg')).toBe(false);
    const out = customAddOns(['Rajma masala', 'Chicken curry', 'Unknown'], [rajma, chicken], 'veg');
    expect(out.map((o) => o.food)).toEqual(['Rajma masala']);
  });
});

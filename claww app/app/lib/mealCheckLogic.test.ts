import { describe, expect, it } from 'vitest';
import { itemNutrients, setQuantity, totalsOf, type ScanItem } from './engine';
import { builtMealName, estimateFood, estimateItem, isEstimateFood, itemsExplain } from './mealCheckLogic';

const T = { calories: 420, protein_g: 18, carbs_g: 52, fats_g: 14 };

describe('estimated meal as one line', () => {
  it('one serving carries exactly the estimate', () => {
    const n = itemNutrients(estimateItem('Veg pulao', T));
    expect([n.kcal, n.protein, n.carbs, n.fat]).toEqual([420, 18, 52, 14]);
  });

  it('scales with the stepper: half a serving is half of everything', () => {
    const half = setQuantity(estimateItem('Veg pulao', T), 0.5);
    expect(totalsOf([half]).kcal).toBe(210);
    expect(totalsOf([setQuantity(half, 2)]).protein).toBe(36);
  });

  it('is marked so it is never saved as a database food', () => {
    expect(isEstimateFood(estimateFood('x', T))).toBe(true);
    expect(isEstimateFood({ id: 12 })).toBe(false);
    expect(isEstimateFood(null)).toBe(false);
  });

  it('never carries negative numbers', () => {
    expect(estimateFood('x', { calories: -5, protein_g: -1, carbs_g: 0, fats_g: 0 }).kcal100g).toBe(0);
  });
});

describe('builtMealName', () => {
  const food = (name: string) => ({ ...estimateFood(name, T), id: 5 });
  const item = (name: string, qty: number, unit: string, extra: Partial<ScanItem> = {}): ScanItem => ({ key: name, heard: name, food: food(name), qty, unit, grams: 100, ...extra });

  it('one food keeps its amount', () => {
    expect(builtMealName([item('Roti', 2, 'roti')])).toBe('2 Roti');
    expect(builtMealName([item('Plain dosa', 6, 'dosa')])).toBe('6 Plain dosa');
    expect(builtMealName([item('Chai', 1, 'glass')])).toBe('1 glass Chai');
    expect(builtMealName([item('Paneer', 150, 'g')])).toBe('150 g Paneer');
    expect(builtMealName([item('Dal', 1.5, 'katori')])).toBe('1.5 katori Dal');
  });

  it('several foods are named, the hidden oil is not', () => {
    expect(builtMealName([item('Roti', 2, 'roti'), item('Dal', 1, 'katori'), item('Oil', 2, 'tsp', { hidden: true })])).toBe('Roti, Dal');
    expect(builtMealName([item('A', 1, 'g'), item('B', 1, 'g'), item('C', 1, 'g'), item('D', 1, 'g'), item('E', 1, 'g')])).toBe('A, B, C and 2 more');
  });

  it('an estimate keeps its own name, and nothing reads as Meal', () => {
    expect(builtMealName([estimateItem('Veg pulao', T)])).toBe('Veg pulao');
    expect(builtMealName([])).toBe('Meal');
  });
});

describe('itemsExplain', () => {
  it('accepts items within 12 % of what was saved, rejects the rest', () => {
    expect(itemsExplain(400, 420)).toBe(true);
    expect(itemsExplain(300, 420)).toBe(false);
    expect(itemsExplain(0, 0)).toBe(true);
    expect(itemsExplain(50, 0)).toBe(false);
  });
});

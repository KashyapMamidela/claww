import { describe, expect, it } from 'vitest';
import { itemText } from './mealPlanMeal';

const item = (food: string, unit: string, qty: number) => ({ food, unit, qty }) as Parameters<typeof itemText>[0];

describe('itemText', () => {
  it('does not repeat the unit when the food already says it', () => {
    expect(itemText(item('Roti', 'roti', 3))).toBe('3 roti');
    expect(itemText(item('Boiled eggs', 'egg', 2))).toBe('2 boiled eggs');
  });
  it('keeps household units and words servings properly', () => {
    expect(itemText(item('Sprouts salad', 'katori', 1.5))).toBe('1.5 katori sprouts salad');
    expect(itemText(item('Egg curry', 'serving', 2))).toBe('2 servings of egg curry');
    expect(itemText(item('Egg curry', 'serving', 1))).toBe('1 serving of egg curry');
  });
});

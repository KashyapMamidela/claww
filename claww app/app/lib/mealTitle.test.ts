import { describe, expect, it } from 'vitest';
import { mealTitle } from './mealPlanMeal';

const item = (food: string, unit: string, qty: number) => ({ food, unit, qty }) as never;

describe('mealTitle', () => {
  it('rewrites the egg count to the scaled amount', () => {
    expect(mealTitle({ name: 'Poha with 2 boiled eggs', items: [item('Poha', 'katori', 2), item('Egg, boiled', 'egg', 4)] })).toBe('Poha with 4 boiled eggs');
  });
  it('rewrites the roti count', () => {
    expect(mealTitle({ name: 'Egg curry, 2 roti and sprouts salad', items: [item('Roti', 'roti', 3), item('Egg curry', 'katori', 2)] })).toBe('Egg curry, 3 roti and sprouts salad');
  });
  it('leaves a name alone when it already matches or the item is not a count', () => {
    expect(mealTitle({ name: 'Soya chunks fry, 2 roti and dal', items: [item('Roti', 'roti', 2)] })).toBe('Soya chunks fry, 2 roti and dal');
    expect(mealTitle({ name: 'Dal with 1 katori rice', items: [item('Rice', 'katori', 2)] })).toBe('Dal with 1 katori rice');
  });
});

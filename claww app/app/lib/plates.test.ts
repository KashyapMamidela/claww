import { describe, expect, it } from 'vitest';
import { MAX_PLATES, addPlate, countUse, hasPlate, parsePlates, plateFromMeal, platesFor, removePlate } from './plates';

const now = new Date(2026, 10, 6, 9, 0);
const meal = (description: string, kcal = 400, type: string | null = 'Lunch') => ({ description, calories: kcal, protein_g: 20, carbs_g: 50, fats_g: 10, meal_type: type });

describe('saved plates', () => {
  it('keeps what was eaten, rounded, with the meal it was', () => {
    const p = plateFromMeal(meal('3 roti, dal and sabzi', 612.4), 'a', now);
    expect(p).toMatchObject({ name: '3 roti, dal and sabzi', kcal: 612, proteinG: 20, mealType: 'Lunch', uses: 0 });
  });
  it('saving the same name again replaces it and keeps its use count', () => {
    let list = addPlate([], plateFromMeal(meal('Mess thali'), 'a', now));
    list = countUse(list, 'a');
    list = addPlate(list, plateFromMeal(meal('  mess THALI ', 500), 'b', now));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'b', kcal: 500, uses: 1 });
  });
  it('is capped, newest first', () => {
    let list: ReturnType<typeof addPlate> = [];
    for (let i = 0; i < MAX_PLATES + 5; i++) list = addPlate(list, plateFromMeal(meal(`plate ${i}`), String(i), now));
    expect(list).toHaveLength(MAX_PLATES);
    expect(list[0].name).toBe(`plate ${MAX_PLATES + 4}`);
  });
  it('removes and detects', () => {
    const list = addPlate([], plateFromMeal(meal('Poha'), 'a', now));
    expect(hasPlate(list, 'poha ')).toBe(true);
    expect(removePlate(list, 'a')).toEqual([]);
  });
  it('orders this meal first, then most used', () => {
    let list = addPlate([], plateFromMeal(meal('Eggs', 200, 'Breakfast'), 'e', now));
    list = addPlate(list, plateFromMeal(meal('Thali', 700, 'Lunch'), 't', now));
    list = addPlate(list, plateFromMeal(meal('Rice bowl', 500, 'Lunch'), 'r', now));
    list = countUse(countUse(list, 'r'), 'r');
    expect(platesFor(list, 'Lunch').map((p) => p.id)).toEqual(['r', 't', 'e']);
  });
  it('reads stored data defensively', () => {
    expect(parsePlates(null)).toEqual([]);
    expect(parsePlates([{ id: 'a', name: 'x', kcal: 100 }, { nope: true }, { id: 'b', name: 'y', kcal: 'NaN' }])).toHaveLength(1);
  });
});

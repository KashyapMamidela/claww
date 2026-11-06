import { describe, expect, it } from 'vitest';
import { itemNutrients, setQuantity, stepFor, switchUnit, unitChoices, type ScanFood, type ScanItem } from '../../supabase/functions/_shared/scanMath';

const food = (name: string, units: [string, number][], kcal100g = 130): ScanFood => ({
  id: 1, name, aliases: [], kind: 'ingredient', kcal100g, protein100g: 3, carbs100g: 28, fat100g: 0.3,
  fibre100g: null, ironMg100g: null, calciumMg100g: null, vitcMg100g: null, b12Ug100g: null, sodiumMg100g: null,
  units: units.map(([unit, grams], i) => ({ unit, grams, isDefault: i === 0 })),
});
const rice = food('Rice, cooked', [['katori', 150], ['bowl', 250], ['spoon', 30]]);
const curry = food('Chicken curry', [['bowl', 250], ['katori', 150], ['piece', 60]], 150);
const item = (f: ScanFood, qty: number, unit: string, grams: number): ScanItem => ({ key: 'a', heard: f.name, food: f, qty, unit, grams });

describe('portion units', () => {
  it('lists the food own units, then grams', () => {
    expect(unitChoices(rice)).toEqual(['katori', 'bowl', 'spoon', 'g']);
    expect(unitChoices(curry)).toEqual(['bowl', 'katori', 'piece', 'g']);
  });
  it('steps by half for katori and bowl, one for pieces and spoons', () => {
    expect(stepFor('katori')).toBe(0.5);
    expect(stepFor('bowl')).toBe(0.5);
    expect(stepFor('piece')).toBe(1);
    expect(stepFor('spoon')).toBe(1);
  });
  it('switching unit keeps the grams, so the calories do not move', () => {
    const base = item(rice, 2, 'katori', 300);
    for (const u of ['bowl', 'spoon', 'katori']) {
      const sw = switchUnit(base, u);
      expect(sw.grams).toBe(300);
      expect(itemNutrients(sw).kcal).toBe(itemNutrients(base).kcal);
    }
    expect(switchUnit(base, 'bowl').qty).toBe(1); // 300 g is 1.2 bowls, to the nearest half
    expect(switchUnit(base, 'spoon').qty).toBe(10);
  });
  it('1 bowl of chicken curry becomes about 4 pieces, or 250 g', () => {
    const base = item(curry, 1, 'bowl', 250);
    expect(switchUnit(base, 'piece')).toMatchObject({ unit: 'piece', qty: 4, grams: 250 });
    expect(switchUnit(base, 'g')).toMatchObject({ unit: 'g', qty: 250, grams: 250 });
  });
  it('grams round to 25 g, and then step by the unit', () => {
    const g = switchUnit(item(rice, 1, 'katori', 150), 'g');
    expect(g).toMatchObject({ unit: 'g', qty: 150 });
    expect(switchUnit(item(rice, 1, 'katori', 140), 'g').qty).toBe(150);
    expect(setQuantity({ ...g, qty: 175 }, 175).grams).toBe(175);
  });
  it('does nothing for the same unit, an unknown unit or an unmatched item', () => {
    const base = item(rice, 2, 'katori', 300);
    expect(switchUnit(base, 'katori')).toBe(base);
    expect(switchUnit(base, 'cup')).toBe(base);
    expect(switchUnit({ ...base, food: null }, 'bowl').unit).toBe('katori');
  });
});

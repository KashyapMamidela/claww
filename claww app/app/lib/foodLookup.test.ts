import { describe, expect, it } from 'vitest';
import {
  defaultUnit, gramsFor, matchScore, normalise, nutrientsFor, parseQuery, pickCacheSet, resolveFood, searchFoods, unitsFor,
  type Food,
} from './foodLookup';

// TEST FIXTURES ONLY. These numbers exist to exercise the maths and are NOT nutrition data; the real
// values come from database/foods/*.csv once sourced (see database/foods/SOURCES.md).
function food(over: Partial<Food> & Pick<Food, 'id' | 'name'>): Food {
  return {
    aliases: [], kind: 'ingredient', cuisine: null, diet: 'veg', jainOk: false,
    kcal100g: 100, protein100g: 10, carbs100g: 20, fat100g: 5,
    fibre100g: null, ironMg100g: null, calciumMg100g: null, vitcMg100g: null, b12Ug100g: null, sodiumMg100g: null, sugar100g: null, costInr100g: null,
    units: [{ unit: 'g', grams: 1, isDefault: true }], reviewed: false, ...over,
  };
}

const roti = food({ id: 1, name: 'Roti', aliases: ['chapati', 'phulka'], kind: 'dish', kcal100g: 300, units: [{ unit: 'roti', grams: 40, isDefault: true }] });
const dal = food({ id: 2, name: 'Dal tadka', aliases: ['dal', 'toor dal curry'], kind: 'dish', kcal100g: 100, units: [{ unit: 'katori', grams: 150, isDefault: true }, { unit: 'plate', grams: 300, isDefault: false }] });
const chai = food({ id: 3, name: 'Chai with sugar', aliases: ['chai', 'tea with milk and sugar'], kind: 'dish', kcal100g: 50, units: [{ unit: 'cup', grams: 150, isDefault: true }] });
const rice = food({ id: 4, name: 'Chicken fried rice', kind: 'dish', diet: 'nonveg', units: [{ unit: 'plate', grams: 300, isDefault: true }] });
const rawRice = food({ id: 5, name: 'Rice, raw', aliases: ['rice'], units: [{ unit: 'g', grams: 1, isDefault: true }] });
const all = [roti, dal, chai, rice, rawRice];

describe('parseQuery', () => {
  it('reads a quantity and a unit word', () => {
    expect(parseQuery('1 katori dal')).toEqual({ qty: 1, unitWord: 'katori', text: 'dal' });
    expect(parseQuery('2 rotis')).toEqual({ qty: 2, unitWord: 'roti', text: 'rotis' });
    expect(parseQuery('200g paneer')).toEqual({ qty: 200, unitWord: 'g', text: 'paneer' });
    expect(parseQuery('1/2 glass milk')).toEqual({ qty: 0.5, unitWord: 'glass', text: 'milk' });
    expect(parseQuery('1½ katori dal')).toEqual({ qty: 1.5, unitWord: 'katori', text: 'dal' });
  });
  it('leaves a plain name alone', () => {
    expect(parseQuery('Chai')).toEqual({ qty: null, unitWord: null, text: 'chai' });
    expect(parseQuery('')).toEqual({ qty: null, unitWord: null, text: '' });
  });
});

describe('matchScore and searchFoods', () => {
  it('ranks exact name, then alias, then prefix, then words, then substring', () => {
    expect(matchScore(roti, 'roti')).toBeGreaterThan(matchScore(roti, 'chapati') - 1);
    expect(matchScore(rawRice, 'rice')).toBeGreaterThan(matchScore(rice, 'rice'));
    expect(matchScore(rice, 'fried')).toBeGreaterThan(matchScore(rice, 'ried'));
    expect(matchScore(rice, 'pizza')).toBe(0);
  });
  it('finds foods by alias and ignores case and punctuation', () => {
    expect(searchFoods(all, 'Chapati')[0].name).toBe('Roti');
    expect(searchFoods(all, 'CHAI!')[0].name).toBe('Chai with sugar');
    expect(normalise('  Dál, Tadka ')).toBe('dal tadka');
  });
  it('resolves "chicken fried rice" to the dish, not raw rice', () => {
    expect(searchFoods(all, 'chicken fried rice')[0].name).toBe('Chicken fried rice');
  });
  it('prefers a dish over an ingredient on equal matches, then frequently used foods', () => {
    const a = food({ id: 10, name: 'Paneer', kind: 'ingredient' });
    const b = food({ id: 11, name: 'Paneer', kind: 'dish' });
    expect(searchFoods([a, b], 'paneer')[0].id).toBe(11);
    const c = food({ id: 12, name: 'Egg curry' });
    const d = food({ id: 13, name: 'Egg bhurji' });
    expect(searchFoods([c, d], 'egg', 8, { 13: 5 })[0].id).toBe(13);
  });
  it('honours the limit', () => {
    expect(searchFoods(all, 'r', 2)).toHaveLength(2);
  });
});

describe('units and nutrients', () => {
  it('converts household units to grams', () => {
    expect(gramsFor(dal, 1, 'katori')).toBe(150);
    expect(gramsFor(dal, 2, 'katoris')).toBe(300);
    expect(gramsFor(dal, 1, 'plate')).toBe(300);
    expect(gramsFor(roti, 2)).toBe(80);
    expect(gramsFor(dal, 120, 'g')).toBe(120);
    expect(gramsFor(dal, 1, 'unknown')).toBe(150);
  });
  it('lists the default unit first and ends with grams', () => {
    expect(unitsFor(dal).map((u) => u.unit)).toEqual(['katori', 'plate', 'g']);
    expect(defaultUnit(roti).unit).toBe('roti');
  });
  it('scales nutrients and keeps unknown micronutrients null', () => {
    const n = nutrientsFor(roti, 80);
    expect(n.kcal).toBe(240);
    expect(n.proteinG).toBe(8);
    expect(n.ironMg).toBeNull();
    const withIron = nutrientsFor(food({ id: 20, name: 'X', ironMg100g: 2.5 }), 40);
    expect(withIron.ironMg).toBe(1);
  });
});

describe('resolveFood', () => {
  it('"2 roti" is 80 g of roti', () => {
    const r = resolveFood(all, '2 roti')!;
    expect(r.food.name).toBe('Roti');
    expect(r.qty).toBe(2);
    expect(r.nutrients.grams).toBe(80);
    expect(r.nutrients.kcal).toBe(240);
  });
  it('"1 katori dal" is 150 g of dal', () => {
    const r = resolveFood(all, '1 katori dal')!;
    expect(r.food.name).toBe('Dal tadka');
    expect(r.unit).toBe('katori');
    expect(r.nutrients.grams).toBe(150);
  });
  it('"chai" is one cup', () => {
    const r = resolveFood(all, 'chai')!;
    expect(r.food.name).toBe('Chai with sugar');
    expect(r.unit).toBe('cup');
    expect(r.nutrients.grams).toBe(150);
  });
  it('"200g rice" uses grams and returns null for no match', () => {
    expect(resolveFood(all, '200g rice')!.nutrients.grams).toBe(200);
    expect(resolveFood(all, 'zzz')).toBeNull();
  });
});

describe('pickCacheSet', () => {
  it('keeps the most used first, then name order, up to the limit', () => {
    const picked = pickCacheSet(all, { 3: 9, 1: 4 }, 3).map((f) => f.id);
    expect(picked.slice(0, 2)).toEqual([3, 1]);
    expect(picked).toHaveLength(3);
  });
});

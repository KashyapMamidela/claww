import { describe, expect, it } from 'vitest';
// @ts-ignore build script is plain ESM JavaScript
import { resolveFood, type Food } from './foodLookup';
import { buildSql, dishPer100g, loadFoods, parseCsv, validate } from '../../database/foods/build_foods.mjs';

// The build script's checks, run on TEST FIXTURES (not nutrition data), plus the committed CSVs.

const ing = (name: string, over: Record<string, string> = {}) => ({
  name, aliases: '', cuisine: '', diet: 'veg', jain_ok: 'false', kcal_100g: '100', protein_100g: '10', carbs_100g: '10', fat_100g: '2',
  fibre_100g: '', iron_mg_100g: '', calcium_mg_100g: '', vitc_mg_100g: '', b12_ug_100g: '', sodium_mg_100g: '', sugar_100g: '', cost_inr_100g: '',
  source: 'fixture', source_ref: '', ...over,
});
const base = () => ({
  ingredients: [ing('Flour', { kcal_100g: '300' }), ing('Oil', { kcal_100g: '800', protein_100g: '0', carbs_100g: '0', fat_100g: '99' })],
  dishes: [{ name: 'Roti', aliases: 'chapati', cuisine: '', diet: 'veg', jain_ok: 'false', kcal_100g: '', source: 'fixture', source_ref: '' }],
  items: [{ dish: 'Roti', item: 'Flour', grams: '36' }, { dish: 'Roti', item: 'Oil', grams: '4' }],
  units: [
    { food: 'Flour', unit: 'g', grams: '1', is_default: 'true' },
    { food: 'Oil', unit: 'tsp', grams: '5', is_default: 'true' },
    { food: 'Roti', unit: 'roti', grams: '40', is_default: 'true' },
  ],
});

describe('parseCsv', () => {
  it('handles quotes, commas and blank lines', () => {
    expect(parseCsv('a,b\n"x, y",2\n\n')).toEqual([{ a: 'x, y', b: '2' }]);
    expect(parseCsv('a\n"say ""hi"""')).toEqual([{ a: 'say "hi"' }]);
  });
});

describe('validate', () => {
  it('accepts good data', () => {
    expect(validate(base())).toEqual([]);
  });
  it('totals a dish from its items (per 100 g)', () => {
    const d = base();
    const m = new Map(d.ingredients.map((r) => [r.name, r]));
    const { per100g, grams } = dishPer100g(d.items, m) as { per100g: Record<string, number>; grams: number };
    expect(grams).toBe(40);
    // (300 x 36 + 800 x 4) / 100 = 140 kcal in 40 g, which is 350 per 100 g
    expect(per100g.kcal_100g).toBeCloseTo(350, 5);
  });
  it('fails when a stated dish value is more than 5 % off the items', () => {
    const d = base();
    d.dishes[0].kcal_100g = '400';
    expect(validate(d).join()).toMatch(/more than 5/);
    d.dishes[0].kcal_100g = '360';
    expect(validate(d)).toEqual([]);
  });
  it('rejects negative values, a missing default unit, a missing source and unknown items', () => {
    let d = base();
    d.ingredients[0].protein_100g = '-1';
    expect(validate(d).join()).toMatch(/negative/);
    d = base();
    d.units = d.units.filter((u) => u.food !== 'Oil');
    expect(validate(d).join()).toMatch(/no default unit/);
    d = base();
    d.ingredients[0].source = '';
    expect(validate(d).join()).toMatch(/source is required/);
    d = base();
    d.items.push({ dish: 'Roti', item: 'Ghost', grams: '5' });
    expect(validate(d).join()).toMatch(/not in ingredients/);
  });
  it('rejects impossible macros and a dish more permissive than its items', () => {
    let d = base();
    d.ingredients[0].fat_100g = '95';
    expect(validate(d).join()).toMatch(/protein \+ carbs \+ fat/);
    d = base();
    d.ingredients[0].diet = 'nonveg';
    expect(validate(d).join()).toMatch(/marked veg but contains/);
  });
});

describe('buildSql', () => {
  it('is idempotent SQL that never touches review fields', () => {
    const sql = buildSql(base());
    expect(sql).toContain('ON CONFLICT (name) DO UPDATE');
    expect(sql).toContain('ON CONFLICT (food_id, unit)');
    expect(sql).toContain('ON CONFLICT (dish_id, item_id)');
    expect(sql).not.toMatch(/reviewed_by\s*=/);
    expect(buildSql(base())).toBe(sql);
  });
});

describe('the committed CSVs', () => {
  it('pass validation (empty until sourced data is added)', () => {
    expect(validate(loadFoods())).toEqual([]);
  });
  it('has real rows with a default unit each, and every dish is veg-consistent', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = loadFoods();
    expect(d.ingredients.length).toBeGreaterThan(100);
    expect(d.dishes.length).toBeGreaterThan(80);
    expect((d.ingredients as { source: string }[]).every((r) => r.source.length > 0)).toBe(true);
  });
  it('"chicken fried rice", "2 roti", "1 katori dal" and "chai" resolve with units and nutrients (NG PHASE 4 acceptance)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = loadFoods();
    const byName = new Map(d.ingredients.map((r: { name: string }) => [r.name, r]));
    const num = (v: string) => (v === '' || v === undefined ? null : Number(v));
    const foods: Food[] = [];
    const add = (row: Record<string, string>, kind: 'ingredient' | 'dish', n: Record<string, number | null>, id: number) => {
      foods.push({
        id, name: row.name, aliases: row.aliases ? row.aliases.split('|') : [], kind, cuisine: row.cuisine || null, diet: row.diet as Food['diet'], jainOk: row.jain_ok === 'true',
        kcal100g: n.kcal_100g ?? 0, protein100g: n.protein_100g ?? 0, carbs100g: n.carbs_100g ?? 0, fat100g: n.fat_100g ?? 0,
        fibre100g: n.fibre_100g ?? null, ironMg100g: n.iron_mg_100g ?? null, calciumMg100g: n.calcium_mg_100g ?? null, vitcMg100g: n.vitc_mg_100g ?? null,
        b12Ug100g: n.b12_ug_100g ?? null, sodiumMg100g: n.sodium_mg_100g ?? null, sugar100g: n.sugar_100g ?? null, costInr100g: null,
        units: d.units.filter((u: { food: string }) => u.food === row.name).map((u: { unit: string; grams: string; is_default: string }) => ({ unit: u.unit, grams: Number(u.grams), isDefault: u.is_default === 'true' })),
        reviewed: false,
      });
    };
    d.ingredients.forEach((r: Record<string, string>, i: number) => add(r, 'ingredient', Object.fromEntries(Object.keys(r).filter((k) => k.endsWith('_100g')).map((k) => [k, num(r[k])])), i + 1));
    d.dishes.forEach((r: Record<string, string>, i: number) => {
      const { per100g } = dishPer100g(d.items.filter((x: { dish: string }) => x.dish === r.name), byName) as unknown as { per100g: Record<string, number | null> };
      add(r, 'dish', per100g, 1000 + i);
    });
    const rice = resolveFood(foods, 'chicken fried rice')!;
    expect(rice.food.name).toBe('Chicken fried rice');
    expect(rice.nutrients.kcal).toBeGreaterThan(300);
    const roti = resolveFood(foods, '2 roti')!;
    expect(roti.food.name).toBe('Roti');
    expect(roti.nutrients.grams).toBe(80);
    const dal = resolveFood(foods, '1 katori dal')!;
    expect(dal.food.name).toBe('Dal tadka');
    expect(dal.nutrients.grams).toBe(150);
    expect(dal.nutrients.ironMg).not.toBeNull();
    const chai = resolveFood(foods, 'chai')!;
    expect(chai.food.name).toBe('Chai with sugar');
    expect(chai.unit).toBe('cup');
    expect(chai.nutrients.calciumMg).not.toBeNull();
  });
});

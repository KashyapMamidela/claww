import { describe, expect, it } from 'vitest';
// @ts-ignore build script is plain ESM JavaScript
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
});

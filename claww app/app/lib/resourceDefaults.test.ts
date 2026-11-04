import { describe, expect, it } from 'vitest';
import {
  COOK_OPTIONS, DIET_OPTIONS, FOOD_ROWS, SOURCES, cookLabel, countAvailability, defaultAvailability, defaultBudget, dietLabel, mergeEdits,
  proteinVerdict, restrictionsForDiet, dietFromRestrictions, sourcesLabel, visibleFoods, type Cook, type Source,
} from './resourceDefaults';
import { resourceGaps } from './resourceGaps';

describe('visibleFoods', () => {
  it('vegetarian, vegan and Jain hide eggs and chicken; eggetarian hides chicken only', () => {
    for (const d of ['veg', 'vegan', 'jain'] as const) {
      expect(visibleFoods(d)).not.toContain('eggs');
      expect(visibleFoods(d)).not.toContain('chicken');
    }
    expect(visibleFoods('egg')).toContain('eggs');
    expect(visibleFoods('egg')).not.toContain('chicken');
    expect(visibleFoods('nonveg')).toHaveLength(12);
    expect(visibleFoods(null)).toHaveLength(12);
  });
});

describe('defaultAvailability', () => {
  it('mess + kettle: eggs yes, paneer sometimes, oats no (the build plan example)', () => {
    const a = defaultAvailability(['mess'], ['kettle'], 'egg');
    expect(a.eggs).toBe('yes');
    expect(a.paneer).toBe('sometimes');
    expect(a.oats).toBe('no');
    expect(a.soya).toBe('yes');
  });
  it('matches screen 12 for mess + eating out + kettle, eggetarian', () => {
    const a = defaultAvailability(['mess', 'outside'], ['kettle'], 'egg');
    expect(a).toMatchObject({ eggs: 'yes', paneer: 'sometimes', soya: 'yes', dal: 'yes', curd: 'yes', milk: 'sometimes', peanuts: 'yes', banana: 'yes', sprouts: 'no', oats: 'no', whey: 'no' });
  });
  it('is valid for every source x cook-with x diet, and hidden foods are always no', () => {
    const sources = SOURCES.map((s) => s.value);
    const cooks = COOK_OPTIONS.map((c) => c.value);
    let n = 0;
    for (const s of sources) for (const c of cooks) for (const d of DIET_OPTIONS.map((x) => x.value)) {
      const a = defaultAvailability([s], [c], d);
      const visible = new Set(visibleFoods(d));
      for (const row of FOOD_ROWS) {
        expect(['yes', 'sometimes', 'no']).toContain(a[row.key]);
        if (!visible.has(row.key)) expect(a[row.key]).toBe('no');
      }
      // no way to heat anything: soya and oats cannot be offered
      if (c === 'none') {
        expect(a.soya).toBe('no');
        expect(a.oats).not.toBe('yes');
      }
      // nobody is offered milk or curd when vegan
      if (d === 'vegan') {
        expect(a.milk).toBe('no');
        expect(a.curd).toBe('no');
      }
      n++;
    }
    expect(n).toBe(6 * 6 * 5);
  });
  it('a home cook with a full kitchen gets the broad set', () => {
    const a = defaultAvailability(['home'], ['full_kitchen'], 'nonveg');
    expect(a).toMatchObject({ eggs: 'yes', paneer: 'yes', chicken: 'yes', oats: 'yes', milk: 'yes' });
  });
  it('vegan paneer reads as tofu: sometimes', () => {
    expect(defaultAvailability(['self_cook'], ['stove'], 'vegan').paneer).toBe('sometimes');
  });
  it('nothing chosen yet gives all no except peanuts and banana', () => {
    const a = defaultAvailability([], [], null);
    expect(Object.entries(a).filter(([, v]) => v !== 'no').map(([k]) => k).sort()).toEqual(['banana', 'peanuts']);
  });
});

describe('budget, labels and helpers', () => {
  it('150 with a mess or tiffin, else 250', () => {
    expect(defaultBudget(['mess'])).toBe(150);
    expect(defaultBudget(['pg_tiffin', 'outside'])).toBe(150);
    expect(defaultBudget(['home'])).toBe(250);
    expect(defaultBudget(['canteen', 'outside'])).toBe(250);
    expect(defaultBudget([])).toBe(250);
  });
  it('words for the summary card', () => {
    expect(sourcesLabel(['mess', 'outside'])).toBe('Mess + eating out');
    expect(sourcesLabel([])).toBe('Not set');
    expect(cookLabel(['kettle'])).toBe('Kettle');
    expect(cookLabel(['none'])).toBe('Nothing');
    expect(cookLabel(['stove', 'microwave'])).toBe('Gas stove + Microwave');
    expect(dietLabel('egg')).toBe('Eggetarian');
  });
  it('counts and the protein verdict', () => {
    const a = defaultAvailability(['mess', 'outside'], ['kettle'], 'egg');
    expect(countAvailability(a, FOOD_ROWS.map((r) => r.key))).toEqual({ yes: 6, sometimes: 2, no: 4 });
    expect(proteinVerdict(a, 'egg')).toBe('Plenty of protein options');
    expect(proteinVerdict(defaultAvailability(['outside'], ['none'], 'veg'), 'veg')).not.toBe('Plenty of protein options');
  });
  it('hand edits survive new defaults', () => {
    const d = defaultAvailability(['home'], ['stove'], 'nonveg');
    expect(mergeEdits(d, { eggs: 'no' }).eggs).toBe('no');
    expect(mergeEdits(d, {}).eggs).toBe(d.eggs);
  });
});

describe('resourceGaps', () => {
  const input = (sources: Source[], cookWith: Cook[], diet: 'veg' | 'egg' | 'nonveg' | 'vegan' | 'jain') => ({ sources, cookWith, diet, availability: defaultAvailability(sources, cookWith, diet) });

  it('mess + kettle, eggetarian gives the three gaps on screen 13', () => {
    const gaps = resourceGaps(input(['mess', 'outside'], ['kettle'], 'egg'));
    expect(gaps.map((g) => [g.title, g.fix])).toEqual([
      ['No stove', 'eggs and soya on the kettle'],
      ['Mess dinner low in protein', 'eggs added at dinner'],
      ['No whey', 'curd + peanuts as snacks'],
    ]);
    expect(gaps[0].step).toBe(1);
    expect(gaps[1].step).toBe(2);
  });
  it('a vegetarian never gets an egg fix', () => {
    const gaps = resourceGaps(input(['mess'], ['kettle'], 'veg'));
    expect(gaps.map((g) => g.fix).join(' ')).not.toMatch(/egg/);
  });
  it('a home cook with a stove has no stove or fixed-meal gaps', () => {
    const ids = resourceGaps(input(['home'], ['full_kitchen'], 'nonveg')).map((g) => g.id);
    expect(ids).not.toContain('no_stove');
    expect(ids).not.toContain('fixed_meal_protein');
  });
  it('no way to cook falls back to ready-to-eat food', () => {
    const g = resourceGaps(input(['outside'], ['none'], 'veg')).find((x) => x.id === 'no_kitchen')!;
    expect(g.fix).toMatch(/ready-to-eat/);
  });
  it('a non-veg eater with no chicken is pointed to other protein', () => {
    const a = defaultAvailability(['home'], ['stove'], 'nonveg');
    const g = resourceGaps({ sources: ['home'], cookWith: ['stove'], diet: 'nonveg', availability: { ...a, chicken: 'no' } }).find((x) => x.id === 'no_chicken')!;
    expect(g.fix).toMatch(/eggs/);
  });
  it('gaps are valid for every combination and never empty text', () => {
    for (const s of SOURCES.map((x) => x.value)) for (const c of COOK_OPTIONS.map((x) => x.value)) for (const d of DIET_OPTIONS.map((x) => x.value)) {
      for (const g of resourceGaps(input([s], [c], d))) {
        expect(g.title.length).toBeGreaterThan(0);
        expect(g.fix.length).toBeGreaterThan(0);
        expect([1, 2]).toContain(g.step);
      }
    }
  });
});

describe('diet and restrictions', () => {
  it('keeps allergies and religion, swaps the diet ones', () => {
    expect(restrictionsForDiet('veg', ['nut_allergy', 'vegan'])).toEqual(['vegetarian', 'nut_allergy']);
    expect(restrictionsForDiet('vegan', ['halal'])).toEqual(['vegan', 'halal']);
    expect(restrictionsForDiet('nonveg', ['vegetarian', 'halal'])).toEqual(['halal']);
    expect(restrictionsForDiet('jain', [])).toEqual(['vegetarian']);
    expect(restrictionsForDiet('egg', [])).toEqual(['vegetarian']);
  });
  it('reads a starting diet back', () => {
    expect(dietFromRestrictions(['vegan'])).toBe('vegan');
    expect(dietFromRestrictions(['vegetarian'])).toBe('veg');
    expect(dietFromRestrictions([])).toBeNull();
  });
});

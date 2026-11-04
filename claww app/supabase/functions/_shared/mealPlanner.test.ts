import { describe, expect, it } from 'vitest';
import { ADD_ONS, MEAL_TEMPLATES } from './mealTemplates/index.ts';
import { cheapestFix, FACTORS, isEligible, planDay, replanRemaining, scaleTemplate, stepFor, swapOptions, KCAL_TOLERANCE, PROTEIN_MIN, type PlanInput, type Resources } from './mealPlanner.ts';
import type { Availability } from './mealTypes.ts';

const res = (over: Partial<Resources> & { av?: Record<string, Availability> } = {}): Resources => {
  const { av, ...rest } = over;
  return {
    sources: ['home', 'self_cook'],
    cookWith: ['full_kitchen', 'stove'],
    diet: 'nonveg',
    availability: { eggs: 'yes', chicken: 'yes', dal: 'yes', soya: 'yes', curd: 'yes', milk: 'yes', peanuts: 'yes', banana: 'yes', sprouts: 'yes', oats: 'yes', whey: 'no', paneer: 'yes', ...(av ?? {}) },
    avoid: [],
    style: 'varied',
    ...rest,
  };
};
const input = (r: Resources, kcal = 2200, protein = 120, date = '2026-11-04', history: PlanInput['history'] = []): PlanInput => ({
  target: { kcal, protein }, resources: r, date, seed: 'user-1', history, templates: MEAL_TEMPLATES, addOns: ADD_ONS,
});
const entry = (p: ReturnType<typeof planDay>, date: string) => ({ date, meals: p.meals.map((m) => ({ meal: m.meal, templateId: m.templateId, uses: m.uses })) });

describe('the generated template data', () => {
  it('has 40 templates per meal, every number computed, none reviewed', () => {
    for (const m of ['breakfast', 'lunch', 'dinner']) expect(MEAL_TEMPLATES.filter((t) => t.meal === m)).toHaveLength(40);
    for (const t of MEAL_TEMPLATES) {
      expect(t.reviewed).toBe(false);
      expect(t.kcal).toBeGreaterThan(100);
      expect(t.items.every((i) => i.kcal !== null && i.grams > 0)).toBe(true);
    }
    expect(ADD_ONS.length).toBeGreaterThanOrEqual(6);
  });
  it('covers every diet', () => {
    expect([...new Set(MEAL_TEMPLATES.map((t) => t.diet))].sort()).toEqual(['egg', 'nonveg', 'veg', 'vegan']);
  });
});

describe('scaling uses valid household steps', () => {
  it('every item of every template at every factor is a multiple of its step', () => {
    for (const t of MEAL_TEMPLATES) for (const f of FACTORS) {
      for (const i of scaleTemplate(t, f).items) {
        const step = stepFor(i.unit);
        expect(Math.abs(i.qty / step - Math.round(i.qty / step))).toBeLessThan(1e-9);
        expect(i.qty).toBeGreaterThanOrEqual(step);
      }
    }
  });
  it('factor 1 leaves the template as written', () => {
    expect(scaleTemplate(MEAL_TEMPLATES[0], 1).kcal).toBe(MEAL_TEMPLATES[0].kcal);
  });
});

describe('eligibility', () => {
  it('diet is respected', () => {
    for (const m of planDay(input(res({ diet: 'veg' }))).meals) expect(MEAL_TEMPLATES.find((t) => t.id === m.templateId)!.diet).toMatch(/^(vegan|veg)$/);
    for (const m of planDay(input(res({ diet: 'vegan', av: { curd: 'no', milk: 'no' } }))).meals) expect(MEAL_TEMPLATES.find((t) => t.id === m.templateId)!.diet).toBe('vegan');
  });
  it('a food marked "no" never appears, and the avoid list is honoured', () => {
    for (const m of planDay(input(res({ av: { eggs: 'no' } }))).meals) expect(m.uses).not.toContain('eggs');
    for (const m of planDay(input(res({ avoid: ['rajma', 'chicken'] }))).meals) expect(m.name.toLowerCase()).not.toMatch(/rajma|chicken/);
  });
  it('Jain plans use only Jain-ok templates', () => {
    for (const m of planDay(input(res({ diet: 'jain' }), 1800, 80)).meals) expect(MEAL_TEMPLATES.find((t) => t.id === m.templateId)!.jainOk).toBe(true);
  });
  it('"sometimes" foods appear on at most 3 days a week', () => {
    const r = res({ av: { eggs: 'sometimes' }, diet: 'egg' });
    const history: PlanInput['history'] = [];
    let eggDays = 0;
    for (let d = 0; d < 7; d++) {
      const date = `2026-11-${String(2 + d).padStart(2, '0')}`;
      const p = planDay(input(r, 2200, 110, date, history));
      history.push(entry(p, date));
      if (p.meals.some((m) => m.uses.includes('eggs'))) eggDays += 1;
    }
    expect(eggDays).toBeLessThanOrEqual(3);
  });
  it('a mess and kettle user only gets what that set-up allows', () => {
    const r = res({ sources: ['mess'], cookWith: ['kettle'], diet: 'egg' });
    for (const m of planDay(input(r)).meals) {
      const t = MEAL_TEMPLATES.find((x) => x.id === m.templateId)!;
      expect(isEligible(t, r, [], '2026-11-04')).toBe(true);
    }
  });
});

describe('determinism and variety', () => {
  it('same input, same plan', () => {
    expect(planDay(input(res()))).toEqual(planDay(input(res())));
  });
  it('"varied" avoids repeating a template within 3 days', () => {
    const r = res({ style: 'varied' });
    const history: PlanInput['history'] = [];
    const seen: string[][] = [];
    for (let d = 0; d < 4; d++) {
      const date = `2026-11-${String(1 + d).padStart(2, '0')}`;
      const p = planDay(input(r, 2200, 120, date, history));
      history.push(entry(p, date));
      seen.push(p.meals.map((m) => m.templateId));
    }
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (let k = 0; k < 3; k++) expect(seen[j][k]).not.toBe(seen[i][k]);
  });
  it('"same every day" repeats the day', () => {
    const same = res({ style: 'same' });
    const day1 = planDay(input(same, 2200, 120, '2026-11-01'));
    const day2 = planDay(input(same, 2200, 120, '2026-11-02', [entry(day1, '2026-11-01')]));
    expect(day2.meals.map((m) => m.templateId)).toEqual(day1.meals.map((m) => m.templateId));
  });
});

describe('20 sample resource profiles: within 7 % calories and 90 % protein, or a shortfall with a fix', () => {
  const profiles: [string, Resources][] = [
    ['home nonveg, full kitchen', res()],
    ['home veg', res({ diet: 'veg' })],
    ['home eggetarian', res({ diet: 'egg' })],
    ['home vegan', res({ diet: 'vegan', av: { curd: 'no', milk: 'no', eggs: 'no', whey: 'no' } })],
    ['home Jain', res({ diet: 'jain' })],
    ['mess + kettle, eggetarian', res({ sources: ['mess', 'outside'], cookWith: ['kettle'], diet: 'egg', av: { paneer: 'sometimes', milk: 'sometimes', oats: 'no', sprouts: 'no' } })],
    ['mess + kettle, veg', res({ sources: ['mess'], cookWith: ['kettle'], diet: 'veg' })],
    ['mess, nothing to cook with, nonveg', res({ sources: ['mess'], cookWith: ['none'], diet: 'nonveg', av: { soya: 'no', oats: 'no' } })],
    ['PG tiffin + microwave', res({ sources: ['pg_tiffin'], cookWith: ['microwave'], diet: 'veg' })],
    ['canteen + eating out', res({ sources: ['canteen', 'outside'], cookWith: ['none'], diet: 'nonveg' })],
    ['eating out only, veg', res({ sources: ['outside'], cookWith: ['none'], diet: 'veg' })],
    ['self cook with rice cooker', res({ sources: ['self_cook'], cookWith: ['rice_cooker'], diet: 'egg' })],
    ['home, eggs sometimes', res({ diet: 'egg', av: { eggs: 'sometimes' } })],
    ['home, no dal', res({ diet: 'veg', av: { dal: 'no' } })],
    ['home, no curd or milk', res({ diet: 'veg', av: { curd: 'no', milk: 'no' } })],
    ['mess + whey', res({ sources: ['mess'], cookWith: ['kettle'], diet: 'egg', av: { whey: 'yes' } })],
    ['home, avoid mushrooms and fish', res({ avoid: ['mushroom', 'fish'] })],
    ['home + mess', res({ sources: ['home', 'mess'], cookWith: ['stove'], diet: 'nonveg' })],
    ['stove only, vegan, soya yes', res({ diet: 'vegan', cookWith: ['stove'], av: { curd: 'no', milk: 'no', eggs: 'no' } })],
    ['canteen veg with kettle', res({ sources: ['canteen'], cookWith: ['kettle'], diet: 'veg' })],
  ];
  const targets: [number, number][] = [[1800, 90], [2200, 120], [2800, 160]];
  it('every plan fits or reports a shortfall with a fix', () => {
    let fits = 0;
    const bad: string[] = [];
    for (const [name, r] of profiles) for (const [kcal, protein] of targets) {
      const p = planDay(input(r, kcal, protein));
      if (p.ok) {
        fits += 1;
        expect(Math.abs(p.totals.kcal - kcal) / kcal).toBeLessThanOrEqual(KCAL_TOLERANCE);
        expect(p.totals.protein).toBeGreaterThanOrEqual(protein * PROTEIN_MIN);
      } else if (!p.shortfall) bad.push(`${name} ${kcal}: not ok and no shortfall`);
      else if (p.shortfall.proteinGapG > 0 && !p.shortfall.fix) bad.push(`${name} ${kcal}/${protein}: protein gap ${p.shortfall.proteinGapG} with no fix`);
      expect(p.meals.length).toBeGreaterThan(0);
    }
    expect(bad).toEqual([]);
    expect(fits).toBeGreaterThan(profiles.length * targets.length * 0.6);
  });
  it('a fix only uses foods the user can get and their diet allows', () => {
    for (const [, r] of profiles) for (const [kcal, protein] of targets) {
      const fix = planDay(input(r, kcal, protein)).shortfall?.fix;
      if (!fix) continue;
      expect(r.availability[fix.key]).not.toBe('no');
      if (fix.key === 'eggs') expect(['egg', 'nonveg']).toContain(r.diet);
      if (['curd', 'milk', 'whey'].includes(fix.key)) expect(r.diet).not.toBe('vegan');
      expect(fix.text).toContain('adds');
    }
  });
});

describe('the cheapest fix', () => {
  it('picks the densest protein the user can get', () => {
    const f = cheapestFix(26, { resources: res({ diet: 'veg', av: { whey: 'no' } }), addOns: ADD_ONS })!;
    expect(f.key).toBe('soya');
    expect(f.text).toMatch(/soya chunks adds \d+ g protein/);
    expect(cheapestFix(26, { resources: res({ diet: 'veg', av: { soya: 'no', whey: 'no' } }), addOns: ADD_ONS })!.key).not.toBe('soya');
    expect(cheapestFix(0, { resources: res(), addOns: ADD_ONS })).toBeNull();
  });
});

describe('swaps and re-planning', () => {
  it('swap options are the same meal within 10 % calories and 15 % protein, at most five', () => {
    const i = input(res());
    const lunch = planDay(i).meals.find((m) => m.meal === 'lunch')!;
    const opts = swapOptions(lunch, i);
    expect(opts.length).toBeLessThanOrEqual(5);
    for (const o of opts) {
      expect(o.meal).toBe('lunch');
      expect(o.templateId).not.toBe(lunch.templateId);
      expect(Math.abs(o.kcal - lunch.kcal) / lunch.kcal).toBeLessThanOrEqual(0.1);
      expect(Math.abs(o.protein - lunch.protein) / lunch.protein).toBeLessThanOrEqual(0.15);
    }
  });
  it('after a swap or an extra, the remaining meals are planned against what is left', () => {
    const rest = replanRemaining(input(res()), ['dinner'], { kcal: 1500, protein: 70 });
    expect(rest.meals).toHaveLength(1);
    expect(rest.meals[0].meal).toBe('dinner');
    expect(rest.meals[0].kcal).toBeLessThan(900);
  });
});

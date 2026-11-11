import { describe, expect, it } from 'vitest';
// @ts-ignore plain ESM JavaScript
import { dishPer100g, loadFoods } from '../../../database/foods/build_foods.mjs';
import {
  applyContext, candidateChips, DEFAULT_CONTEXT, gramsFor, matchFood, MATCH_THRESHOLD, OIL_FOOD, parseModelOutput, resolveItems, roundQty, routeScan,
  setQuantity, totalsOf, type ModelOutput, type ScanFood,
} from './scanMath.ts';
import { AllVisionProvidersFailed, callVisionProviders, openAiCompatibleProvider, type VisionProvider } from './vision.ts';

// The real food database (113 ingredients, 86 dishes) as ScanFood rows.
function loadScanFoods(): ScanFood[] {
  const d = loadFoods();
  const byName = new Map(d.ingredients.map((r: Record<string, string>) => [r.name, r]));
  const num = (v: string | null | undefined) => (v === '' || v === undefined || v === null ? null : Number(v));
  const out: ScanFood[] = [];
  let id = 1;
  const units = (name: string) => d.units.filter((u: Record<string, string>) => u.food === name).map((u: Record<string, string>) => ({ unit: u.unit, grams: Number(u.grams), isDefault: u.is_default === 'true' }));
  for (const r of d.ingredients as Record<string, string>[]) {
    out.push({
      id: id++, name: r.name, aliases: r.aliases ? r.aliases.split('|') : [], kind: 'ingredient',
      kcal100g: Number(r.kcal_100g), protein100g: Number(r.protein_100g), carbs100g: Number(r.carbs_100g), fat100g: Number(r.fat_100g),
      fibre100g: num(r.fibre_100g), ironMg100g: num(r.iron_mg_100g), calciumMg100g: num(r.calcium_mg_100g), vitcMg100g: num(r.vitc_mg_100g), b12Ug100g: num(r.b12_ug_100g), sodiumMg100g: num(r.sodium_mg_100g),
      units: units(r.name),
    });
  }
  for (const r of d.dishes as Record<string, string>[]) {
    const items = d.items.filter((i: Record<string, string>) => i.dish === r.name);
    const { per100g } = dishPer100g(items, byName) as unknown as { per100g: Record<string, number | null> };
    out.push({
      id: id++, name: r.name, aliases: r.aliases ? r.aliases.split('|') : [], kind: 'dish',
      kcal100g: per100g.kcal_100g ?? 0, protein100g: per100g.protein_100g ?? 0, carbs100g: per100g.carbs_100g ?? 0, fat100g: per100g.fat_100g ?? 0,
      fibre100g: per100g.fibre_100g, ironMg100g: per100g.iron_mg_100g, calciumMg100g: per100g.calcium_mg_100g, vitcMg100g: per100g.vitc_mg_100g, b12Ug100g: per100g.b12_ug_100g, sodiumMg100g: per100g.sodium_mg_100g,
      units: units(r.name),
    });
  }
  return out;
}
const FOODS = loadScanFoods();
const oil = FOODS.find((f) => f.name === OIL_FOOD)!;

describe('matching what the model heard to foods', () => {
  const cases: [string, string][] = [
    ['fried rice', 'Vegetable fried rice'],
    ['chicken fried rice', 'Chicken fried rice'],
    ['chapati', 'Roti'],
    ['rotis', 'Roti'],
    ['idly', 'Idli'],
    ['sambhar', 'Sambar'],
    ['boiled egg', 'Boiled eggs'],
    ['chai', 'Chai with sugar'],
    ['curd', 'Curd, plain'],
    ['dal', 'Dal tadka'],
    // From the first live scan of a salad bowl: these all came back "not in the database".
    ['red bell pepper', 'Capsicum, red'],
    ['yellow bell pepper', 'Capsicum, yellow'],
    ['shredded purple cabbage', 'Cabbage, red'],
    ['mixed greens', 'Lettuce and salad greens'],
    ['avocado', 'Avocado'],
    ['chickpeas', 'Chickpeas, boiled'],
    ['sliced avocado', 'Avocado'],
    ['green bell pepper', 'Capsicum, green'],
    ['chopped cabbage', 'Cabbage'],
  ];
  for (const [heard, expected] of cases) {
    it(`"${heard}" is ${expected}`, () => {
      const m = matchFood(heard, FOODS);
      expect(m).not.toBeNull();
      expect(m!.food.name).toBe(expected);
      expect(m!.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    });
  }
  it('something that is not in the database does not match', () => {
    expect(matchFood('quinoa tabbouleh', FOODS)).toBeNull();
    expect(matchFood('', FOODS)).toBeNull();
  });
  it('household units convert to grams, and an unknown unit falls back to the default', () => {
    const roti = FOODS.find((f) => f.name === 'Roti')!;
    expect(gramsFor(roti, 2, 'roti').grams).toBe(80);
    expect(gramsFor(roti, 2, 'pieces').grams).toBe(80);
    expect(gramsFor(roti, 100, 'grams')).toEqual({ grams: 100, unit: 'g' });
    const rice = FOODS.find((f) => f.name === 'Rice, cooked')!;
    expect(gramsFor(rice, 1.5, 'bowl').grams).toBe(225);
    expect(gramsFor(rice, 1, 'furlong').grams).toBe(150);
  });
});

describe('resolving items', () => {
  const items = [
    { name: 'fried rice', quantity: 1.5, unit: 'katori' },
    { name: 'egg', quantity: 1, unit: 'piece' },
    { name: 'cooking oil', quantity: 3, unit: 'tsp' },
    { name: 'mystery garnish', quantity: 1, unit: 'piece' },
  ];
  it('drops the oil the model mentions (oil comes from "how oily?") and keeps unmatched items for the user', () => {
    const r = resolveItems(items, FOODS);
    expect(r.map((i) => i.heard)).toEqual(['fried rice', 'egg', 'mystery garnish']);
    expect(r[0].food).not.toBeNull();
    expect(r[2].food).toBeNull();
    expect(r[1].grams).toBe(50);
  });
});

describe('oil and portion math', () => {
  const base = resolveItems([{ name: 'chicken fried rice', quantity: 1, unit: 'plate' }, { name: 'boiled egg', quantity: 1, unit: 'piece' }], FOODS);
  it('light, normal and heavy add 1, 2 and 3 tsp of oil as a hidden line', () => {
    for (const [oilLevel, tsp] of [['light', 1], ['normal', 2], ['heavy', 3]] as const) {
      const out = applyContext(base, { ...DEFAULT_CONTEXT, oil: oilLevel }, oil);
      const line = out.find((i) => i.key === 'oil')!;
      expect(line.hidden).toBe(true);
      expect(line.qty).toBe(tsp);
      expect(line.grams).toBe(tsp * 5);
    }
  });
  it('heavy oil adds calories, a larger portion scales items in valid steps', () => {
    const normal = totalsOf(applyContext(base, { ...DEFAULT_CONTEXT, oil: 'normal' }, oil)).kcal;
    const heavy = totalsOf(applyContext(base, { ...DEFAULT_CONTEXT, oil: 'heavy' }, oil)).kcal;
    expect(heavy - normal).toBeGreaterThan(40);
    const large = applyContext(base, { ...DEFAULT_CONTEXT, portion: 'large' }, oil);
    for (const i of large.filter((x) => !x.hidden)) {
      const step = i.unit === 'plate' || i.unit === 'katori' ? 0.5 : 1;
      expect(Math.abs(i.qty / step - Math.round(i.qty / step))).toBeLessThan(1e-9);
    }
    expect(totalsOf(large).kcal).toBeGreaterThan(totalsOf(applyContext(base, DEFAULT_CONTEXT, oil)).kcal);
    expect(totalsOf(applyContext(base, { ...DEFAULT_CONTEXT, portion: 'shared' }, oil)).kcal).toBeLessThan(totalsOf(applyContext(base, DEFAULT_CONTEXT, oil)).kcal);
  });
  it('does not change the model items in place', () => {
    const copy = JSON.stringify(base);
    applyContext(base, { place: 'restaurant', oil: 'heavy', portion: 'large' }, oil);
    expect(JSON.stringify(base)).toBe(copy);
  });
  it('a stepper changes grams and calories from the database', () => {
    const rice = base[0];
    const more = setQuantity(rice, rice.qty + 0.5);
    expect(more.grams).toBeGreaterThan(rice.grams);
    expect(totalsOf([more]).kcal).toBeGreaterThan(totalsOf([rice]).kcal);
    expect(roundQty(0.2, 'katori')).toBe(0.5);
    expect(roundQty(2.2, 'tsp')).toBe(2);
  });
});

describe('model output validation and confidence routing', () => {
  const good = { isFood: true, isAppropriate: true, dish: 'Chicken fried rice', items: [{ name: 'fried rice', quantity: 1, unit: 'plate' }], confidence: 0.8, candidates: ['Egg fried rice', 'Chicken fried rice', 'Veg pulao'] };
  it('accepts a well-formed answer and drops bad items', () => {
    const o = parseModelOutput({ ...good, items: [...good.items, { name: '', quantity: 1 }, { name: 'x', quantity: -2 }, { name: 'y', quantity: 500 }] })!;
    expect(o.items).toHaveLength(1);
    expect(parseModelOutput({ ...good, confidence: 7 })!.confidence).toBe(1);
    expect(parseModelOutput({ isFood: 'yes' })).toBeNull();
    expect(parseModelOutput({ ...good, items: [] })).toBeNull();
    expect(parseModelOutput({ ...good, confidence: 'high' })).toBeNull();
    expect(parseModelOutput(null)).toBeNull();
  });
  it('routes: ok, not sure under 0.5 or with no match, blocked', () => {
    const o = parseModelOutput(good) as ModelOutput;
    expect(routeScan(o, 3)).toBe('ok');
    expect(routeScan({ ...o, confidence: 0.49 }, 3)).toBe('not_sure');
    expect(routeScan({ ...o, confidence: 0.5 }, 3)).toBe('ok');
    expect(routeScan(o, 0)).toBe('not_sure');
    expect(routeScan({ ...o, isFood: false }, 0)).toBe('blocked_not_food');
    expect(routeScan({ ...o, isAppropriate: false }, 3)).toBe('blocked_inappropriate');
  });
  it('the Not sure chips are up to four distinct dishes', () => {
    const o = parseModelOutput(good) as ModelOutput;
    expect(candidateChips(o)).toEqual(['Egg fried rice', 'Chicken fried rice', 'Veg pulao']);
    expect(candidateChips({ ...o, candidates: ['A', 'B', 'C', 'D', 'E'] })).toHaveLength(4);
  });
});

describe('vision providers: order, timeout and validation', () => {
  const ok = (name: string, text: string, delay = 0): VisionProvider => ({ name, call: () => new Promise((r) => setTimeout(() => r(text), delay)) });
  const fail = (name: string): VisionProvider => ({ name, call: () => Promise.reject(new Error('HTTP 503')) });
  const parse = (t: string) => (t === 'bad' ? null : t.toUpperCase());

  it('the first provider that answers wins and the rest are not called', async () => {
    let called = 0;
    const second: VisionProvider = { name: 'backup', call: () => { called += 1; return Promise.resolve('b'); } };
    const r = await callVisionProviders([ok('groq', 'a'), second], 's', 'u', 'img', parse);
    expect(r.provider).toBe('groq');
    expect(r.value).toBe('A');
    expect(called).toBe(0);
  });
  it('if Groq fails the backup answers, and both attempts are recorded', async () => {
    const r = await callVisionProviders([fail('groq'), ok('backup', 'b')], 's', 'u', 'img', parse);
    expect(r.provider).toBe('backup');
    expect(r.attempts.map((a) => [a.provider, a.ok])).toEqual([['groq', false], ['backup', true]]);
  });
  it('a provider that times out moves on within the timeout, and the whole thing stays inside two timeouts', async () => {
    const started = Date.now();
    const r = await callVisionProviders([ok('slow', 'a', 400), ok('backup', 'b', 10)], 's', 'u', 'img', parse, 80);
    expect(r.provider).toBe('backup');
    expect(Date.now() - started).toBeLessThan(400);
    expect(r.attempts[0].error).toContain('timed out');
  });
  it('an answer that fails validation counts as a failure', async () => {
    const r = await callVisionProviders([ok('groq', 'bad'), ok('backup', 'b')], 's', 'u', 'img', parse);
    expect(r.provider).toBe('backup');
    expect(r.attempts[0].error).toContain('validation');
  });
  it('all failing is reported with every attempt', async () => {
    await expect(callVisionProviders([fail('groq'), fail('backup')], 's', 'u', 'img', parse)).rejects.toBeInstanceOf(AllVisionProvidersFailed);
  });
  it('the backup provider speaks the OpenAI chat format', async () => {
    let seen: { url: string; body: Record<string, unknown>; auth: string } | null = null;
    const fakeFetch = (async (url: string, init: { body: string; headers: Record<string, string> }) => {
      seen = { url, body: JSON.parse(init.body), auth: init.headers.Authorization };
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"x":1}' } }] }) };
    }) as unknown as typeof fetch;
    const p = openAiCompatibleProvider({ name: 'backup:test', url: 'https://example.test/v1/chat/completions', key: 'k', model: 'm' }, fakeFetch);
    expect(await p.call('sys', 'user', 'data:image/jpeg;base64,AAA', new AbortController().signal)).toBe('{"x":1}');
    expect(seen!.auth).toBe('Bearer k');
    expect(seen!.body.model).toBe('m');
  });
});

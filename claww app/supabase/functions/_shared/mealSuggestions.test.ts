import { describe, expect, it } from 'vitest';
import { fitScore, rankOptions, violatesAvoid, violatesRestrictions, whyItFits, type RawOption, type Remaining } from './mealSuggestions';

const opt = (description: string, calories: number, protein_g: number, carbs_g = 40, fats_g = 12, prep_minutes = 15): RawOption => ({
  description,
  calories,
  protein_g,
  carbs_g,
  fats_g,
  prep_minutes,
});

const remaining: Remaining = { calories: 1500, protein_g: 100, carbs_g: 180, fats_g: 50 };
const ctx = { mealType: 'Lunch' as const, restrictions: [], avoid: '', eatenToday: [], remaining };

describe('violatesRestrictions', () => {
  it('vegetarian rejects meat and fish words', () => {
    expect(violatesRestrictions('Grilled chicken with rice', ['vegetarian'])).toBe(true);
    expect(violatesRestrictions('Paneer tikka with roti', ['vegetarian'])).toBe(false);
  });
  it('vegan also rejects dairy and egg', () => {
    expect(violatesRestrictions('Paneer bhurji', ['vegan'])).toBe(true);
    expect(violatesRestrictions('Egg curry', ['vegan'])).toBe(true);
    expect(violatesRestrictions('Chana masala with rice', ['vegan'])).toBe(false);
  });
  it('dairy-free, gluten-free and nut allergy', () => {
    expect(violatesRestrictions('Curd rice', ['dairy_free'])).toBe(true);
    expect(violatesRestrictions('Wheat roti with dal', ['gluten_free'])).toBe(true);
    expect(violatesRestrictions('Peanut chikki', ['nut_allergy'])).toBe(true);
  });
  it('halal rejects pork, shellfish allergy rejects prawns', () => {
    expect(violatesRestrictions('Bacon sandwich', ['halal'])).toBe(true);
    expect(violatesRestrictions('Prawn curry', ['shellfish_allergy'])).toBe(true);
  });
  it('does not flag unrelated words that merely contain letters', () => {
    expect(violatesRestrictions('Hamburger-free bowl of rice', ['halal'])).toBe(false);
  });
  it('no restrictions never violates', () => {
    expect(violatesRestrictions('Chicken biryani', [])).toBe(false);
  });
});

describe('violatesAvoid', () => {
  it('matches comma separated terms and simple plurals', () => {
    expect(violatesAvoid('Mushroom fried rice', 'mushrooms, brinjal')).toBe(true);
    expect(violatesAvoid('Brinjal curry', 'mushrooms, brinjal')).toBe(true);
    expect(violatesAvoid('Dal and rice', 'mushrooms, brinjal')).toBe(false);
  });
  it('empty or tiny terms never match', () => {
    expect(violatesAvoid('Anything', '')).toBe(false);
    expect(violatesAvoid('Anything', 'a, b')).toBe(false);
  });
});

describe('rankOptions', () => {
  it('puts the option closest to the meal share first and flags it', () => {
    // Lunch share 0.4 of remaining: target 600 kcal, 40 g protein.
    const r = rankOptions([opt('Huge platter', 1400, 90), opt('Chicken rice bowl', 600, 40, 70, 18), opt('Tiny salad', 120, 4)], ctx);
    expect(r).toHaveLength(3);
    expect(r[0].description).toBe('Chicken rice bowl');
    expect(r[0].bestFit).toBe(true);
    expect(r.slice(1).every((x) => !x.bestFit)).toBe(true);
  });
  it('drops restriction and avoid violations, repeats of eaten meals and duplicates', () => {
    const r = rankOptions(
      [opt('Chicken curry', 500, 35), opt('Paneer wrap', 520, 28), opt('Mushroom soup', 300, 8), opt('Dal rice', 480, 20), opt('Dal rice', 480, 20), opt('Rajma chawal', 550, 22)],
      { ...ctx, restrictions: ['vegetarian'], avoid: 'mushroom', eatenToday: ['Rajma chawal'] }
    );
    expect(r.map((x) => x.description).sort()).toEqual(['Dal rice', 'Paneer wrap']);
  });
  it('returns at most 3 and [] when nothing survives', () => {
    const many = Array.from({ length: 6 }, (_, i) => opt(`Meal ${i}`, 500 + i * 10, 30));
    expect(rankOptions(many, ctx)).toHaveLength(3);
    expect(rankOptions([opt('Chicken', 500, 30)], { ...ctx, restrictions: ['vegan'] })).toEqual([]);
  });
  it('clamps absurd model numbers', () => {
    const r = rankOptions([opt('Odd meal', 99999, -5)], ctx);
    expect(r[0].calories).toBe(2000);
    expect(r[0].protein_g).toBe(0);
  });
  it('more_protein prefers the higher protein option, quicker the faster one', () => {
    const a = opt('Light bowl', 600, 20, 70, 18, 10);
    const b = opt('Protein plate', 600, 55, 40, 18, 40);
    expect(rankOptions([a, b], { ...ctx, refine: 'more_protein' })[0].description).toBe('Protein plate');
    expect(rankOptions([a, b], { ...ctx, refine: 'quicker' })[0].description).toBe('Light bowl');
  });
});

describe('fitScore and whyItFits', () => {
  it('penalises going over the calorie budget', () => {
    const tight: Remaining = { calories: 300, protein_g: 20, carbs_g: 30, fats_g: 10 };
    expect(fitScore(opt('x', 800, 20), tight, 'Dinner')).toBeGreaterThan(fitScore(opt('x', 250, 20), tight, 'Dinner'));
  });
  it('writes the reason from the numbers', () => {
    expect(whyItFits(opt('x', 600, 40), remaining)).toBe('40 g protein covers 40% of the 100 g you have left.');
    expect(whyItFits(opt('x', 300, 5), remaining)).toBe('300 kcal leaves 1200 of your 1500 kcal for the rest of the day.');
    expect(whyItFits(opt('x', 900, 5), { ...remaining, calories: 500 })).toBe('900 kcal runs 400 over what is left today (500).');
  });
});

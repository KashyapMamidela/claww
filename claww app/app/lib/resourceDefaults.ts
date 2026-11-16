// NG PHASE 6: what the user can get. Step 2 of the meal setup ("Can you get these?") is pre-filled from step 1
// by these rules, so most people only fix one or two rows. Pure, so Vitest can test every combination.

import type { DietaryRestriction } from './data';

export type Source = 'home' | 'mess' | 'pg_tiffin' | 'canteen' | 'outside' | 'self_cook';
export type Cook = 'full_kitchen' | 'stove' | 'kettle' | 'microwave' | 'rice_cooker' | 'none';
export type Diet = 'veg' | 'egg' | 'nonveg' | 'vegan' | 'jain';
export type Availability = 'yes' | 'sometimes' | 'no';

export const SOURCES: { value: Source; title: string; sub: string; icon: string }[] = [
  { value: 'home', title: 'Home cooked', sub: 'Family kitchen', icon: 'home' },
  { value: 'mess', title: 'Hostel or mess', sub: 'Fixed menu', icon: 'building-2' },
  { value: 'pg_tiffin', title: 'PG or tiffin', sub: 'Delivered meals', icon: 'package' },
  { value: 'canteen', title: 'Office canteen', sub: 'Weekday lunch', icon: 'briefcase' },
  { value: 'outside', title: 'Eating out', sub: 'Restaurants, stalls', icon: 'store' },
  { value: 'self_cook', title: 'I cook myself', sub: 'Your own kitchen', icon: 'chef-hat' },
];

export const COOK_OPTIONS: { value: Cook; label: string }[] = [
  { value: 'full_kitchen', label: 'Full kitchen' },
  { value: 'stove', label: 'Gas stove' },
  { value: 'kettle', label: 'Kettle' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'rice_cooker', label: 'Rice cooker' },
  { value: 'none', label: 'Nothing' },
];

export const DIET_OPTIONS: { value: Diet; label: string }[] = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'egg', label: 'Eggetarian' },
  { value: 'nonveg', label: 'Non-veg' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'jain', label: 'Jain' },
];

export type FoodKey =
  | 'eggs' | 'paneer' | 'chicken' | 'soya' | 'dal' | 'curd' | 'milk' | 'peanuts' | 'banana' | 'sprouts' | 'oats' | 'whey'
  // Added with the card deck: more protein, the staples a meal is built on, and fresh food.
  | 'tofu' | 'rajma' | 'chana' | 'fish' | 'mutton' | 'besan' | 'buttermilk' | 'nuts' | 'makhana'
  | 'roti' | 'rice' | 'millets' | 'poha' | 'idli_dosa' | 'bread' | 'greens' | 'fruit';

export interface FoodRow {
  key: FoodKey;
  title: string;
  sub: string;
  group: FoodGroup;
}

/** protein: what carries the day's protein; everyday: dairy, snacks and quick foods; staple: what a meal is built on; fresh: vegetables and fruit. */
export type FoodGroup = 'protein' | 'everyday' | 'staple' | 'fresh';
export const GROUP_TITLES: Record<FoodGroup, string> = { protein: 'PROTEIN', everyday: 'EVERYDAY', staple: 'STAPLES', fresh: 'FRESH' };

export const FOOD_ROWS: FoodRow[] = [
  { key: 'eggs', title: 'Eggs', sub: '6 g protein each', group: 'protein' },
  { key: 'paneer', title: 'Paneer', sub: '18 g protein per 100 g', group: 'protein' },
  { key: 'chicken', title: 'Chicken', sub: 'mess, home or outside', group: 'protein' },
  { key: 'soya', title: 'Soya chunks', sub: 'cheap, very high protein', group: 'protein' },
  { key: 'dal', title: 'Dal and chana', sub: 'any lentils', group: 'protein' },
  { key: 'curd', title: 'Curd', sub: 'or buttermilk', group: 'protein' },
  { key: 'milk', title: 'Milk', sub: '1 glass a day', group: 'everyday' },
  { key: 'peanuts', title: 'Peanuts', sub: 'or roasted chana', group: 'everyday' },
  { key: 'banana', title: 'Banana', sub: 'quick energy', group: 'everyday' },
  { key: 'sprouts', title: 'Sprouts', sub: 'moong, chana', group: 'everyday' },
  { key: 'oats', title: 'Oats', sub: 'with a kettle', group: 'everyday' },
  { key: 'whey', title: 'Whey protein', sub: 'optional; food comes first', group: 'everyday' },
  { key: 'tofu', title: 'Tofu', sub: '10 g protein per 100 g, low fat', group: 'protein' },
  { key: 'rajma', title: 'Rajma', sub: 'kidney beans, 15 g a cup', group: 'protein' },
  { key: 'chana', title: 'Chole and kala chana', sub: 'chickpeas, 14 g a cup', group: 'protein' },
  { key: 'fish', title: 'Fish and prawns', sub: 'rohu, sardine, tilapia', group: 'protein' },
  { key: 'mutton', title: 'Mutton and keema', sub: 'a few times a month', group: 'protein' },
  { key: 'besan', title: 'Besan chilla', sub: 'gram flour, 6 g per quarter cup', group: 'protein' },
  { key: 'buttermilk', title: 'Buttermilk (chaas)', sub: 'light, with meals', group: 'everyday' },
  { key: 'nuts', title: 'Almonds and walnuts', sub: 'a handful, 6 g protein', group: 'everyday' },
  { key: 'makhana', title: 'Makhana', sub: 'roasted fox nuts', group: 'everyday' },
  { key: 'roti', title: 'Roti and atta', sub: 'whole wheat', group: 'staple' },
  { key: 'rice', title: 'Rice', sub: 'white or brown', group: 'staple' },
  { key: 'millets', title: 'Ragi, bajra, jowar', sub: 'millets: ICMR says 30 to 40 percent of cereals', group: 'staple' },
  { key: 'poha', title: 'Poha and upma', sub: 'quick breakfasts', group: 'staple' },
  { key: 'idli_dosa', title: 'Idli and dosa', sub: 'fermented batter', group: 'staple' },
  { key: 'bread', title: 'Bread', sub: 'whole wheat if you can', group: 'staple' },
  { key: 'greens', title: 'Leafy greens', sub: 'palak, methi, amaranth', group: 'fresh' },
  { key: 'fruit', title: 'Seasonal fruit', sub: 'ICMR: whole fruit beats juice', group: 'fresh' },
];

export type AvailabilityMap = Record<FoodKey, Availability>;

/** Foods that do not apply to a diet are not shown (and count as "no"): vegetarians never see eggs or chicken. */
export function visibleFoods(diet: Diet | null): FoodKey[] {
  const hidden = new Set<FoodKey>();
  const MEAT: FoodKey[] = ['chicken', 'fish', 'mutton'];
  if (diet === 'veg' || diet === 'vegan' || diet === 'jain') {
    hidden.add('eggs');
    for (const k of MEAT) hidden.add(k);
  }
  if (diet === 'egg') for (const k of MEAT) hidden.add(k);
  if (diet === 'vegan') hidden.add('buttermilk');
  return FOOD_ROWS.map((r) => r.key).filter((k) => !hidden.has(k));
}

/** Default budget in rupees a day beyond fixed meals: 150 when a mess or tiffin covers some meals, else 250. */
export function defaultBudget(sources: Source[]): number {
  return sources.includes('mess') || sources.includes('pg_tiffin') ? 150 : 250;
}

const hasStove = (cook: Cook[]) => cook.includes('full_kitchen') || cook.includes('stove');
const canHeat = (cook: Cook[]) => cook.some((c) => c !== 'none');

export function defaultAvailability(sources: Source[], cook: Cook[], diet: Diet | null): AvailabilityMap {
  const has = (s: Source) => sources.includes(s);
  const cooksAtHome = has('home') || has('self_cook');
  const fixedMeals = has('mess') || has('pg_tiffin') || has('canteen');
  const visible = new Set(visibleFoods(diet));
  const vegan = diet === 'vegan';
  const any = sources.length > 0;

  const rule = (k: FoodKey): Availability => {
    switch (k) {
      case 'eggs':
        return canHeat(cook) || cooksAtHome || has('mess') || has('pg_tiffin') ? 'yes' : fixedMeals || has('outside') ? 'sometimes' : 'no';
      case 'paneer':
        if (vegan) return 'sometimes'; // tofu
        return cooksAtHome && (has('home') || hasStove(cook)) ? 'yes' : any ? 'sometimes' : 'no';
      case 'chicken':
        return cooksAtHome && (has('home') || hasStove(cook)) ? 'yes' : any ? 'sometimes' : 'no';
      case 'soya':
        return canHeat(cook) ? 'yes' : 'no';
      case 'dal':
        return has('outside') && sources.length === 1 ? 'sometimes' : any ? 'yes' : 'no';
      case 'curd':
        if (vegan) return 'no';
        return cooksAtHome || has('mess') || has('pg_tiffin') ? 'yes' : any ? 'sometimes' : 'no';
      case 'milk':
        if (vegan) return 'no';
        return has('home') ? 'yes' : any ? 'sometimes' : 'no';
      case 'peanuts':
      case 'banana':
        return 'yes';
      case 'sprouts':
        return cooksAtHome && canHeat(cook) ? 'sometimes' : 'no';
      case 'oats':
        // Oats need someone to make them; a mess menu does not include them even with a kettle in the room.
        return cooksAtHome && canHeat(cook) ? 'yes' : has('pg_tiffin') && canHeat(cook) ? 'sometimes' : 'no';
      case 'whey':
        return 'no';
      case 'tofu':
        return vegan ? 'sometimes' : cooksAtHome && canHeat(cook) ? 'sometimes' : 'no';
      case 'rajma':
      case 'chana':
        // Home kitchens make them weekly; a mess serves them now and then; eating out is the odd chole.
        return cooksAtHome && canHeat(cook) ? 'yes' : fixedMeals || has('outside') ? 'sometimes' : 'no';
      case 'fish':
        return fixedMeals || has('outside') || (cooksAtHome && (has('home') || hasStove(cook))) ? 'sometimes' : 'no';
      case 'mutton':
        return has('outside') || (cooksAtHome && (has('home') || hasStove(cook))) ? 'sometimes' : 'no';
      case 'besan':
        return cooksAtHome && canHeat(cook) ? 'yes' : 'no';
      case 'buttermilk':
        return vegan ? 'no' : has('home') || has('mess') ? 'yes' : any ? 'sometimes' : 'no';
      case 'nuts':
      case 'makhana':
        return any ? 'sometimes' : 'no';
      case 'roti':
      case 'rice':
      case 'bread':
        return any ? 'yes' : 'no';
      case 'millets':
        return cooksAtHome && has('home') ? 'sometimes' : 'no';
      case 'poha':
        return cooksAtHome && canHeat(cook) ? 'yes' : fixedMeals || has('outside') ? 'sometimes' : 'no';
      case 'idli_dosa':
        return has('home') ? 'yes' : fixedMeals || has('outside') ? 'sometimes' : 'no';
      case 'greens':
        return has('home') || has('mess') || has('self_cook') ? 'yes' : any ? 'sometimes' : 'no';
      case 'fruit':
        return has('home') || has('self_cook') ? 'yes' : any ? 'sometimes' : 'no';
    }
  };

  const out = {} as AvailabilityMap;
  for (const r of FOOD_ROWS) out[r.key] = visible.has(r.key) ? rule(r.key) : 'no';
  return out;
}

export function countAvailability(map: AvailabilityMap, keys: FoodKey[]): { yes: number; sometimes: number; no: number } {
  const c = { yes: 0, sometimes: 0, no: 0 };
  for (const k of keys) c[map[k]] += 1;
  return c;
}

/** The one-line read under step 2's counts. */
export function proteinVerdict(map: AvailabilityMap, diet: Diet | null): string {
  const protein = visibleFoods(diet).filter((k) => FOOD_ROWS.find((r) => r.key === k)?.group === 'protein');
  const c = countAvailability(map, protein);
  const good = c.yes + c.sometimes * 0.5;
  return good >= 4.5 ? 'Plenty of protein options' : good >= 2.5 ? 'A few protein options' : 'Few protein options';
}

/** Merge what the user fixed by hand over fresh defaults, so changing step 1 never undoes a correction. */
export function mergeEdits(defaults: AvailabilityMap, edits: Partial<AvailabilityMap>): AvailabilityMap {
  return { ...defaults, ...edits };
}

export function dietLabel(diet: Diet | null): string {
  return DIET_OPTIONS.find((d) => d.value === diet)?.label ?? 'Not set';
}

const SOURCE_SHORT: Record<Source, string> = { home: 'Home', mess: 'Mess', pg_tiffin: 'Tiffin', canteen: 'Canteen', outside: 'eating out', self_cook: 'Self cooked' };

export function sourcesLabel(sources: Source[]): string {
  if (sources.length === 0) return 'Not set';
  return sources.map((s) => SOURCE_SHORT[s]).join(' + ');
}

export function cookLabel(cook: Cook[]): string {
  const real = cook.filter((c) => c !== 'none');
  if (real.length === 0) return 'Nothing';
  return real.map((c) => COOK_OPTIONS.find((o) => o.value === c)!.label).join(' + ');
}

/**
 * The dietary restrictions the rest of the app reads (suggestions, logging checks), kept in step with the diet:
 * vegetarian, eggetarian and Jain become "vegetarian" (eggs are decided by the availability row, not here),
 * vegan becomes "vegan", non-veg clears both. Allergy and religious restrictions the user already had are kept.
 */
export function restrictionsForDiet(diet: Diet, existing: DietaryRestriction[]): DietaryRestriction[] {
  const kept = existing.filter((r) => r !== 'vegetarian' && r !== 'vegan');
  if (diet === 'vegan') return ['vegan', ...kept];
  if (diet === 'nonveg') return kept;
  return ['vegetarian', ...kept];
}

/** The diet to start from when the user has set up before: from the saved restrictions. */
export function dietFromRestrictions(restrictions: DietaryRestriction[]): Diet | null {
  if (restrictions.includes('vegan')) return 'vegan';
  if (restrictions.includes('vegetarian')) return 'veg';
  return null;
}

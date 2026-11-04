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

export type FoodKey = 'eggs' | 'paneer' | 'chicken' | 'soya' | 'dal' | 'curd' | 'milk' | 'peanuts' | 'banana' | 'sprouts' | 'oats' | 'whey';

export interface FoodRow {
  key: FoodKey;
  title: string;
  sub: string;
  group: 'protein' | 'everyday';
}

export const FOOD_ROWS: FoodRow[] = [
  { key: 'eggs', title: 'Eggs', sub: '6 g protein each', group: 'protein' },
  { key: 'paneer', title: 'Paneer', sub: 'or tofu', group: 'protein' },
  { key: 'chicken', title: 'Chicken', sub: 'mess, home or outside', group: 'protein' },
  { key: 'soya', title: 'Soya chunks', sub: 'cheap, very high protein', group: 'protein' },
  { key: 'dal', title: 'Dal and chana', sub: 'any lentils', group: 'protein' },
  { key: 'curd', title: 'Curd', sub: 'or buttermilk', group: 'protein' },
  { key: 'milk', title: 'Milk', sub: '1 glass a day', group: 'everyday' },
  { key: 'peanuts', title: 'Peanuts', sub: 'or roasted chana', group: 'everyday' },
  { key: 'banana', title: 'Banana', sub: 'quick energy', group: 'everyday' },
  { key: 'sprouts', title: 'Sprouts', sub: 'moong, chana', group: 'everyday' },
  { key: 'oats', title: 'Oats', sub: 'with a kettle', group: 'everyday' },
  { key: 'whey', title: 'Whey protein', sub: 'optional', group: 'everyday' },
];

export type AvailabilityMap = Record<FoodKey, Availability>;

/** Foods that do not apply to a diet are not shown (and count as "no"): vegetarians never see eggs or chicken. */
export function visibleFoods(diet: Diet | null): FoodKey[] {
  const hidden = new Set<FoodKey>();
  if (diet === 'veg' || diet === 'vegan' || diet === 'jain') {
    hidden.add('eggs');
    hidden.add('chicken');
  }
  if (diet === 'egg') hidden.add('chicken');
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
  return good >= 3.5 ? 'Plenty of protein options' : good >= 2 ? 'A few protein options' : 'Few protein options';
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

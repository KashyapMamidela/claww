// "Add a food I get": foods the person can get that the 29 rows of "Can you get these?" do not cover. They are picked from
// the food database (so every number is real, never typed), stored with the rest of the meal setup, and used by the planner
// as extra ways to close a protein shortfall ("+ 1 katori of rajma adds 12 g protein").
//
// Stored in user_resources.availability under "food:<name>" keys, so no schema change is needed.

import type { AddOn } from './engine';
import { defaultUnit, nutrientsFor, type Food } from './foodLookup';
import type { Diet } from './resourceDefaults';

export const CUSTOM_PREFIX = 'food:';
export const MAX_CUSTOM_FOODS = 12;

export const customKey = (name: string): string => `${CUSTOM_PREFIX}${name}`;

/** The names kept under "food:" keys, in a stable order. */
export function customNamesFrom(map: Record<string, unknown> | null | undefined): string[] {
  return Object.keys(map ?? {})
    .filter((k) => k.startsWith(CUSTOM_PREFIX) && k.length > CUSTOM_PREFIX.length)
    .map((k) => k.slice(CUSTOM_PREFIX.length));
}

/** The availability map with every "food:" key taken out (what the 29 rows use). */
export function withoutCustom<T extends Record<string, unknown>>(map: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(map)) if (!k.startsWith(CUSTOM_PREFIX)) out[k] = v;
  return out as T;
}

/** The saved form: one "food:<name>": "yes" per name. */
export function customToAvailability(names: string[]): Record<string, 'yes'> {
  return Object.fromEntries(names.map((n) => [customKey(n), 'yes' as const]));
}

/** Adds a name once (case-insensitive), up to the limit. */
export function addCustom(names: string[], name: string): string[] {
  const clean = name.trim();
  if (!clean || names.some((n) => n.toLowerCase() === clean.toLowerCase()) || names.length >= MAX_CUSTOM_FOODS) return names;
  return [...names, clean];
}

export const removeCustom = (names: string[], name: string): string[] => names.filter((n) => n !== name);

const ALLOWED: Record<Diet, (Food['diet'])[]> = {
  vegan: ['vegan'],
  veg: ['vegan', 'veg'],
  jain: ['vegan', 'veg'],
  egg: ['vegan', 'veg', 'egg'],
  nonveg: ['vegan', 'veg', 'egg', 'nonveg'],
};

/** A food whose diet the person's own diet allows; a food with no diet recorded is not offered. */
export function fitsDiet(food: Food, diet: Diet): boolean {
  return food.diet !== null && ALLOWED[diet].includes(food.diet);
}

/** One default portion of the food, as the planner's add-on shape, with numbers computed from the database row. */
export function addOnFor(food: Food): AddOn {
  const u = defaultUnit(food);
  const n = nutrientsFor(food, u.grams);
  return {
    key: customKey(food.name),
    label: food.name.toLowerCase(),
    food: food.name,
    unit: u.unit,
    qty: 1,
    grams: Math.round(u.grams),
    kcal: n.kcal,
    protein: n.proteinG,
    carbs: n.carbsG,
    fat: n.fatG,
  };
}

/** The add-ons for the saved names that are in the loaded database and fit the person's diet. Unknown names are skipped. */
export function customAddOns(names: string[], foods: Food[], diet: Diet): AddOn[] {
  const byName = new Map(foods.map((f) => [f.name.toLowerCase(), f]));
  const out: AddOn[] = [];
  for (const n of names) {
    const f = byName.get(n.toLowerCase());
    if (f && fitsDiet(f, diet)) out.push(addOnFor(f));
  }
  return out;
}

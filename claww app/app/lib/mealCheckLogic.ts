// One check screen for every way of logging a meal (photo, words, search, editing a logged meal). The pure parts live
// here so Vitest can test them; lib/mealCheck.ts adds the food database and the navigation.

import type { Food } from './foodLookup';
import type { ScanItem } from './engine';

export interface MealTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

/** The unit an estimated meal is counted in: one serving is the whole estimate, and it steps by half. */
export const SERVING = 'serving';

/**
 * A meal the food database does not know, as one line on the check screen. One serving (stored as 100 g) carries the
 * whole estimate, so the − and + buttons scale it like any other item. Its id is negative: it is never saved as a food.
 */
export function estimateFood(name: string, t: MealTotals): Food {
  return {
    id: -1,
    name,
    aliases: [],
    kind: 'dish',
    cuisine: null,
    diet: null,
    jainOk: false,
    kcal100g: Math.max(0, t.calories),
    protein100g: Math.max(0, t.protein_g),
    carbs100g: Math.max(0, t.carbs_g),
    fat100g: Math.max(0, t.fats_g),
    fibre100g: null,
    ironMg100g: null,
    calciumMg100g: null,
    vitcMg100g: null,
    b12Ug100g: null,
    sodiumMg100g: null,
    sugar100g: null,
    costInr100g: null,
    units: [{ unit: SERVING, grams: 100, isDefault: true }],
    reviewed: false,
  };
}

export const isEstimateFood = (food: { id: number } | null | undefined): boolean => !!food && food.id < 0;

export function estimateItem(name: string, t: MealTotals, key = 'est'): ScanItem {
  return { key, heard: name, food: estimateFood(name, t), qty: 1, unit: SERVING, grams: 100 };
}

const fmt = (q: number) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 10) / 10));

/** The name a meal built from search is saved under: "2 roti Roti" style for one food, the names for several. */
export function builtMealName(items: ScanItem[]): string {
  const shown = items.filter((i) => i.food && !i.hidden);
  if (shown.length === 0) return 'Meal';
  if (shown.length === 1) {
    const i = shown[0];
    if (isEstimateFood(i.food)) return i.food!.name;
    if (i.unit === 'g') return `${fmt(i.qty)} g ${i.food!.name}`;
    // "6 Plain dosa", not "6 dosa Plain dosa": the unit is dropped when the food's name already says it.
    const unitWord = i.unit.toLowerCase().replace(/s$/, '');
    if (i.food!.name.toLowerCase().includes(unitWord)) return `${fmt(i.qty)} ${i.food!.name}`;
    return `${fmt(i.qty)} ${i.unit} ${i.food!.name}`;
  }
  const names = shown.map((i) => i.food!.name);
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
}

/** True when the stored items explain the stored calories (within 12 %), so editing can start from the items. */
export function itemsExplain(itemKcal: number, storedKcal: number): boolean {
  if (storedKcal <= 0) return itemKcal <= 0;
  return Math.abs(itemKcal - storedKcal) / storedKcal <= 0.12;
}

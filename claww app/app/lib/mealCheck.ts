// Opens the check screen (app/scan-check.tsx) for a meal that did not come from a photo: one found by search, one
// described in words that the food database does not know, or one already logged that is being edited.

import { DEFAULT_CONTEXT, itemNutrients, type ScanContext, type ScanItem } from './engine';
import { searchFoodDb } from './foodDb';
import type { MealLogRow } from './data';
import { setScanSession } from './scanner';
import { estimateItem, itemsExplain } from './mealCheckLogic';

export type CheckSource = 'text' | 'search' | 'edit';

export function startCheck(opts: { source: CheckSource; mealType: string; dish: string; items: ScanItem[]; editing?: MealLogRow; context?: ScanContext }): void {
  setScanSession({
    photoUri: '',
    base64: '',
    mimeType: '',
    source: opts.source,
    mealType: opts.mealType,
    editing: opts.editing,
    pending: Promise.resolve({ ok: true as const, result: { route: 'ok' as const, dish: opts.dish, confidence: 1, candidates: [], items: opts.items, oilFood: null, model: opts.source } }),
    outcome: null,
    context: opts.context ?? DEFAULT_CONTEXT,
  });
}

/**
 * A logged meal as lines to edit. When its saved items are all still in the food database and add up to what was
 * saved, those are the lines; otherwise the meal is one line carrying its saved numbers, so nothing is lost or invented.
 */
export async function itemsFromMeal(meal: MealLogRow): Promise<ScanItem[]> {
  const totals = { calories: meal.calories ?? 0, protein_g: meal.protein_g ?? 0, carbs_g: meal.carbs_g ?? 0, fats_g: meal.fats_g ?? 0 };
  const saved = meal.items ?? [];
  if (saved.length > 0) {
    const lines: ScanItem[] = [];
    for (let n = 0; n < saved.length; n++) {
      const it = saved[n];
      const [food] = await searchFoodDb(it.food, 1);
      if (!food || food.name.toLowerCase() !== it.food.toLowerCase()) break;
      lines.push({ key: `e${n}`, heard: it.food, food, qty: it.qty, unit: it.unit, grams: it.grams });
    }
    if (lines.length === saved.length && itemsExplain(lines.reduce((s, i) => s + itemNutrients(i).kcal, 0), totals.calories)) return lines;
  }
  return [estimateItem(meal.description, totals)];
}

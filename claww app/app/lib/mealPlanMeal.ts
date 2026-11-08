// NG PHASE 7: turning a planned meal into what gets logged, and into the one line on its card. Pure.

import type { PlannedMeal } from './engine';

type MicroKey = 'fibreG' | 'ironMg' | 'calciumMg' | 'vitcMg' | 'b12Ug' | 'sodiumMg';

const sumOrNull = (items: PlannedMeal['items'], k: MicroKey): number | null => {
  if (items.every((i) => i[k] === null)) return null;
  return Math.round(items.reduce((s, i) => s + (i[k] ?? 0), 0) * 100) / 100;
};

/** What "Ate as planned" writes to meal_logs: the template's name, macros, items and micronutrients, all from the food database. */
export function plannedToMeal(m: PlannedMeal) {
  return {
    description: mealTitle(m),
    calories: m.kcal,
    protein_g: m.protein,
    carbs_g: m.carbs,
    fats_g: m.fat,
    planStatus: 'as_planned' as const,
    items: m.items.map((i) => ({ food: i.food, unit: i.unit, qty: i.qty, grams: i.grams })),
    nutrients: {
      fibreG: sumOrNull(m.items, 'fibreG'),
      ironMg: sumOrNull(m.items, 'ironMg'),
      calciumMg: sumOrNull(m.items, 'calciumMg'),
      vitcMg: sumOrNull(m.items, 'vitcMg'),
      b12Ug: sumOrNull(m.items, 'b12Ug'),
      sodiumMg: sumOrNull(m.items, 'sodiumMg'),
    },
  };
}

/** "3 idli, 1 katori sambar, 2 tbsp coconut chutney" for the card under the meal name. */
export function itemsText(m: PlannedMeal): string {
  return m.items.map(itemText).join(', ');
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

/** One line for one item. The unit is dropped when the food's own name already says it ("3 roti", not "3 roti roti"). */
export function itemText(i: PlannedMeal['items'][number]): string {
  const food = i.food.replace(/, .*$/, '').toLowerCase();
  const unit = String(i.unit ?? '').toLowerCase();
  const qty = num(i.qty);
  if (!unit || food.includes(unit) || (unit.endsWith('s') && food.includes(unit.slice(0, -1)))) return `${qty} ${food}`;
  if (unit === 'serving') return `${qty} ${i.qty === 1 ? 'serving' : 'servings'} of ${food}`;
  return `${qty} ${unit} ${food}`;
}

const COUNT_UNITS = new Set(['egg', 'eggs', 'roti', 'rotis', 'chapati', 'piece', 'pieces', 'idli', 'dosa', 'slice', 'slices', 'paratha', 'puri', 'piece(s)']);

/**
 * Premium N5: the template's name with its counts matching the scaled amounts. A template named "Poha with 2 boiled
 * eggs" scaled to 4 eggs reads "Poha with 4 boiled eggs", so the card title agrees with the line under it. Only
 * count-like items (egg, roti, idli...) are rewritten, and only when the name already holds a number before that food.
 */
export function mealTitle(m: Pick<PlannedMeal, 'name' | 'items'>): string {
  let name = m.name;
  for (const i of m.items) {
    const unit = String(i.unit ?? '').toLowerCase();
    if (!COUNT_UNITS.has(unit)) continue;
    const stem = i.food.replace(/, .*$/, '').toLowerCase().split(/\s+/)[0].replace(/s$/, '');
    if (stem.length < 3) continue;
    const re = new RegExp(String.raw`(\d+(?:\.\d+)?)(\s+(?:[A-Za-z]+\s+){0,2}?${stem}s?\b)`, 'i');
    if (re.test(name)) name = name.replace(re, (_all, _n, rest) => `${num(i.qty)}${rest}`);
  }
  return name;
}

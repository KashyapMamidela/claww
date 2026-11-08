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
    description: m.name,
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

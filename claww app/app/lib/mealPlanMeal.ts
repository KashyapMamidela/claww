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
  return m.items.map((i) => `${i.qty} ${i.unit} ${i.food.replace(/, .*$/, '').toLowerCase()}`).join(', ');
}

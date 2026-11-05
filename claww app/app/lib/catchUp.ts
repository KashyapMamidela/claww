// NG PHASE 10: what each catch-up answer saves, and the one-line reason shown on the re-planned dinner. Pure.
// Every number comes from the meal templates (themselves computed from the food database); nothing is typed here.

import { DIET_ALLOWED, MEAL_TEMPLATES, scaleTemplate, type MealTemplate, type PlannedMeal, type PlanDiet } from './engine';
import { plannedToMeal } from './mealPlanMeal';
import type { Slot } from './dayMoments';

export type ElseChoice = 'mess_thali' | 'biryani' | 'snacks' | 'less' | 'photo';
export type CatchAnswer = { kind: 'planned' } | { kind: 'skipped' } | { kind: 'else'; choice: ElseChoice };

export const ELSE_LABEL: Record<ElseChoice, string> = {
  mess_thali: 'Mess thali',
  biryani: 'Biryani',
  snacks: 'Snacks only',
  less: 'Same as plan, less',
  photo: 'Photo',
};

export const LESS_FACTOR = 0.6;
export const SNACK_FACTOR = 0.5;

/** The saved shape (the same one Ate as planned uses); a skipped meal has no items. */
type Planned = ReturnType<typeof plannedToMeal>;
export type SavedMeal = Omit<Planned, 'planStatus' | 'items' | 'nutrients'> & {
  planStatus: 'as_planned' | 'swapped' | 'extra' | 'skipped';
  items?: Planned['items'];
  nutrients?: Planned['nutrients'];
};

const dietOk = (t: MealTemplate, diet: PlanDiet) => DIET_ALLOWED[diet].includes(t.diet);
const forSlot = (slot: Slot, diet: PlanDiet, templates: MealTemplate[]) => templates.filter((t) => t.meal === slot && dietOk(t, diet));

/** Rule of thumb for which template stands in for a chip: by name, then the richest in protein for the user's diet. */
export function templateForChoice(choice: ElseChoice, slot: Slot, diet: PlanDiet, templates: MealTemplate[] = MEAL_TEMPLATES): MealTemplate | null {
  const pool = forSlot(slot, diet, templates);
  const byProtein = (a: MealTemplate, b: MealTemplate) => (b.protein ?? 0) - (a.protein ?? 0) || a.id.localeCompare(b.id);
  if (choice === 'mess_thali') {
    const mess = pool.filter((t) => /\bmess\b/i.test(t.name) || (t.needsSources.length > 0 && t.needsSources.includes('mess')));
    return mess.sort(byProtein)[0] ?? null;
  }
  if (choice === 'biryani') return pool.filter((t) => /biryani/i.test(t.name)).sort(byProtein)[0] ?? null;
  if (choice === 'snacks') return [...pool].sort((a, b) => a.kcal - b.kcal || a.id.localeCompare(b.id))[0] ?? null;
  return null;
}

/** The chips worth showing for a meal: only those that resolve to something the user can eat. */
export function elseChoices(slot: Slot, diet: PlanDiet, planned: PlannedMeal | null, templates: MealTemplate[] = MEAL_TEMPLATES): ElseChoice[] {
  const out: ElseChoice[] = [];
  for (const c of ['mess_thali', 'biryani', 'snacks'] as ElseChoice[]) if (templateForChoice(c, slot, diet, templates)) out.push(c);
  if (planned) out.push('less');
  out.push('photo');
  return out;
}

const SKIPPED: SavedMeal = { description: 'Skipped', calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, planStatus: 'skipped' };

/** What to save for an answer; null when it cannot be resolved (or is the photo, which the scanner saves itself). */
export function mealForAnswer(
  slot: Slot,
  answer: CatchAnswer,
  planned: PlannedMeal | null,
  diet: PlanDiet,
  templates: MealTemplate[] = MEAL_TEMPLATES
): SavedMeal | null {
  if (answer.kind === 'skipped') return SKIPPED;
  if (answer.kind === 'planned') return planned ? plannedToMeal(planned) : null;
  const status = planned ? ('swapped' as const) : ('extra' as const);
  if (answer.choice === 'photo') return null;
  if (answer.choice === 'less') {
    const t = planned ? templates.find((x) => x.id === planned.templateId) : null;
    if (!planned || !t) return null;
    const m = scaleTemplate(t, Math.max(0.25, planned.factor * LESS_FACTOR));
    return { ...plannedToMeal(m), description: `${m.name}, smaller portion`, planStatus: status };
  }
  const t = templateForChoice(answer.choice, slot, diet, templates);
  if (!t) return null;
  const m = answer.choice === 'snacks' ? scaleTemplate(t, SNACK_FACTOR) : scaleTemplate(t, 1);
  return { ...plannedToMeal(m), description: answer.choice === 'snacks' ? `Snacks only, like ${m.name}` : m.name, planStatus: status };
}

export interface AnsweredMeal {
  slot: Slot;
  kind: CatchAnswer['kind'];
  choice?: ElseChoice;
  kcal: number;
  plannedKcal: number | null;
}

/**
 * The handwritten reason under the re-planned dinner, from the numbers: what ran heavy, what ran light, what was skipped.
 * About 40 characters or fewer. null when nothing changed enough to say anything.
 */
export function dinnerReason(answers: AnsweredMeal[]): string | null {
  const skipped = answers.filter((a) => a.kind === 'skipped');
  const heavy = answers.filter((a) => a.kind !== 'skipped' && a.plannedKcal !== null && a.kcal > a.plannedKcal * 1.15);
  const light = answers.filter((a) => a.kind !== 'skipped' && a.plannedKcal !== null && a.kcal < a.plannedKcal * 0.7);
  const name = (a: AnsweredMeal) => (a.choice && a.choice !== 'less' && a.choice !== 'photo' ? ELSE_LABEL[a.choice].toLowerCase() : a.slot);
  if (heavy.length > 0) return `${name(heavy[0])} was heavy, dinner is lighter`;
  if (skipped.length > 0) return `${skipped[0].slot} was skipped, dinner covers more`;
  if (light.length > 0) return `${light[0].slot} was light, dinner makes it up`;
  return null;
}

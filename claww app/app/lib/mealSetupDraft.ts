// NG PHASE 6: the answers of the three-step meal setup, kept in memory between the steps so Back and Change
// never lose anything. Nothing is saved until the last step. Pure module state; tests reset it.

import type { FoodGoal } from './mealPlanReset';
import { defaultAvailability, defaultBudget, mergeEdits, type AvailabilityMap, type Cook, type Diet, type FoodKey, type Source } from './resourceDefaults';

export interface MealSetupDraft {
  sources: Source[];
  cookWith: Cook[];
  diet: Diet | null;
  /** Foods the user set by hand in step 2; they win over the defaults whenever step 1 changes. */
  edits: Partial<AvailabilityMap>;
  /** null until the user taps the budget; then it replaces the default. */
  budget: number | null;
  planStyle: 'same' | 'varied';
  /** Height, weight and age typed in step 1 when the profile did not have them. */
  basics?: { height: number; weight: number; age: number };
  /** "Start my meal plan over": a blank setup that also works out new targets from today's numbers. */
  fresh?: boolean;
  /** The goal for food, asked only when starting over. */
  foodGoal?: FoodGoal;
}

export const emptyDraft = (): MealSetupDraft => ({ sources: [], cookWith: [], diet: null, edits: {}, budget: null, planStyle: 'same' });

let draft: MealSetupDraft = emptyDraft();

export const getDraft = (): MealSetupDraft => draft;
export const resetDraft = (next: MealSetupDraft = emptyDraft()): void => {
  draft = next;
};
export const patchDraft = (patch: Partial<MealSetupDraft>): MealSetupDraft => {
  draft = { ...draft, ...patch };
  return draft;
};

export function draftAvailability(d: MealSetupDraft): AvailabilityMap {
  return mergeEdits(defaultAvailability(d.sources, d.cookWith, d.diet), d.edits);
}

export function draftBudget(d: MealSetupDraft): number {
  return d.budget ?? defaultBudget(d.sources);
}

export function setFood(d: MealSetupDraft, key: FoodKey, value: AvailabilityMap[FoodKey]): MealSetupDraft {
  return { ...d, edits: { ...d.edits, [key]: value } };
}

/** Step 1 is complete when something is chosen for each of the three questions. */
export function step1Complete(d: MealSetupDraft): boolean {
  return d.sources.length > 0 && d.cookWith.length > 0 && d.diet !== null;
}

/** Toggle a value in a list; choosing "none" clears the other cooking options and any other choice clears "none". */
export function toggleCook(list: Cook[], value: Cook): Cook[] {
  if (value === 'none') return list.includes('none') ? [] : ['none'];
  const without = list.filter((c) => c !== 'none');
  return without.includes(value) ? without.filter((c) => c !== value) : [...without, value];
}

export function toggleSource(list: Source[], value: Source): Source[] {
  return list.includes(value) ? list.filter((s) => s !== value) : [...list, value];
}

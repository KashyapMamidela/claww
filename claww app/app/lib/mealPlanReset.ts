// "Start my meal plan over": the meal setup run from a blank page, with new calorie and protein targets worked out
// from today's weight and the goal picked for food. Pure, so the targets and the before/after line are tested.

import { computeNutritionSample, type ActivityLevel, type Goal, type NutritionDefaults } from './nutrition';

export type FoodGoal = 'lose' | 'maintain' | 'gain';

export const FOOD_GOALS: { value: FoodGoal; label: string }[] = [
  { value: 'lose', label: 'Lose fat' },
  { value: 'maintain', label: 'Stay the same' },
  { value: 'gain', label: 'Build muscle' },
];

/** The food goal to start from: the one saved last time, else read from the training goal. */
export function foodGoalFrom(profileGoal: string | null | undefined, saved?: string | null): FoodGoal {
  if (saved === 'lose' || saved === 'maintain' || saved === 'gain') return saved;
  if (profileGoal === 'fat_loss') return 'lose';
  if (profileGoal === 'muscle_gain') return 'gain';
  return 'maintain';
}

const FORMULA_GOAL: Record<FoodGoal, Goal> = { lose: 'fat_loss', maintain: 'maintenance', gain: 'muscle_gain' };

/** New targets from scratch, or null when height, weight or age is missing (the setup asks for them first). */
export function freshTargets(i: {
  height: number;
  weight: number;
  age: number;
  gender: string | null;
  activityLevel?: ActivityLevel | null;
  foodGoal: FoodGoal;
}): NutritionDefaults | null {
  if (!(i.height > 0 && i.weight > 0 && i.age > 0)) return null;
  return computeNutritionSample({
    height: i.height,
    weight: i.weight,
    age: i.age,
    gender: i.gender,
    goal: FORMULA_GOAL[i.foodGoal],
    activityLevel: i.activityLevel ?? 'moderate',
  });
}

/** "2,150 kcal, was 2,400" style parts for the summary, so the change is visible before it's saved. */
export function targetsChange(next: NutritionDefaults, old: NutritionDefaults | null): { kcal: string; protein: string } {
  const k = next.calories.toLocaleString('en-IN');
  const kcal = old && old.calories !== next.calories ? `${k} kcal, was ${old.calories.toLocaleString('en-IN')}` : `${k} kcal`;
  const protein = old && old.protein_g !== next.protein_g ? `${next.protein_g} g protein, was ${old.protein_g}` : `${next.protein_g} g protein`;
  return { kcal, protein };
}

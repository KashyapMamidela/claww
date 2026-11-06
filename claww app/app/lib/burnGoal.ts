// Polish step 4: the Burned ring's goal. The active energy a day should add on top of resting energy, taken from how the
// calorie goal was set: round10(BMR x (activity multiplier - 1.2)), never below 250. The user can change it (it is then
// stored as personalization_profile.burnedGoal and wins). Pure.

import { ACTIVITY_MULTIPLIER, bmrFor, type ActivityLevel } from './nutrition';

export const BURN_GOAL_FLOOR = 250;
export const BURN_GOAL_STEP = 50;
export const BURN_GOAL_MAX = 3000;

const round10 = (n: number) => Math.round(n / 10) * 10;

export function defaultBurnedGoal(bmr: number, activityMultiplier: number): number {
  return Math.max(BURN_GOAL_FLOOR, round10(bmr * (activityMultiplier - 1.2)));
}

export interface BurnGoalInput {
  /** personalization_profile.burnedGoal, when the user has set one. */
  stored: number | null | undefined;
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: ActivityLevel | null | undefined;
}

/** The goal to draw, or null while height, weight and age are not known (and no stored goal exists). */
export function burnedGoal(i: BurnGoalInput): number | null {
  if (typeof i.stored === 'number' && i.stored >= BURN_GOAL_FLOOR) return Math.min(BURN_GOAL_MAX, Math.round(i.stored));
  if (!(i.height && i.height > 0) || !(i.weight && i.weight > 0) || !(i.age && i.age > 0)) return null;
  const multiplier = ACTIVITY_MULTIPLIER[i.activityLevel ?? 'moderate'];
  return defaultBurnedGoal(bmrFor({ height: i.height, weight: i.weight, age: i.age, gender: i.gender }), multiplier);
}

/** Percentage of the Burned goal reached (can pass 100 for the ring's overflow arc); 0 with no data. */
export function burnedPct(kcal: number | null, goal: number | null): number {
  if (kcal === null || goal === null || !(goal > 0)) return 0;
  return Math.max(0, (kcal / goal) * 100);
}

/** The next stored value when the user steps the goal up or down. */
export function stepBurnedGoal(current: number, direction: 1 | -1): number {
  return Math.min(BURN_GOAL_MAX, Math.max(BURN_GOAL_FLOOR, current + direction * BURN_GOAL_STEP));
}

// Re-exports for the diary screen, plus the small helpers it needs (sex from the profile's free text).
export { MICRO_LABELS, microTargets, rateMeal, sodiumOver, sumMicros } from './nutritionLogic';
export type { MicroKey } from './nutritionLogic';
export { nextMealFor } from './homeMoment';

import type { Sex } from './nutritionLogic';

/** profiles.gender is free text ("male", "female", "other", "Prefer not to say"); only two values change a target. */
export function normaliseSex(gender: string | null | undefined): Sex {
  const g = (gender ?? '').trim().toLowerCase();
  return g === 'male' || g === 'm' ? 'male' : g === 'female' || g === 'f' ? 'female' : null;
}

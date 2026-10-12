export const CUISINE_OPTIONS = [
  { value: 'south_indian', label: 'South Indian' },
  { value: 'north_indian', label: 'North Indian' },
  { value: 'andhra_telangana', label: 'Andhra / Telangana' },
  { value: 'continental', label: 'Continental' },
  { value: 'chinese', label: 'Chinese / Indo-Chinese' },
  { value: 'anything', label: 'Anything' },
] as const;

export type Cuisine = (typeof CUISINE_OPTIONS)[number]['value'];

/** Cuisines and foods to avoid, saved in personalization_profile.foodProfile (V2 PHASE 5.1). `askedAt` is set once the user answers or dismisses the inline ask. */
export interface FoodProfile {
  cuisines: Cuisine[];
  avoid: string;
  askedAt?: string;
}

export const AVOID_MAX_LENGTH = 120;

const CUISINE_VALUES = new Set<string>(CUISINE_OPTIONS.map((c) => c.value));

/** Tolerant read of whatever is stored: unknown cuisines are dropped, "anything" is exclusive, avoid is trimmed and capped. */
export function normalizeFoodProfile(raw: unknown): FoodProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<FoodProfile>;
  let cuisines = Array.isArray(r.cuisines) ? (r.cuisines.filter((c) => CUISINE_VALUES.has(c)) as Cuisine[]) : [];
  if (cuisines.includes('anything')) cuisines = ['anything'];
  const avoid = typeof r.avoid === 'string' ? r.avoid.trim().slice(0, AVOID_MAX_LENGTH) : '';
  return { cuisines: Array.from(new Set(cuisines)), avoid, askedAt: typeof r.askedAt === 'string' ? r.askedAt : undefined };
}

/** Whether the inline ask on the Nutrition tab should still show. */
export function shouldAskFoodProfile(hasTargets: boolean, profile: FoodProfile): boolean {
  return hasTargets && !profile.askedAt;
}

/** Cuisine labels for display and prompts; empty or "anything" means no preference. */
export function cuisineLabels(profile: FoodProfile): string[] {
  if (profile.cuisines.includes('anything')) return [];
  return profile.cuisines.map((c) => CUISINE_OPTIONS.find((o) => o.value === c)!.label);
}

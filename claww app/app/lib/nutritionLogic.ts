// NG PHASE 8: the pure rules behind the Nutrition tab and the food diary: usuals, meal ratings, daily micronutrient
// targets and the day's one-line summary. No model, no I/O.

// ─── Usuals: what you eat most, one tap ──────────────────────────────────────────────────────────────────────

export interface LoggedMeal {
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  meal_type: string | null;
  logged_at: string;
}

export interface Usual {
  key: string;
  label: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  count: number;
  mealType: string | null;
}

export const USUALS_DAYS = 14;
export const USUALS_MAX = 4;
export const USUALS_MIN_COUNT = 2;

export const normaliseMeal = (text: string): string => text.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** The foods eaten at least twice in the last 14 days, most frequent first (ties: most recent), at most four. */
export function usualsFrom(meals: LoggedMeal[], now: Date = new Date()): Usual[] {
  const since = now.getTime() - USUALS_DAYS * 86_400_000;
  const groups = new Map<string, LoggedMeal[]>();
  for (const m of meals) {
    if (new Date(m.logged_at).getTime() < since) continue;
    const key = normaliseMeal(m.description);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const out: (Usual & { latest: number })[] = [];
  for (const [key, rows] of groups) {
    if (rows.length < USUALS_MIN_COUNT) continue;
    const latest = [...rows].sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
    const types = new Map<string, number>();
    for (const r of rows) if (r.meal_type) types.set(r.meal_type, (types.get(r.meal_type) ?? 0) + 1);
    const mealType = [...types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    out.push({
      key,
      label: latest.description.trim(),
      kcal: Math.round(latest.calories ?? 0),
      protein: Math.round(latest.protein_g ?? 0),
      carbs: Math.round(latest.carbs_g ?? 0),
      fats: Math.round(latest.fats_g ?? 0),
      count: rows.length,
      mealType,
      latest: new Date(latest.logged_at).getTime(),
    });
  }
  return out
    .sort((a, b) => b.count - a.count || b.latest - a.latest)
    .slice(0, USUALS_MAX)
    .map(({ latest: _latest, ...u }) => u);
}

// ─── Micronutrient targets by age and sex ────────────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female' | null;

export interface MicroTargets {
  fibreG: number;
  ironMg: number;
  calciumMg: number;
  vitcMg: number;
  b12Ug: number;
  /** A limit, not a goal: over it is amber. */
  sodiumMg: number;
}

/**
 * Daily targets from the US NIH Dietary Reference Intakes (RDA and Adequate Intake; sodium is the 2,300 mg limit),
 * rounded. Used because they are public and stated by age and sex; the nutritionist should replace them with the
 * ICMR-NIN values for Indian adults (open item in docs/food-review.md). Unknown age or sex uses the adult mid-point.
 */
export function microTargets(age: number | null, sex: Sex): MicroTargets {
  const a = age ?? 30;
  const male = sex === 'male';
  const female = sex === 'female';
  const older = a >= 51;
  const fibreG = male ? (older ? 30 : 38) : female ? (older ? 21 : 25) : older ? 26 : 32;
  const ironMg = male ? 8 : female ? (older ? 8 : 18) : older ? 8 : 13;
  const calciumMg = male ? (a >= 71 ? 1200 : 1000) : female ? (older ? 1200 : 1000) : older ? 1200 : 1000;
  const vitcMg = male ? 90 : female ? 75 : 83;
  return { fibreG, ironMg, calciumMg, vitcMg, b12Ug: 2.4, sodiumMg: 2300 };
}

export type MicroKey = 'fibreG' | 'ironMg' | 'calciumMg' | 'vitcMg' | 'b12Ug' | 'sodiumMg';
export type MicroTotals = Record<MicroKey, number>;

export interface MealMicros {
  fibreG?: number | null;
  ironMg?: number | null;
  calciumMg?: number | null;
  vitcMg?: number | null;
  b12Ug?: number | null;
  sodiumMg?: number | null;
}

/** Adds up the micronutrients of the entries that have them; says how many did, so the card never claims more than it knows. */
export function sumMicros(entries: (MealMicros | null | undefined)[]): { totals: MicroTotals; counted: number; total: number } {
  const totals: MicroTotals = { fibreG: 0, ironMg: 0, calciumMg: 0, vitcMg: 0, b12Ug: 0, sodiumMg: 0 };
  let counted = 0;
  for (const e of entries) {
    if (!e) continue;
    const has = (Object.keys(totals) as MicroKey[]).some((k) => typeof e[k] === 'number');
    if (!has) continue;
    counted += 1;
    for (const k of Object.keys(totals) as MicroKey[]) totals[k] += e[k] ?? 0;
  }
  return { totals, counted, total: entries.length };
}

export const MICRO_LABELS: { key: MicroKey; label: string; unit: string }[] = [
  { key: 'fibreG', label: 'Fibre', unit: 'g' },
  { key: 'ironMg', label: 'Iron', unit: 'mg' },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg' },
  { key: 'vitcMg', label: 'Vitamin C', unit: 'mg' },
  { key: 'b12Ug', label: 'B12', unit: 'µg' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
];

export function sodiumOver(totalMg: number, limitMg: number): boolean {
  return totalMg > limitMg;
}

// ─── Meal rating ─────────────────────────────────────────────────────────────────────────────────────────────

export type Rating = 'good' | 'okay' | 'poor';

export interface RatedMeal {
  kcal: number;
  protein: number;
  fats: number;
  sodiumMg?: number | null;
  mealType: string | null;
}

export interface DayNeeds {
  kcalTarget: number;
  proteinTarget: number;
  /** Eaten before this meal today. */
  kcalBefore: number;
  proteinBefore: number;
  /** The next meal's name, to point the reason at ("Dinner adds eggs"), or null at the end of the day. */
  nextMeal: string | null;
}

export interface MealRatingResult {
  rating: Rating;
  reason: string;
}

/** What share of the day a meal type is expected to carry. Snacks and unknown types count as a tenth. */
export const MEAL_SHARE: Record<string, { kcal: number; protein: number }> = {
  breakfast: { kcal: 0.27, protein: 0.25 },
  lunch: { kcal: 0.35, protein: 0.33 },
  dinner: { kcal: 0.3, protein: 0.32 },
  snack: { kcal: 0.1, protein: 0.1 },
};

const share = (type: string | null) => MEAL_SHARE[(type ?? 'snack').toLowerCase()] ?? MEAL_SHARE.snack;

/**
 * Compares a meal with what the plan needed at that moment: protein against the meal's share of the day's protein,
 * calories against its share of what was left, and oil or sodium only when clearly high. Good / Okay / Poor, with one
 * kind reason that points at the next meal. Deterministic, never a model.
 */
export function rateMeal(meal: RatedMeal, needs: DayNeeds): MealRatingResult {
  const s = share(meal.mealType);
  const wantProtein = Math.max(1, needs.proteinTarget * s.protein);
  const wantKcal = Math.max(1, Math.min(needs.kcalTarget * s.kcal, Math.max(0, needs.kcalTarget - needs.kcalBefore) || needs.kcalTarget * s.kcal));
  const proteinFit = meal.protein / wantProtein;
  const kcalFit = meal.kcal / wantKcal;
  const fatShare = meal.kcal > 0 ? (meal.fats * 9) / meal.kcal : 0;
  const oily = fatShare >= 0.45 && meal.kcal >= 250;
  const salty = (meal.sodiumMg ?? 0) >= 1500;
  const short = Math.max(0, Math.round(wantProtein - meal.protein));
  const next = needs.nextMeal ? `${needs.nextMeal} adds` : 'add';
  const fix = needs.nextMeal ? `${needs.nextMeal} can close it.` : 'Tomorrow can close it.';

  // A snack only has to carry a little protein; a main meal has to carry its share.
  const isSnack = (meal.mealType ?? 'snack').toLowerCase() === 'snack';
  const goodProtein = isSnack ? 0.6 : 0.8;
  let rating: Rating;
  if (proteinFit >= goodProtein && kcalFit <= 1.3 && kcalFit >= 0.5 && !oily) rating = 'good';
  else if (proteinFit < 0.35 && (oily || kcalFit > 0.9)) rating = 'poor';
  else if (oily && proteinFit < 0.8 && kcalFit > 1.2) rating = 'poor';
  else if (proteinFit >= 0.55 && kcalFit <= 1.5) rating = 'okay';
  else rating = proteinFit < 0.35 ? 'poor' : 'okay';
  if (salty && rating === 'good') rating = 'okay';

  let reason: string;
  if (rating === 'good') {
    reason = proteinFit >= 1.1 ? 'Strong protein for this point in the day.' : 'Protein and calories fit this part of your day.';
  } else if (rating === 'okay') {
    if (salty) reason = 'Fine, a little salty. Water and a lighter next meal balance it.';
    else if (proteinFit < goodProtein) reason = `Good energy, ${short} g short on protein. ${needs.nextMeal ? `${next} some protein.` : fix}`;
    else reason = kcalFit > 1.3 ? `Bigger than planned, but the protein is fine. ${needs.nextMeal ? `${needs.nextMeal} can be lighter.` : 'Nothing to fix.'}` : 'Close to what the day needed.';
  } else {
    reason = oily
      ? `Lots of oil, little protein. Totally fine once in a while; ${needs.nextMeal ? `${needs.nextMeal.toLowerCase()} balances it.` : 'tomorrow balances it.'}`
      : `Little protein for the calories. ${needs.nextMeal ? `${needs.nextMeal} can make up for it.` : 'Make it up tomorrow.'}`;
  }
  return { rating, reason };
}

export const RATING_LABEL: Record<Rating, string> = { good: 'Good', okay: 'Okay', poor: 'Poor' };

// ─── The day's line ──────────────────────────────────────────────────────────────────────────────────────────

const MAIN = ['breakfast', 'lunch', 'dinner'];

export function mealsLoggedCount(types: string[]): number {
  return new Set(types.map((t) => t.toLowerCase()).filter((t) => MAIN.includes(t))).size;
}

/** "3 of 3 meals logged · protein 82 %" */
export function dayLine(mealTypes: string[], proteinG: number, proteinTarget: number | null): string {
  const meals = `${mealsLoggedCount(mealTypes)} of 3 meals logged`;
  if (!proteinTarget || proteinTarget <= 0) return meals;
  return `${meals} · protein ${Math.round((proteinG / proteinTarget) * 100)} %`;
}

/** The pen note under the macro card: "36 g protein to go, dinner closes it". */
export function proteinGapNote(proteinG: number, proteinTarget: number | null, nextMeal: string | null): string | null {
  if (!proteinTarget) return null;
  const left = Math.round(proteinTarget - proteinG);
  if (left <= 0) return 'protein target met';
  if (left < 10) return null;
  return nextMeal ? `${left} g protein to go, ${nextMeal.toLowerCase()} closes it` : `${left} g protein short today`;
}

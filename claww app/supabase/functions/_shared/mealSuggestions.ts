// Pure helpers for suggest-meal (V2 PHASE 5.2) — dependency-free so a plain
// test runner can exercise them. The model only names meals and estimates
// their macros; everything here (restriction/avoid checks, clamping, ranking,
// the "why it fits" line) is deterministic code working from the numbers.

export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';
export type Refine = 'more_protein' | 'quicker' | 'something_else';

export interface RawOption {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  prep_minutes: number;
}

export interface Remaining {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface RankedOption extends RawOption {
  why: string;
  bestFit: boolean;
}

// Words that signal a conflict. Deliberately broad: a false positive just
// drops one option, a false negative serves a meal the user can't eat.
const MEAT = ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'bacon', 'ham', 'sausage', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp', 'crab', 'lobster', 'squid', 'turkey', 'meat', 'keema', 'biryani'];
const DAIRY = ['milk', 'paneer', 'cheese', 'curd', 'yogurt', 'yoghurt', 'dahi', 'butter', 'ghee', 'cream', 'whey', 'lassi', 'raita', 'khoa', 'khoya'];
const EGG = ['egg', 'omelette', 'omelet'];
const GLUTEN = ['wheat', 'roti', 'chapati', 'chapatti', 'paratha', 'naan', 'bread', 'toast', 'pasta', 'noodles', 'oats', 'sandwich', 'burger', 'wrap', 'semolina', 'rava', 'suji', 'upma', 'barley', 'couscous', 'cereal', 'pizza'];
const NUTS = ['nut', 'almond', 'cashew', 'pistachio', 'walnut', 'pecan', 'hazelnut', 'peanut'];
const SHELLFISH = ['prawn', 'shrimp', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop', 'squid'];
const PORK = ['pork', 'bacon', 'ham', 'sausage', 'lard'];

const RESTRICTION_WORDS: Record<string, string[]> = {
  vegetarian: MEAT,
  vegan: [...MEAT, ...DAIRY, ...EGG, 'honey'],
  gluten_free: GLUTEN,
  dairy_free: DAIRY,
  nut_allergy: NUTS,
  shellfish_allergy: SHELLFISH,
  halal: PORK,
  kosher: [...PORK, ...SHELLFISH],
};

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

/** True when a word in the description matches (or starts with) a forbidden word. */
function hitsAny(description: string, forbidden: string[]): boolean {
  const ws = words(description);
  return ws.some((w) => forbidden.some((f) => w === f || w === `${f}s` || w === `${f}es` || (f.length >= 4 && w.startsWith(f))));
}

export function violatesRestrictions(description: string, restrictions: string[]): boolean {
  return restrictions.some((r) => hitsAny(description, RESTRICTION_WORDS[r] ?? []));
}

/** "Foods to avoid" is free text such as "mushrooms, brinjal"; split it into terms and check each. */
export function violatesAvoid(description: string, avoid: string): boolean {
  const terms = avoid
    .toLowerCase()
    .split(/[,;\n]| and /)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  if (terms.length === 0) return false;
  const text = description.toLowerCase();
  return terms.some((t) => text.includes(t) || text.includes(t.replace(/(es|s)$/, '')));
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export function clampOption(o: RawOption): RawOption {
  return {
    description: o.description.trim().slice(0, 120),
    calories: Math.round(clamp(o.calories, 0, 2000)),
    protein_g: Math.round(clamp(o.protein_g, 0, 150)),
    carbs_g: Math.round(clamp(o.carbs_g, 0, 300)),
    fats_g: Math.round(clamp(o.fats_g, 0, 150)),
    prep_minutes: Math.round(clamp(o.prep_minutes, 0, 120)),
  };
}

// How much of what's left in the day one meal is expected to take.
const SHARE_OF_REMAINING: Record<MealType, number> = { Breakfast: 0.3, Lunch: 0.4, Snack: 0.2, Dinner: 0.6 };

/** Lower is a better fit. Weighted relative distance from the meal's share of what's left, plus a penalty for blowing the calorie budget. */
export function fitScore(o: RawOption, remaining: Remaining, mealType: MealType, refine?: Refine): number {
  const share = SHARE_OF_REMAINING[mealType];
  const dist = (actual: number, left: number) => Math.abs(actual - left * share) / Math.max(left * share, 20);
  const proteinWeight = refine === 'more_protein' ? 0.55 : 0.3;
  const rest = (1 - proteinWeight) / 0.7;
  let score =
    dist(o.calories, remaining.calories) * 0.4 * rest +
    dist(o.protein_g, remaining.protein_g) * proteinWeight +
    dist(o.carbs_g, remaining.carbs_g) * 0.15 * rest +
    dist(o.fats_g, remaining.fats_g) * 0.15 * rest;
  if (o.calories > remaining.calories) score += 1;
  if (refine === 'quicker') score += o.prep_minutes / 60;
  return score;
}

/** The one-line reason, written from the numbers only. */
export function whyItFits(o: RawOption, remaining: Remaining): string {
  const left = Math.max(0, Math.round(remaining.calories));
  const proteinLeft = Math.max(0, Math.round(remaining.protein_g));
  if (o.calories > remaining.calories) return `${o.calories} kcal runs ${Math.round(o.calories - remaining.calories)} over what is left today (${left}).`;
  if (proteinLeft > 0 && o.protein_g >= proteinLeft * 0.3) return `${o.protein_g} g protein covers ${Math.min(100, Math.round((o.protein_g / proteinLeft) * 100))}% of the ${proteinLeft} g you have left.`;
  return `${o.calories} kcal leaves ${left - o.calories} of your ${left} kcal for the rest of the day.`;
}

/**
 * Drops options that break a hard restriction or the avoid list, clamps the
 * numbers, removes repeats of what was already eaten or listed, ranks by fit
 * and returns the best `limit` with the top one flagged. [] means nothing
 * usable survived and the caller should fall back.
 */
export function rankOptions(
  raw: RawOption[],
  ctx: { mealType: MealType; restrictions: string[]; avoid: string; eatenToday: string[]; remaining: Remaining; refine?: Refine },
  limit = 3
): RankedOption[] {
  const eaten = new Set(ctx.eatenToday.map((e) => e.trim().toLowerCase()));
  const seen = new Set<string>();
  const kept: RawOption[] = [];
  for (const r of raw) {
    const o = clampOption(r);
    const key = o.description.toLowerCase();
    if (!o.description || seen.has(key) || eaten.has(key)) continue;
    if (violatesRestrictions(o.description, ctx.restrictions) || violatesAvoid(o.description, ctx.avoid)) continue;
    seen.add(key);
    kept.push(o);
  }
  return kept
    .map((o) => ({ o, s: fitScore(o, ctx.remaining, ctx.mealType, ctx.refine) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map(({ o }, i) => ({ ...o, why: whyItFits(o, ctx.remaining), bestFit: i === 0 }));
}

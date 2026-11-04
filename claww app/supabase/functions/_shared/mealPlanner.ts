// NG PHASE 7: the meal planner. Picks one reviewed template per meal that fits what the user can get, scales the
// portions in household steps to the day's calories and protein, and says plainly when it cannot (with the cheapest
// fix from foods they can get). Rules and arithmetic only: no model, same inputs give the same plan.
// Dependency-free (type imports only) so Vitest, the Edge Functions and the app run this one file.

import type { AddOn, Availability, MealName, MealTemplate, TemplateItem } from './mealTypes.ts';

export type { MealName } from './mealTypes.ts';

export type Diet = 'veg' | 'egg' | 'nonveg' | 'vegan' | 'jain';

export interface Resources {
  sources: string[];
  cookWith: string[];
  diet: Diet;
  /** "Can you get these?" by row key: eggs, chicken, dal, soya, curd, milk, peanuts, banana, sprouts, oats, whey, paneer. */
  availability: Record<string, Availability | undefined>;
  /** Foods to avoid, lower case words (from the food profile). */
  avoid: string[];
  style: 'same' | 'varied';
}

export interface DayTarget {
  kcal: number;
  protein: number;
}

export interface HistoryDay {
  /** YYYY-MM-DD */
  date: string;
  meals: { meal: MealName; templateId: string; uses: string[] }[];
}

export interface PlanInput {
  target: DayTarget;
  resources: Resources;
  /** YYYY-MM-DD of the day being planned. */
  date: string;
  /** Stable per user, for deterministic tie-breaks. */
  seed: string;
  history: HistoryDay[];
  /** Meals to plan; defaults to all three. A re-plan passes only what is left, with the remaining target. */
  meals?: MealName[];
  templates: MealTemplate[];
  addOns: AddOn[];
}

export interface PlannedItem extends TemplateItem {}

export interface PlannedMeal {
  meal: MealName;
  templateId: string;
  name: string;
  /** The factor the template was scaled by (1 = as written). */
  factor: number;
  items: PlannedItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  uses: string[];
  costInr: number | null;
}

export interface Shortfall {
  /** Calories below the day's target (positive when short), grams of protein short. */
  kcalGap: number;
  proteinGapG: number;
  fix: { key: string; label: string; qty: number; unit: string; proteinG: number; kcal: number; text: string } | null;
}

export interface DayPlan {
  date: string;
  meals: PlannedMeal[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  /** True when calories are within 7 % and protein is at least 90 % of the target. */
  ok: boolean;
  shortfall: Shortfall | null;
  /** Plain notes such as "no template fit your kitchen, so the nearest was used". */
  notes: string[];
}

export const KCAL_TOLERANCE = 0.07;
export const PROTEIN_MIN = 0.9;
export const SOMETIMES_MAX_DAYS_PER_WEEK = 3;
export const FACTORS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MEALS: MealName[] = ['breakfast', 'lunch', 'dinner'];
const KCAL_SHARE: Record<MealName, number> = { breakfast: 0.28, lunch: 0.37, dinner: 0.35 };
const PROTEIN_SHARE: Record<MealName, number> = { breakfast: 0.27, lunch: 0.36, dinner: 0.37 };

/** Smallest portion step per unit: half a katori, one roti, one egg. */
const STEPS: Record<string, number> = { katori: 0.5, plate: 0.5, glass: 0.5, tbsp: 1, tsp: 1, handful: 1, cup: 1 };
export const stepFor = (unit: string): number => STEPS[unit] ?? 1;

const round1 = (v: number) => Math.round(v * 10) / 10;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A template with every item's quantity scaled by `factor` and rounded to a valid household step. */
export function scaleTemplate(t: MealTemplate, factor: number): PlannedMeal {
  const items: PlannedItem[] = t.items.map((i) => {
    const step = stepFor(i.unit);
    const qty = factor === 1 ? i.qty : Math.max(step, Math.round((i.qty * factor) / step) * step);
    const r = qty / i.qty;
    const s = (v: number | null, d = 1) => (v === null ? null : Math.round(v * r * 10 ** d) / 10 ** d);
    return {
      ...i,
      qty,
      grams: Math.round(i.grams * r),
      kcal: s(i.kcal, 0),
      protein: s(i.protein),
      carbs: s(i.carbs),
      fat: s(i.fat),
      fibreG: s(i.fibreG),
      ironMg: s(i.ironMg, 2),
      calciumMg: s(i.calciumMg, 0),
      vitcMg: s(i.vitcMg),
      b12Ug: s(i.b12Ug, 2),
      sodiumMg: s(i.sodiumMg, 0),
    };
  });
  const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => items.reduce((a, i) => a + (i[k] ?? 0), 0);
  return {
    meal: t.meal,
    templateId: t.id,
    name: t.name,
    factor,
    items,
    kcal: Math.round(sum('kcal')),
    protein: round1(sum('protein')),
    carbs: round1(sum('carbs')),
    fat: round1(sum('fat')),
    uses: t.uses,
    costInr: t.costInr === null ? null : Math.round(t.costInr * factor),
  };
}

// ─── Eligibility ───────────────────────────────────────────────────────────────────────────────────────────

const DIET_ALLOWED: Record<Diet, MealTemplate['diet'][]> = {
  vegan: ['vegan'],
  veg: ['vegan', 'veg'],
  jain: ['vegan', 'veg'],
  egg: ['vegan', 'veg', 'egg'],
  nonveg: ['vegan', 'veg', 'egg', 'nonveg'],
};

function sometimesDays(history: HistoryDay[], date: string, tag: string): number {
  const to = new Date(`${date}T00:00:00`).getTime();
  return history.filter((h) => {
    const t = new Date(`${h.date}T00:00:00`).getTime();
    return t < to && to - t <= 6 * 86_400_000 && h.meals.some((m) => m.uses.includes(tag));
  }).length;
}

export function isEligible(t: MealTemplate, r: Resources, history: HistoryDay[], date: string, relax: 0 | 1 | 2 = 0): boolean {
  if (!DIET_ALLOWED[r.diet].includes(t.diet)) return false;
  if (r.diet === 'jain' && !t.jainOk) return false;
  if (r.avoid.length > 0) {
    const hay = [t.name, ...t.items.map((i) => i.food)].join(' ').toLowerCase();
    if (r.avoid.some((a) => a && hay.includes(a))) return false;
  }
  for (const tag of t.uses) {
    const a = r.availability[tag];
    if (a === 'no') return false;
    if (a === 'sometimes' && sometimesDays(history, date, tag) >= SOMETIMES_MAX_DAYS_PER_WEEK) return false;
  }
  if (relax < 2 && t.needsSources.length > 0 && !t.needsSources.some((s) => r.sources.includes(s))) return false;
  if (relax < 1 && t.needsCook.length > 0 && !t.needsCook.some((c) => r.cookWith.includes(c))) return false;
  return true;
}

// ─── Choosing ──────────────────────────────────────────────────────────────────────────────────────────────

interface Option {
  t: MealTemplate;
  m: PlannedMeal;
  /** Individual fit to the meal's own share, lower is better. */
  score: number;
}

function optionsFor(meal: MealName, input: PlanInput, tk: number, tp: number, notes: string[]): Option[] {
  const { resources: r, history, date, seed } = input;
  const pool = input.templates.filter((t) => t.meal === meal);
  let relax: 0 | 1 | 2 = 0;
  let eligible = pool.filter((t) => isEligible(t, r, history, date, 0));
  if (eligible.length === 0) {
    relax = 1;
    eligible = pool.filter((t) => isEligible(t, r, history, date, 1));
    if (eligible.length > 0) notes.push(`No ${meal} fit your cooking set-up, so one that needs more cooking was used.`);
  }
  if (eligible.length === 0) {
    relax = 2;
    eligible = pool.filter((t) => isEligible(t, r, history, date, 2));
    if (eligible.length > 0) notes.push(`No ${meal} matched where your food comes from, so the nearest was used.`);
  }

  const yesterday = history.filter((h) => h.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const yesterdayId = yesterday?.meals.find((m) => m.meal === meal)?.templateId;
  const last3 = new Set(history.filter((h) => h.date < date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).flatMap((h) => h.meals.filter((m) => m.meal === meal).map((m) => m.templateId)));
  if (r.style === 'same' && yesterdayId && eligible.some((t) => t.id === yesterdayId)) eligible = eligible.filter((t) => t.id === yesterdayId);

  const out: Option[] = [];
  for (const t of eligible) {
    const sometimes = t.uses.filter((u) => r.availability[u] === 'sometimes').length;
    for (const f of FACTORS) {
      const m = scaleTemplate(t, f);
      const ek = Math.abs(m.kcal - tk) / tk;
      const ep = (Math.max(0, tp - m.protein) / tp) * 1.5 + (Math.max(0, m.protein - tp) / tp) * 0.2;
      const variety = r.style === 'varied' && last3.has(t.id) ? 0.5 : 0;
      const score = ek + ep + sometimes * 0.05 + variety + Math.abs(Math.log2(f)) * 0.04 + (hash(`${seed}|${date}|${meal}|${t.id}|${f}`) % 1000) / 1_000_000;
      out.push({ t, m, score });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

/** The protein-per-calorie add-on that the user can get and their diet allows, and enough of it to close a gap. */
export function cheapestFix(proteinGapG: number, input: Pick<PlanInput, 'resources' | 'addOns'>): Shortfall['fix'] {
  const r = input.resources;
  const diet = r.diet;
  const allowed = (a: AddOn) => {
    if (r.availability[a.key] === 'no') return false;
    if (a.key === 'eggs') return diet === 'egg' || diet === 'nonveg';
    if (['curd', 'milk', 'whey'].includes(a.key)) return diet !== 'vegan';
    if (r.avoid.some((x) => x && (a.label.toLowerCase().includes(x) || a.food.toLowerCase().includes(x)))) return false;
    return true;
  };
  const candidates = input.addOns.filter((a) => allowed(a) && (a.protein ?? 0) > 0);
  if (candidates.length === 0 || proteinGapG <= 0) return null;
  const best = [...candidates].sort((a, b) => (b.protein ?? 0) / Math.max(1, b.kcal ?? 1) - (a.protein ?? 0) / Math.max(1, a.kcal ?? 1))[0];
  const per = best.protein ?? 0;
  const n = Math.min(3, Math.max(1, Math.ceil(proteinGapG / per)));
  const qty = best.qty * n;
  const proteinG = Math.round(per * n);
  const kcal = Math.round((best.kcal ?? 0) * n);
  const qtyText = best.unit === 'g' ? `${best.grams * n} g` : `${qty} ${best.unit}${qty !== 1 && !['katori', 'glass', 'scoop', 'handful'].includes(best.unit) ? '' : ''}`;
  return { key: best.key, label: best.label, qty, unit: best.unit, proteinG, kcal, text: `+ ${qtyText} ${best.label} adds ${proteinG} g protein` };
}

export function planDay(input: PlanInput): DayPlan {
  const meals = input.meals && input.meals.length > 0 ? input.meals : MEALS;
  const kShare = meals.reduce((s, m) => s + KCAL_SHARE[m], 0);
  const pShare = meals.reduce((s, m) => s + PROTEIN_SHARE[m], 0);
  const notes: string[] = [];
  const perMeal = meals.map((meal) => {
    const tk = Math.max(50, (input.target.kcal * KCAL_SHARE[meal]) / kShare);
    const tp = Math.max(5, (input.target.protein * PROTEIN_SHARE[meal]) / pShare);
    return { meal, options: optionsFor(meal, input, tk, tp, notes).slice(0, 12) };
  });

  const usable = perMeal.filter((p) => p.options.length > 0);
  let best: Option[] = [];
  if (usable.length > 0) {
    let bestScore = Infinity;
    const walk = (i: number, chosen: Option[]) => {
      if (i === usable.length) {
        const kcal = chosen.reduce((s, o) => s + o.m.kcal, 0);
        const protein = chosen.reduce((s, o) => s + o.m.protein, 0);
        const kErr = Math.abs(kcal - input.target.kcal) / input.target.kcal;
        const pShort = Math.max(0, input.target.protein * PROTEIN_MIN - protein) / input.target.protein;
        const total = kErr * 3 + pShort * 3 + chosen.reduce((s, o) => s + o.score, 0) * 0.25;
        if (total < bestScore - 1e-12) {
          bestScore = total;
          best = chosen;
        }
        return;
      }
      for (const o of usable[i].options) walk(i + 1, [...chosen, o]);
    };
    walk(0, []);
  }

  const planned = best.map((o) => o.m);
  const totals = {
    kcal: planned.reduce((s, m) => s + m.kcal, 0),
    protein: round1(planned.reduce((s, m) => s + m.protein, 0)),
    carbs: round1(planned.reduce((s, m) => s + m.carbs, 0)),
    fat: round1(planned.reduce((s, m) => s + m.fat, 0)),
  };
  const kcalOk = Math.abs(totals.kcal - input.target.kcal) / input.target.kcal <= KCAL_TOLERANCE;
  const proteinOk = totals.protein >= input.target.protein * PROTEIN_MIN;
  const ok = planned.length === meals.length && kcalOk && proteinOk;

  let shortfall: Shortfall | null = null;
  if (!ok) {
    const proteinGapG = Math.max(0, Math.round(input.target.protein * PROTEIN_MIN - totals.protein));
    const kcalGap = Math.round(input.target.kcal - totals.kcal);
    shortfall = { kcalGap, proteinGapG, fix: proteinGapG > 0 ? cheapestFix(proteinGapG, input) : null };
    if (planned.length < meals.length) notes.push('Some meals could not be planned from what you can get.');
  }

  return { date: input.date, meals: planned, totals, ok, shortfall, notes };
}

/** Up to five other templates for the same meal within 10 % of its calories and 15 % of its protein. */
export function swapOptions(current: PlannedMeal, input: PlanInput, limit = 5): PlannedMeal[] {
  const out: { m: PlannedMeal; d: number }[] = [];
  for (const t of input.templates) {
    if (t.meal !== current.meal || t.id === current.templateId) continue;
    if (!isEligible(t, input.resources, input.history, input.date, 0)) continue;
    let pick: PlannedMeal | null = null;
    for (const f of FACTORS) {
      const m = scaleTemplate(t, f);
      if (Math.abs(m.kcal - current.kcal) / Math.max(1, current.kcal) <= 0.1 && Math.abs(m.protein - current.protein) / Math.max(1, current.protein) <= 0.15) {
        if (!pick || Math.abs(m.kcal - current.kcal) < Math.abs(pick.kcal - current.kcal)) pick = m;
      }
    }
    if (pick) out.push({ m: pick, d: Math.abs(pick.kcal - current.kcal) / Math.max(1, current.kcal) + Math.abs(pick.protein - current.protein) / Math.max(1, current.protein) });
  }
  return out.sort((a, b) => a.d - b.d || a.m.name.localeCompare(b.m.name)).slice(0, limit).map((x) => x.m);
}

/**
 * After a meal was swapped or something extra was eaten: plan only the meals still to come against what is left
 * of the day. `eaten` is everything logged so far today.
 */
export function replanRemaining(input: PlanInput, remaining: MealName[], eaten: { kcal: number; protein: number }): DayPlan {
  return planDay({
    ...input,
    meals: remaining,
    target: { kcal: Math.max(150, input.target.kcal - eaten.kcal), protein: Math.max(5, input.target.protein - eaten.protein) },
  });
}

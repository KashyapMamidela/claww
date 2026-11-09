// NG PHASE 7: reads and writes the daily meal plan. The plan is built on the phone by the shared planner from the
// templates bundled in the app and cached in meal_plan_days when that table exists; with no table it is simply
// rebuilt (deterministically) each time.

import { effectiveAvailability, effectiveDiet } from './dietAvoid';
import { supabase } from './supabase';
import { getProfile } from './data';
import { getUserResources } from './userResources';
import { dateKey } from './planStreak';
import { MEAL_TEMPLATES, ADD_ONS, planDay, replanRemaining, swapOptions, type DayPlan, type HistoryDay, type PlanInput, type PlannedMeal, type Resources } from './engine';
import { eatenTotals, remainingSlots, type LoggedLike } from './mealPlanView';

export interface StoredPlan extends DayPlan {
  /** Names the meal had before a swap or an extra changed the plan, by meal, for the pen line. */
  replaced?: Record<string, string>;
}

interface Inputs {
  input: Omit<PlanInput, 'date' | 'history'>;
}

const cache = new Map<string, StoredPlan>();
const ORDER = ['breakfast', 'lunch', 'dinner'];

const words = (text: string | undefined) =>
  (text ?? '')
    .toLowerCase()
    .split(/[,;\n]| and /)
    .map((w) => w.trim())
    .filter(Boolean);

const totalsOf = (meals: PlannedMeal[]) => ({
  kcal: meals.reduce((s, m) => s + m.kcal, 0),
  protein: Math.round(meals.reduce((s, m) => s + m.protein, 0) * 10) / 10,
  carbs: Math.round(meals.reduce((s, m) => s + m.carbs, 0) * 10) / 10,
  fat: Math.round(meals.reduce((s, m) => s + m.fat, 0) * 10) / 10,
});

/** The user's resources and targets as planner inputs; null until they have set up their meals and have targets. */
export async function loadPlanInputs(userId: string): Promise<Inputs | null> {
  const [resources, profile] = await Promise.all([getUserResources(userId), getProfile(userId)]);
  const targets = profile?.personalization_profile?.nutritionDefaults;
  if (!resources || !targets) return null;
  // What the user says they avoid narrows the saved diet (a vegetarian who once ticked Eggetarian gets no egg fixes).
  const avoid = words(profile?.personalization_profile?.foodProfile?.avoid);
  const diet = effectiveDiet(resources.diet, avoid);
  const r: Resources = {
    sources: resources.sources,
    cookWith: resources.cookWith,
    diet,
    availability: effectiveAvailability(resources.availability as Record<string, string>, avoid, diet) as Resources['availability'],
    avoid,
    style: resources.planStyle,
  };
  return { input: { target: { kcal: targets.calories, protein: targets.protein_g }, resources: r, seed: userId, templates: MEAL_TEMPLATES, addOns: ADD_ONS } };
}

async function loadHistory(userId: string, date: string): Promise<HistoryDay[]> {
  const since = new Date(`${date}T00:00:00`);
  since.setDate(since.getDate() - 7);
  const { data, error } = await supabase.from('meal_plan_days').select('plan_date, plan').eq('user_id', userId).gte('plan_date', dateKey(since)).lt('plan_date', date);
  if (error) return [];
  return (data ?? []).map((r) => ({
    date: r.plan_date as string,
    meals: ((r.plan as StoredPlan).meals ?? []).map((m) => ({ meal: m.meal, templateId: m.templateId, uses: m.uses })),
  }));
}

async function readStored(userId: string, date: string): Promise<StoredPlan | null> {
  const { data, error } = await supabase.from('meal_plan_days').select('plan').eq('user_id', userId).eq('plan_date', date).maybeSingle();
  if (error || !data) return null;
  return data.plan as StoredPlan;
}

async function writeStored(userId: string, date: string, plan: StoredPlan): Promise<void> {
  await supabase.from('meal_plan_days').upsert({ user_id: userId, plan_date: date, plan, updated_at: new Date().toISOString() }, { onConflict: 'user_id,plan_date' });
}

/** Plans one date (reading the stored plan first) and caches it. */
export async function planFor(userId: string, date: string, inputs: Inputs): Promise<StoredPlan> {
  const key = `${userId}|${date}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const stored = await readStored(userId, date);
  if (stored) {
    cache.set(key, stored);
    return stored;
  }
  const plan: StoredPlan = planDay({ ...inputs.input, date, history: await loadHistory(userId, date) });
  cache.set(key, plan);
  writeStored(userId, date, plan).catch(() => {});
  return plan;
}

/** Today's and tomorrow's plans, made on app open if they are not there yet. Returns today's, or null with no set-up. */
export async function ensureMealPlans(userId: string): Promise<StoredPlan | null> {
  const inputs = await loadPlanInputs(userId);
  if (!inputs) return null;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const todays = await planFor(userId, dateKey(today), inputs);
  planFor(userId, dateKey(tomorrow), inputs).catch(() => {});
  return todays;
}

/** Forget the cached plans (after the meal set-up changes, so the next open plans from the new answers). */
export async function resetMealPlans(userId: string): Promise<void> {
  cache.clear();
  const today = dateKey(new Date());
  await supabase.from('meal_plan_days').delete().eq('user_id', userId).gte('plan_date', today);
}

/**
 * A meal was swapped or something extra was eaten: plan only the meals still to come against what is left of the day,
 * keep what was already logged, remember what each changed meal used to be, and save.
 */
export async function replanToday(userId: string, logged: LoggedLike[]): Promise<StoredPlan | null> {
  const inputs = await loadPlanInputs(userId);
  if (!inputs) return null;
  const date = dateKey(new Date());
  const current = await planFor(userId, date, inputs);
  const remaining = remainingSlots(logged);
  if (remaining.length === 0) return current;
  const history = await loadHistory(userId, date);
  const rest = replanRemaining({ ...inputs.input, date, history }, remaining, eatenTotals(logged));
  const kept = current.meals.filter((m) => !remaining.includes(m.meal));
  const meals = [...kept, ...rest.meals].sort((a, b) => ORDER.indexOf(a.meal) - ORDER.indexOf(b.meal));
  const replaced: Record<string, string> = { ...(current.replaced ?? {}) };
  for (const m of rest.meals) {
    const before = current.meals.find((x) => x.meal === m.meal);
    if (before && before.templateId !== m.templateId) replaced[m.meal] = before.name;
  }
  const plan: StoredPlan = { ...current, meals, totals: totalsOf(meals), ok: rest.ok, shortfall: rest.shortfall, notes: rest.notes, replaced };
  cache.set(`${userId}|${date}`, plan);
  writeStored(userId, date, plan).catch(() => {});
  return plan;
}

/** Up to five other templates for one of today's meals (within 10 % calories and 15 % protein). */
export async function swapChoices(userId: string, meal: PlannedMeal): Promise<PlannedMeal[]> {
  const inputs = await loadPlanInputs(userId);
  if (!inputs) return [];
  const date = dateKey(new Date());
  return swapOptions(meal, { ...inputs.input, date, history: await loadHistory(userId, date) });
}

/** Replaces one planned meal with a swap choice (before it is eaten) and saves. */
export async function applySwap(userId: string, current: StoredPlan, choice: PlannedMeal): Promise<StoredPlan> {
  const date = dateKey(new Date());
  const meals = current.meals.map((m) => (m.meal === choice.meal ? choice : m));
  const replaced = { ...(current.replaced ?? {}), [choice.meal]: current.meals.find((m) => m.meal === choice.meal)?.name ?? '' };
  const plan: StoredPlan = { ...current, meals, totals: totalsOf(meals), replaced };
  cache.set(`${userId}|${date}`, plan);
  writeStored(userId, date, plan).catch(() => {});
  return plan;
}

/** NG PHASE 11: puts one planned meal into a day's plan (a pen mark swapping it, or its undo) and saves. */
export async function setPlannedMeal(userId: string, date: string, meal: PlannedMeal): Promise<StoredPlan | null> {
  const inputs = await loadPlanInputs(userId);
  if (!inputs) return null;
  const current = await planFor(userId, date, inputs);
  const meals = current.meals.map((m) => (m.meal === meal.meal ? meal : m));
  const plan: StoredPlan = { ...current, meals, totals: totalsOf(meals) };
  cache.set(`${userId}|${date}`, plan);
  writeStored(userId, date, plan).catch(() => {});
  return plan;
}

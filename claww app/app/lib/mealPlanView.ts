// NG PHASE 7/8: what the Nutrition tab shows for each of today's three meals, given the plan and what was logged.
// Pure, so the states (as planned, swapped, extra, up next, later) are tested.

import type { DayPlan, PlannedMeal } from './engine';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export interface LoggedLike {
  id: string;
  meal_type: string | null;
  plan_status?: string | null;
  logged_at: string;
  description: string;
  calories: number | null;
  protein_g: number | null;
}

export type SlotState = 'as_planned' | 'swapped' | 'extra' | 'skipped' | 'up_next' | 'later' | 'unplanned';

export interface SlotView {
  slot: MealSlot;
  planned: PlannedMeal | null;
  logged: LoggedLike | null;
  state: SlotState;
}

/** Local hour at which each meal's window ends, for working out which one is up next. */
const WINDOW_END: Record<MealSlot, number> = { breakfast: 11, lunch: 16, dinner: 24 };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const slotLabel = (s: MealSlot) => cap(s);

/** The meal for this time of day if it is not logged, else the next one that is not; null when dinner is logged. */
export function upNextSlot(logged: LoggedLike[], hour: number): MealSlot | null {
  const done = new Set(logged.map((l) => (l.meal_type ?? '').toLowerCase()));
  const current = SLOTS.findIndex((s) => hour < WINDOW_END[s]);
  for (let i = Math.max(0, current); i < SLOTS.length; i++) if (!done.has(SLOTS[i])) return SLOTS[i];
  return null;
}

export function slotViews(plan: DayPlan | null, logged: LoggedLike[], hour: number): SlotView[] {
  const next = upNextSlot(logged, hour);
  return SLOTS.map((slot) => {
    const planned = plan?.meals.find((m) => m.meal === slot) ?? null;
    const entry = logged.find((l) => (l.meal_type ?? '').toLowerCase() === slot) ?? null;
    let state: SlotState;
    if (entry) state = entry.plan_status === 'skipped' ? 'skipped' : entry.plan_status === 'as_planned' ? 'as_planned' : entry.plan_status === 'swapped' ? 'swapped' : planned ? 'swapped' : 'extra';
    else if (slot === next) state = 'up_next';
    else state = planned ? 'later' : 'unplanned';
    return { slot, planned, logged: entry, state };
  });
}

/** Everything eaten so far today, for re-planning what is left. */
export function eatenTotals(logged: LoggedLike[]): { kcal: number; protein: number } {
  return { kcal: logged.reduce((s, l) => s + (l.calories ?? 0), 0), protein: logged.reduce((s, l) => s + (l.protein_g ?? 0), 0) };
}

/** The meals still to plan today: those not logged yet. */
export function remainingSlots(logged: LoggedLike[]): MealSlot[] {
  const done = new Set(logged.map((l) => (l.meal_type ?? '').toLowerCase()));
  return SLOTS.filter((s) => !done.has(s));
}

/** One plain line about the day's plan: "Plan fits: 2,150 kcal, 118 g protein" or the shortfall and its fix. */
export function planLine(plan: DayPlan): string {
  const kcal = plan.totals.kcal.toLocaleString('en-IN');
  if (plan.ok) return `${kcal} kcal · P ${Math.round(plan.totals.protein)} g`;
  const s = plan.shortfall;
  if (s && s.proteinGapG > 0) return s.fix ? `${s.proteinGapG} g protein short. ${s.fix.text}` : `${s.proteinGapG} g protein short of the target`;
  return `${kcal} kcal · P ${Math.round(plan.totals.protein)} g`;
}

// Pure plan-assembly helpers — deliberately dependency-free (no Deno APIs, no
// Supabase/Groq imports) so they're testable with a plain test runner
// without mocking anything. generate-plan/index.ts is the only caller that
// runs under Deno; this file itself doesn't care which runtime imports it.

// Equipment tiers: higher access implies the lower tiers too (a gym-goer
// can still do bodyweight moves; a bodyweight-only user can't do gym ones).
export const EQUIPMENT_TIERS: Record<string, string[]> = {
  none: ['none'],
  home: ['none', 'home'],
  gym: ['none', 'home', 'gym'],
};

export function deriveAllowedEquipment(equipment: string | null | undefined): string[] {
  return EQUIPMENT_TIERS[equipment ?? ''] ?? EQUIPMENT_TIERS.gym;
}

export interface CatalogExercise {
  id?: string;
  name: string;
}

export interface GroundablePlanExercise {
  exerciseId?: string;
  name: string;
  sets: number;
  reps: number;
}

export interface GroundablePlanDay {
  day: string;
  focus: string;
  exercises: GroundablePlanExercise[];
}

export interface GroundablePlan {
  days: GroundablePlanDay[];
  notes?: string;
}

/**
 * Grounds the model's output in the exercise list we actually sent it —
 * Zod only checks shape/types, not that the names are real. Anything not
 * matching (case-insensitively) an offered exercise is dropped; days left
 * with nothing valid are dropped too; an empty result falls back further.
 * Surviving exercises get their exerciseId rewritten to the catalog row's
 * real id (the model's own id, if any, isn't trusted) so workout_logs can
 * link back to the catalog when one exists.
 */
export function groundPlanInCatalog<T extends GroundablePlan>(plan: T, availableExercises: CatalogExercise[]): T {
  const byName = new Map(availableExercises.map((e) => [e.name.trim().toLowerCase(), e]));
  const days = plan.days
    .map((day) => ({
      ...day,
      exercises: day.exercises
        .filter((ex) => byName.has(ex.name.trim().toLowerCase()))
        .map((ex) => ({ ...ex, exerciseId: byName.get(ex.name.trim().toLowerCase())?.id })),
    }))
    .filter((day) => day.exercises.length > 0);
  return { ...plan, days };
}

const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * When the user picked training weekdays, the day labels come from them and
 * not from the model (V2 PHASE 6.1): the model only orders the sessions. The
 * i-th generated day is labelled with the i-th picked weekday, in calendar
 * order, and extra generated days beyond the picks are dropped. If the model
 * returned fewer days than picked, the remaining weekdays are simply not in
 * the plan. With no picked weekdays the plan is returned untouched.
 */
export function applyTrainingWeekdays<T extends { days: { day: string }[] }>(plan: T, trainingDays: string[] | null | undefined): T {
  if (!trainingDays || trainingDays.length === 0) return plan;
  const unique = Array.from(new Set(trainingDays.map((d) => d.trim().toLowerCase()))).filter((d) => WEEKDAY_ORDER.includes(d));
  if (unique.length === 0) return plan;
  const ordered = unique.sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
  const label = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);
  const days = plan.days.slice(0, ordered.length).map((d, i) => ({ ...d, day: label(ordered[i]) }));
  return { ...plan, days };
}

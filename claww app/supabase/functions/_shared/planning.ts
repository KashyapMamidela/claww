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

// ─────────────────────────────────────────────────────────────────────────
// Rep ranges, moved here from generate-plan so the app can compute the same
// numbers for a manually added exercise (V2 PHASE 7.4).
// ─────────────────────────────────────────────────────────────────────────

export interface RepRange {
  minSets: number;
  maxSets: number;
  minReps: number;
  maxReps: number;
}

// Standard hypertrophy/strength/endurance rep-range conventions per goal.
export const GOAL_REP_RANGES: Record<string, RepRange> = {
  muscle_gain: { minSets: 3, maxSets: 5, minReps: 6, maxReps: 12 },
  fat_loss: { minSets: 2, maxSets: 4, minReps: 12, maxReps: 20 },
  endurance: { minSets: 2, maxSets: 3, minReps: 15, maxReps: 25 },
  maintenance: { minSets: 2, maxSets: 4, minReps: 8, maxReps: 15 },
  flexibility: { minSets: 1, maxSets: 3, minReps: 20, maxReps: 60 },
};

// A beginner shouldn't be programmed the same volume as an advanced lifter
// even for the same goal — this caps sets regardless of what the goal range allows.
export const EXPERIENCE_MAX_SETS: Record<string, number> = { beginner: 3, intermediate: 4, advanced: 5 };

export function computeRepRange(goal: string | null, experienceLevel: string | null, age: number | null): RepRange {
  const base = GOAL_REP_RANGES[goal ?? ''] ?? GOAL_REP_RANGES.maintenance;
  const experienceCap = EXPERIENCE_MAX_SETS[experienceLevel ?? ''] ?? EXPERIENCE_MAX_SETS.intermediate;
  let maxSets = Math.min(base.maxSets, experienceCap);
  let minReps = base.minReps;

  // Older adults: bias away from heavy near-maximal low-rep work and cap
  // volume further, even if their goal/experience would otherwise allow more.
  if (age !== null) {
    if (age >= 65) {
      maxSets = Math.min(maxSets, 3);
      minReps = Math.max(minReps, 10);
    } else if (age >= 50) {
      maxSets = Math.min(maxSets, 4);
      minReps = Math.max(minReps, 8);
    }
  }

  return { minSets: Math.min(base.minSets, maxSets), maxSets, minReps, maxReps: Math.max(base.maxReps, minReps) };
}

export type ExerciseRole = 'main' | 'accessory';

export interface StartingPrescription {
  repMin: number;
  repMax: number;
  sets: number;
  /** The rep target the first session starts at: the middle of the range, rounded down. */
  startReps: number;
}

/**
 * The adaptive engine's range for one exercise, from the goal-level range
 * and the exercise's role (V2 PHASE 7.4). Main lifts take the lower part of
 * the goal's rep range and accessories the upper part, so a compound lift on
 * a muscle-gain plan gets 6-10 and an isolation lift 10-12. Sets start at 3,
 * held inside the goal's min/max sets.
 */
export function startingPrescription(range: RepRange, role: ExerciseRole | null | undefined): StartingPrescription {
  const span = Math.max(0, range.maxReps - range.minReps);
  const width = Math.max(2, Math.min(4, span));
  let repMin = range.minReps;
  let repMax = range.maxReps;
  if (role === 'accessory') repMin = Math.max(range.minReps, range.maxReps - width);
  else if (role === 'main') repMax = Math.min(range.maxReps, range.minReps + width);
  if (repMax < repMin) repMax = repMin;
  const sets = Math.min(range.maxSets, Math.max(range.minSets, 3));
  return { repMin, repMax, sets, startReps: Math.floor((repMin + repMax) / 2) };
}

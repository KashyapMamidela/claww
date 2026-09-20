import { supabase } from './supabase';
import { computeNutritionSample, type ActivityLevel, type Goal, type NutritionDefaults } from './nutrition';
import { track, AnalyticsEvent } from './analytics';

export { computeNutritionSample, type ActivityLevel, type Goal, type NutritionDefaults } from './nutrition';

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'gym' | 'home' | 'none';
export type Modality = 'strength' | 'cardio' | 'mobility' | 'yoga';

export interface WorkoutDefaults {
  modalities: Modality[];
  activityLevel: ActivityLevel;
  /** Free-text injuries/limitations (e.g. "bad knees, avoid heavy squats") — feeds the exercise-exclusion filter in generate-plan. */
  injuries?: string;
}

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_allergy'
  | 'shellfish_allergy'
  | 'halal'
  | 'kosher';

export interface PersonalizationProfile {
  name?: string;
  age?: number | null;
  gender?: string | null;
  workoutDefaults?: WorkoutDefaults | null;
  nutritionDefaults?: NutritionDefaults | null;
  dietaryRestrictions?: DietaryRestriction[];
}

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  goal: Goal | null;
  experience_level: ExperienceLevel | null;
  equipment: Equipment | null;
  personalization_profile: PersonalizationProfile | null;
  notifications_enabled: boolean;
  notification_prompt_shown_at: string | null;
}

const PROFILE_COLUMNS =
  'id, name, email, age, gender, height, weight, goal, experience_level, equipment, personalization_profile, notifications_enabled, notification_prompt_shown_at';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) {
    console.warn('[Claww] Failed to load profile:', error.message);
    return null;
  }
  return data;
}

// SHIP PHASE 8.3 — records the one-time soft-ask (never re-shown) and
// whether reminders are actually on, independently: shown-but-declined and
// shown-then-later-enabled-from-Settings are both valid states.
export async function setNotificationPromptShown(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ notification_prompt_shown_at: new Date().toISOString() }).eq('id', userId);
  if (error) console.warn('[Claww] Failed to record notification prompt shown:', error.message);
}

export async function setNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', userId);
  if (error) console.warn('[Claww] Failed to update notification preference:', error.message);
}

export interface WorkoutIntakeInput {
  height: number;
  weight: number;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  equipment: Equipment;
  modalities: Modality[];
  activityLevel: ActivityLevel;
  injuries?: string;
}

/**
 * Saves the workout-setup intake: flat columns for the fields the schema
 * already had (height/weight/goal/experience_level/equipment), plus a
 * merge into personalization_profile.workoutDefaults for the fields
 * generate-plan reads (modalities, activityLevel) — read-modify-write since
 * personalization_profile also holds name/gender/nutritionDefaults we must
 * not clobber.
 */
export async function saveWorkoutIntake(userId: string, input: WorkoutIntakeInput): Promise<boolean> {
  const profile = await getProfile(userId);
  const nextPersonalization: PersonalizationProfile = {
    ...(profile?.personalization_profile ?? {}),
    workoutDefaults: { modalities: input.modalities, activityLevel: input.activityLevel, injuries: input.injuries?.trim() || undefined },
  };

  const { error } = await supabase
    .from('profiles')
    .update({
      height: input.height,
      weight: input.weight,
      goal: input.goal,
      experience_level: input.experienceLevel,
      equipment: input.equipment,
      personalization_profile: nextPersonalization,
    })
    .eq('id', userId);

  if (error) {
    console.warn('[Claww] Failed to save workout intake:', error.message);
    return false;
  }
  return true;
}

export async function saveNutritionTargets(
  userId: string,
  targets: NutritionDefaults,
  dietaryRestrictions?: DietaryRestriction[]
): Promise<boolean> {
  const profile = await getProfile(userId);
  const nextPersonalization: PersonalizationProfile = {
    ...(profile?.personalization_profile ?? {}),
    nutritionDefaults: targets,
    dietaryRestrictions: dietaryRestrictions ?? profile?.personalization_profile?.dietaryRestrictions,
  };

  const { error } = await supabase
    .from('profiles')
    .update({ personalization_profile: nextPersonalization })
    .eq('id', userId);

  if (error) {
    console.warn('[Claww] Failed to save nutrition targets:', error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleep
// ─────────────────────────────────────────────────────────────────────────────

export interface SleepLogRow {
  hours: number;
  bedtime: string | null;
  wake_time: string | null;
  logged_at: string;
}

export async function getLatestSleepLog(userId: string): Promise<SleepLogRow | null> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('hours, bedtime, wake_time, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[Claww] Failed to load sleep log:', error.message);
    return null;
  }
  return data;
}

export async function insertSleepLog(userId: string, hours: number, bedtime: Date, wakeTime: Date): Promise<boolean> {
  const { error } = await supabase.from('sleep_logs').insert({
    user_id: userId,
    hours,
    bedtime: bedtime.toISOString(),
    wake_time: wakeTime.toISOString(),
  });
  if (error) {
    console.warn('[Claww] Failed to save sleep log:', error.message);
    return false;
  }
  await awardXp(userId, 10, 'sleep_logged');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery score
//
// Client-side port of supabase/functions/_shared/recovery.ts's formula, so
// Home can show a real score today without depending on that Edge Function
// being deployed yet. Once it is deployed, generate-plan will use the
// server-side version for plan generation; this stays as Home's quick read.
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryResult {
  score: number;
  band: 'Low' | 'Moderate' | 'High';
}

function estimateSessionIntensity(workoutLog: { sets: number | null; reps_achieved: number | null; reps_prescribed: number | null } | null): number {
  if (!workoutLog) return 0;
  const reps = workoutLog.reps_achieved ?? workoutLog.reps_prescribed ?? 0;
  const volume = (workoutLog.sets ?? 0) * reps;
  return Math.max(0, Math.min(10, volume / 10));
}

export function computeRecoveryScore(
  sleepLog: { hours: number | null } | null,
  workoutLog: { sets: number | null; reps_achieved: number | null; reps_prescribed: number | null; completed_at: string } | null
): RecoveryResult {
  const sleepHours = sleepLog?.hours ?? 0;
  const sleepScore = Math.min(sleepHours / 8, 1) * 40;

  let recoveryGap = 30; // no prior session on record -> full recovery credit
  if (workoutLog?.completed_at) {
    const hoursSinceLastSession = (Date.now() - new Date(workoutLog.completed_at).getTime()) / (1000 * 60 * 60);
    recoveryGap = Math.min(Math.max(hoursSinceLastSession, 0) / 24, 1) * 30;
  }

  const fatiguePenalty = estimateSessionIntensity(workoutLog) * 3;
  const score = Math.max(0, Math.min(100, sleepScore + recoveryGap - fatiguePenalty + 30));
  const band: RecoveryResult['band'] = score < 40 ? 'Low' : score <= 70 ? 'Moderate' : 'High';
  return { score: Math.round(score), band };
}

/** Returns null when there's no sleep log yet — nothing to compute a score from. */
export async function getRecoveryScore(userId: string): Promise<RecoveryResult | null> {
  const [sleepLog, workoutLogResult] = await Promise.all([
    getLatestSleepLog(userId),
    supabase
      .from('workout_logs')
      .select('sets, reps_achieved, reps_prescribed, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!sleepLog) return null;
  return computeRecoveryScore(sleepLog, workoutLogResult.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Meals
// ─────────────────────────────────────────────────────────────────────────────

export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';
export const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

export interface MealLogRow {
  id: string;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  estimated: boolean;
  meal_type: MealType | null;
  logged_at: string;
}

export async function getTodaysMealLogs(userId: string): Promise<MealLogRow[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('meal_logs')
    .select('id, description, calories, protein_g, carbs_g, fats_g, estimated, meal_type, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString())
    .order('logged_at', { ascending: true });
  if (error) {
    console.warn('[Claww] Failed to load meal logs:', error.message);
    return [];
  }
  return data ?? [];
}

const FALLBACK_MEAL_MACROS: Record<MealType, { calories: number; protein_g: number; carbs_g: number; fats_g: number }> = {
  Breakfast: { calories: 455, protein_g: 32, carbs_g: 48, fats_g: 14 },
  Lunch: { calories: 605, protein_g: 46, carbs_g: 58, fats_g: 18 },
  Snack: { calories: 305, protein_g: 18, carbs_g: 38, fats_g: 9 },
  Dinner: { calories: 420, protein_g: 38, carbs_g: 32, fats_g: 11 },
};

export type PortionSize = 'small' | 'regular' | 'large';

// "regular" is the base estimate; small/large scale it by a fixed ratio.
// Mirrors the same map used server-side in parse-meal and parse-meal-photo
// (this copy only fires when the Edge Function is unreachable and we fall
// back to the flat per-meal-type estimate below).
const PORTION_MULTIPLIERS: Record<PortionSize, number> = { small: 0.7, regular: 1, large: 1.4 };

export interface EstimatedMeal {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface EstimateResult {
  ok: boolean;
  meal?: EstimatedMeal;
  reason?: string;
}

/**
 * Estimates a meal's macros from text — does NOT save anything. Callers
 * show this to the user for review/edit, then call saveMeal once confirmed
 * (see meal-log.tsx). Tries the parse-meal Edge Function first; if it's not
 * deployed yet (or errors for any reason), falls back to a rough
 * per-meal-type estimate so there's still something to review either way.
 */
export async function estimateMeal(mealType: MealType, text: string, portion: PortionSize = 'regular'): Promise<EstimateResult> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-meal', { body: { text, mealType, portion } });
    if (!error && data && typeof data.calories === 'number') {
      track(AnalyticsEvent.MealEstimated, { generated: true, source: 'text' });
      return { ok: true, meal: data as EstimatedMeal };
    }
  } catch {
    // Edge Function not deployed / unreachable — fall through to the local estimate.
  }

  track(AnalyticsEvent.MealEstimated, { generated: false, source: 'text' });
  const fallback = FALLBACK_MEAL_MACROS[mealType];
  const multiplier = PORTION_MULTIPLIERS[portion];
  return {
    ok: true,
    meal: {
      description: text,
      calories: Math.round(fallback.calories * multiplier),
      protein_g: Math.round(fallback.protein_g * multiplier),
      carbs_g: Math.round(fallback.carbs_g * multiplier),
      fats_g: Math.round(fallback.fats_g * multiplier),
    },
  };
}

/**
 * Estimates a meal's macros from a photo via the parse-meal-photo Edge
 * Function, which also moderates the image (flags non-food or
 * inappropriate photos). Does NOT save anything — same review-before-save
 * contract as estimateMeal. No local fallback here — unlike text, there's
 * no sane offline guess for "what's in this photo," so a failure surfaces
 * to the caller instead of silently inventing numbers.
 */
export async function estimateMealFromPhoto(mealType: MealType, imageDataUri: string, portion: PortionSize = 'regular'): Promise<EstimateResult> {
  const { data, error } = await supabase.functions.invoke('parse-meal-photo', {
    body: { image: imageDataUri, mealType, portion },
  });
  if (error) {
    const message = await extractInvokeErrorMessage(error);
    console.warn('[Claww] Failed to estimate meal from photo:', message ?? error.message);
    return { ok: false, reason: message ?? "Couldn't estimate that photo — check your connection and try again." };
  }
  if (data?.blocked) {
    return { ok: false, reason: data.reason ?? "That photo couldn't be processed." };
  }
  if (!data || typeof data.calories !== 'number') {
    return { ok: false, reason: "Couldn't estimate that photo — try a clearer shot, or describe the meal in words instead." };
  }
  track(AnalyticsEvent.MealEstimated, { generated: true, source: 'photo' });
  return { ok: true, meal: data as EstimatedMeal };
}

/**
 * Saves a meal the user has reviewed (and possibly edited) — the only place
 * that actually writes to meal_logs. RLS-scoped insert straight from the
 * client, same pattern as every other own-rows write in this file.
 */
export async function saveMeal(userId: string, mealType: MealType, meal: EstimatedMeal): Promise<MealLogRow | null> {
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      description: meal.description,
      calories: Math.round(meal.calories),
      protein_g: Math.round(meal.protein_g),
      carbs_g: Math.round(meal.carbs_g),
      fats_g: Math.round(meal.fats_g),
      estimated: true,
      meal_type: mealType,
    })
    .select('id, description, calories, protein_g, carbs_g, fats_g, estimated, meal_type, logged_at')
    .single();

  if (error) {
    console.warn('[Claww] Failed to save meal log:', error.message);
    return null;
  }
  track(AnalyticsEvent.MealLogged, { meal_type: mealType });
  await awardXp(userId, 10, 'meal_logged');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workouts
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkoutSetInput {
  exerciseName: string;
  exerciseId?: string | null;
  setNumber: number;
  repsPrescribed: number;
  repsAchieved: number;
  weightPrescribed: number;
  weightAchieved: number;
}

/** Logs one completed set (see WorkoutSessionProvider). Awards a small, real XP amount per set. */
export async function logWorkoutSet(userId: string, log: WorkoutSetInput): Promise<boolean> {
  const { error } = await supabase.from('workout_logs').insert({
    user_id: userId,
    exercise_id: log.exerciseId ?? null,
    exercise_name: log.exerciseName,
    sets: log.setNumber,
    reps_prescribed: log.repsPrescribed,
    reps_achieved: log.repsAchieved,
    weight_prescribed: log.weightPrescribed,
    weight_achieved: log.weightAchieved,
  });
  if (error) {
    console.warn('[Claww] Failed to log workout set:', error.message);
    return false;
  }
  await awardXp(userId, 5, 'set_completed');
  return true;
}

/** Count of completed sets logged (one workout_logs row per set — see logWorkoutSet). */
export async function getWorkoutLogCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workout_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    console.warn('[Claww] Failed to count workout logs:', error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * "Workouts completed" = distinct calendar days with at least one logged
 * set — there's no session-id on workout_logs, so a day with any training
 * activity counts as one workout, same convention as the activity streak.
 */
export async function getCompletedWorkoutDays(userId: string): Promise<number> {
  const { data, error } = await supabase.from('workout_logs').select('completed_at').eq('user_id', userId);
  if (error) {
    console.warn('[Claww] Failed to count completed workouts:', error.message);
    return 0;
  }
  const days = new Set((data ?? []).map((row) => new Date(row.completed_at).toDateString()));
  return days.size;
}

/** Distinct training days so far this calendar month — same convention as getCompletedWorkoutDays. */
export async function getWorkoutsThisMonth(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('workout_logs')
    .select('completed_at')
    .eq('user_id', userId)
    .gte('completed_at', startOfMonth.toISOString());
  if (error) {
    console.warn('[Claww] Failed to count monthly workout logs:', error.message);
    return 0;
  }
  const days = new Set((data ?? []).map((row) => new Date(row.completed_at).toDateString()));
  return days.size;
}

/** Total sets x reps x weight lifted, all-time — achieved where logged, prescribed otherwise (pre-migration rows have no achieved value yet). */
export async function getTotalVolume(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('sets, reps_achieved, reps_prescribed, weight_achieved, weight_prescribed')
    .eq('user_id', userId);
  if (error) {
    console.warn('[Claww] Failed to load workout volume:', error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => {
    const reps = row.reps_achieved ?? row.reps_prescribed ?? 0;
    const weight = row.weight_achieved ?? row.weight_prescribed ?? 0;
    return sum + (row.sets ?? 0) * reps * weight;
  }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated workout plans
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanExercise {
  exerciseId?: string;
  name: string;
  sets: number;
  reps: number;
}

export interface PlanDay {
  day: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  days: PlanDay[];
  notes?: string;
}

export interface WorkoutRow {
  id: string;
  plan: WorkoutPlan;
  created_at: string;
}

export async function getLatestWorkout(userId: string): Promise<WorkoutRow | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, plan, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[Claww] Failed to load latest workout:', error.message);
    return null;
  }
  return data;
}

/**
 * Edge Functions return a JSON body like `{ error: "..." }` on failure (a
 * validation error, the Groq model being blocked, or the daily generation
 * cap being hit) — but supabase-js only puts a generic "non-2xx status
 * code" message on `error.message`, with the actual response body sitting
 * unread on `error.context` (a Response). This reads that body so callers
 * can show the real reason instead of a generic one.
 */
export async function extractInvokeErrorMessage(error: { context?: unknown; message?: string } | null): Promise<string | null> {
  const context = error?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Body wasn't JSON (e.g. a network-level failure) — fall through.
    }
  }
  return null;
}

/** Calls the generate-plan Edge Function (personalized plan, grounded in the real exercises catalog). */
export type RegenerationReason = 'too_hard' | 'too_easy' | 'wrong_focus';

export interface GeneratePlanResult {
  workout: WorkoutRow | null;
  error?: string;
}

export async function generateWorkoutPlan(userId: string, reason?: RegenerationReason): Promise<GeneratePlanResult> {
  const { data, error } = await supabase.functions.invoke('generate-plan', { body: reason ? { reason } : {} });
  if (error) {
    const message = await extractInvokeErrorMessage(error);
    console.warn('[Claww] Failed to generate workout plan:', message ?? error.message);
    return { workout: null, error: message ?? undefined };
  }
  // `generated` distinguishes a real Groq plan from a DEFAULT_PLAN fallback
  // (see generate-plan/index.ts) — tracked here, not just in
  // generation_failures, so it's joinable against onboarding/retention funnels.
  track(AnalyticsEvent.WorkoutPlanGenerated, { generated: Boolean(data?.generated), cached: Boolean(data?.cached) });
  await awardXp(userId, 50, 'plan_generated');
  return { workout: data?.workout ?? null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout day scheduling — tracks which plan day was completed/skipped and
// when, so the Workouts tab can recommend "today" instead of always
// defaulting to days[0], and render a real completed/skipped calendar.
// ─────────────────────────────────────────────────────────────────────────────

export type WorkoutDayStatus = 'completed' | 'skipped';

export interface WorkoutDayEvent {
  id: string;
  workoutId: string | null;
  dayLabel: string;
  dayFocus: string | null;
  status: WorkoutDayStatus;
  eventDate: string; // YYYY-MM-DD
}

function mapDayEventRow(row: {
  id: string;
  workout_id: string | null;
  day_label: string;
  day_focus: string | null;
  status: WorkoutDayStatus;
  event_date: string;
}): WorkoutDayEvent {
  return {
    id: row.id,
    workoutId: row.workout_id,
    dayLabel: row.day_label,
    dayFocus: row.day_focus,
    status: row.status,
    eventDate: row.event_date,
  };
}

export async function logWorkoutDayEvent(
  userId: string,
  workoutId: string,
  dayLabel: string,
  dayFocus: string,
  status: WorkoutDayStatus
): Promise<boolean> {
  const { error } = await supabase.from('workout_day_events').insert({
    user_id: userId,
    workout_id: workoutId,
    day_label: dayLabel,
    day_focus: dayFocus,
    status,
  });
  if (error) {
    console.warn('[Claww] Failed to log workout day event:', error.message);
    return false;
  }
  return true;
}

/** Events for a specific workout plan, most recent first — used to compute the next suggested day. */
export async function getWorkoutDayEvents(userId: string, workoutId: string): Promise<WorkoutDayEvent[]> {
  const { data, error } = await supabase
    .from('workout_day_events')
    .select('id, workout_id, day_label, day_focus, status, event_date')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Claww] Failed to load workout day events:', error.message);
    return [];
  }
  return (data ?? []).map(mapDayEventRow);
}

/** All events in an inclusive date range (across any plan) — feeds the completed/skipped calendar. */
export async function getWorkoutDayEventsInRange(userId: string, startDate: string, endDate: string): Promise<WorkoutDayEvent[]> {
  const { data, error } = await supabase
    .from('workout_day_events')
    .select('id, workout_id, day_label, day_focus, status, event_date')
    .eq('user_id', userId)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });
  if (error) {
    console.warn('[Claww] Failed to load workout calendar:', error.message);
    return [];
  }
  return (data ?? []).map(mapDayEventRow);
}

/**
 * Suggests which plan day to do next: the day after whichever was most
 * recently completed or skipped, cycling back to the start once the plan's
 * days are exhausted (a split repeats indefinitely, it doesn't "run out").
 * No events yet for this plan -> suggest day 0.
 */
export function getSuggestedDayIndex(plan: WorkoutPlan, recentEventsDesc: WorkoutDayEvent[]): number {
  if (recentEventsDesc.length === 0 || plan.days.length === 0) return 0;
  const mostRecent = recentEventsDesc[0];
  const lastIndex = plan.days.findIndex((d) => d.day === mostRecent.dayLabel);
  if (lastIndex === -1) return 0;
  return (lastIndex + 1) % plan.days.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// XP — append-only ledger (xp_events), summed by the user_xp view. Awarding
// XP is fire-and-forget: it should never block or fail the action that
// earned it (logging sleep/a meal/generating a plan all still succeed even
// if this insert fails).
// ─────────────────────────────────────────────────────────────────────────────

export async function awardXp(userId: string, amount: number, reason: string): Promise<void> {
  const { error } = await supabase.from('xp_events').insert({ user_id: userId, amount, reason });
  if (error) {
    console.warn('[Claww] Failed to award XP:', error.message);
  }
}

/** Sums xp_events via the user_xp view. The view has no row at all for a user with zero events. */
export async function getUserXp(userId: string): Promise<number> {
  const { data, error } = await supabase.from('user_xp').select('xp').eq('user_id', userId).maybeSingle();
  if (error) {
    console.warn('[Claww] Failed to load XP:', error.message);
    return 0;
  }
  return data?.xp ?? 0;
}

const XP_PER_LEVEL = 100;

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function getLevelInfo(xp: number): LevelInfo {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { level, xpIntoLevel: xp % XP_PER_LEVEL, xpForNextLevel: XP_PER_LEVEL };
}

const TIER_NAMES = ['Getting Started', 'Building Momentum', 'Committed', 'Dedicated', 'Elite'];

export function getTierName(level: number): string {
  const idx = Math.min(TIER_NAMES.length - 1, Math.floor((level - 1) / 5));
  return TIER_NAMES[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity streak — consecutive calendar days (ending today or yesterday,
// so it doesn't reset to 0 at midnight before today's first log) with at
// least one sleep or meal log. The only two consistently-logged real
// signals available without a workout-tracking UI.
// ─────────────────────────────────────────────────────────────────────────────

export async function getActivityStreak(userId: string): Promise<number> {
  const [sleepRes, mealRes] = await Promise.all([
    supabase.from('sleep_logs').select('logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(120),
    supabase.from('meal_logs').select('logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(120),
  ]);

  const days = new Set<string>();
  for (const row of [...(sleepRes.data ?? []), ...(mealRes.data ?? [])]) {
    days.add(new Date(row.logged_at).toDateString());
  }
  if (days.size === 0) return 0;

  const cursor = new Date();
  // If nothing logged today yet, start counting from yesterday so an
  // active streak doesn't read as broken before the day is even over.
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─────────────────────────────────────────────────────────────────────────────
// Water intake
// ─────────────────────────────────────────────────────────────────────────────

export async function getTodaysWaterMl(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('water_logs')
    .select('ml')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString());
  if (error) {
    console.warn('[Claww] Failed to load water logs:', error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + row.ml, 0);
}

export async function logWater(userId: string, ml: number): Promise<boolean> {
  const { error } = await supabase.from('water_logs').insert({ user_id: userId, ml });
  if (error) {
    console.warn('[Claww] Failed to save water log:', error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Achievements — every badge below is computed from a real signal already
// in the database. None are permanently-fake placeholders; a badge with no
// real signal yet simply isn't included rather than being shown as "locked
// forever."
// ─────────────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  icon: string;
  label: string;
  color: string;
  earned: boolean;
}

export async function getAchievements(userId: string): Promise<Achievement[]> {
  const [sleepCountRes, mealCountRes, workoutCountRes, lateSleepRes, streak, xp] = await Promise.all([
    supabase.from('sleep_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('meal_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sleep_logs').select('bedtime').eq('user_id', userId),
    getActivityStreak(userId),
    getUserXp(userId),
  ]);

  const sleepCount = sleepCountRes.count ?? 0;
  const mealCount = mealCountRes.count ?? 0;
  const workoutCount = workoutCountRes.count ?? 0;
  const hasNightOwlSleep = (lateSleepRes.data ?? []).some((row) => {
    if (!row.bedtime) return false;
    const hour = new Date(row.bedtime).getHours();
    return hour >= 23 || hour < 4;
  });

  return [
    { id: 'first_steps', icon: '🎯', label: 'First Steps', color: '#00D68F', earned: sleepCount + mealCount + workoutCount > 0 },
    { id: 'week_warrior', icon: '🔥', label: 'Week Warrior', color: '#FF4500', earned: streak >= 7 },
    { id: 'planner', icon: '💪', label: 'Planner', color: '#3B82F6', earned: workoutCount >= 1 },
    { id: 'nourished', icon: '🥗', label: 'Nourished', color: '#22C55E', earned: mealCount >= 10 },
    { id: 'night_owl', icon: '🌙', label: 'Night Owl', color: '#6366F1', earned: hasNightOwlSleep },
    { id: 'consistent', icon: '⚡', label: 'Consistent', color: '#A855F7', earned: sleepCount >= 5 },
    { id: 'legend', icon: '🚀', label: 'CLAWW Legend', color: '#EC4899', earned: xp >= 500 },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIP PHASE 7.5 — data export. Reuses the caller's own JWT-scoped `supabase`
// client and lets RLS restrict every query to the caller's own rows — no
// service role, unlike delete-account. That every one of these queries
// returns only the caller's data is itself a live check that each table's
// RLS policy actually works, not just an assumption.
// ─────────────────────────────────────────────────────────────────────────────

export interface UserDataExport {
  exportedAt: string;
  profile: unknown;
  userStats: unknown;
  workouts: unknown[];
  nutritionLogs: unknown[];
  sleepLogs: unknown[];
  workoutLogs: unknown[];
  workoutDayEvents: unknown[];
  mealLogs: unknown[];
  waterLogs: unknown[];
  xpEvents: unknown[];
  generationUsage: unknown[];
  generationFailures: unknown[];
}

/** Assembles a single JSON export of everything the given user owns, across every user_id-scoped table in database/schema.sql. */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const [
    profile,
    userStats,
    workouts,
    nutritionLogs,
    sleepLogs,
    workoutLogs,
    workoutDayEvents,
    mealLogs,
    waterLogs,
    xpEvents,
    generationUsage,
    generationFailures,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('workouts').select('*').eq('user_id', userId),
    supabase.from('nutrition_logs').select('*').eq('user_id', userId),
    supabase.from('sleep_logs').select('*').eq('user_id', userId),
    supabase.from('workout_logs').select('*').eq('user_id', userId),
    supabase.from('workout_day_events').select('*').eq('user_id', userId),
    supabase.from('meal_logs').select('*').eq('user_id', userId),
    supabase.from('water_logs').select('*').eq('user_id', userId),
    supabase.from('xp_events').select('*').eq('user_id', userId),
    supabase.from('generation_usage').select('*').eq('user_id', userId),
    supabase.from('generation_failures').select('*').eq('user_id', userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profile.data ?? null,
    userStats: userStats.data ?? null,
    workouts: workouts.data ?? [],
    nutritionLogs: nutritionLogs.data ?? [],
    sleepLogs: sleepLogs.data ?? [],
    workoutLogs: workoutLogs.data ?? [],
    workoutDayEvents: workoutDayEvents.data ?? [],
    mealLogs: mealLogs.data ?? [],
    waterLogs: waterLogs.data ?? [],
    xpEvents: xpEvents.data ?? [],
    generationUsage: generationUsage.data ?? [],
    generationFailures: generationFailures.data ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIP PHASE 8.2 — today's real generation usage, read-only, so a Settings
// screen can show a user hitting a 429 *why* ("18 of 20 used today") instead
// of a static cap number. Reads the same generation_usage rows the server
// atomically increments (_shared/usageCap.ts); the caps themselves are
// mirrored client-side in lib/generationCaps.ts since Deno Edge Functions
// and the RN bundle can't share an import.
// ─────────────────────────────────────────────────────────────────────────────

export async function getGenerationUsageToday(userId: string): Promise<{ plan: number; meal: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('generation_usage')
    .select('kind, count')
    .eq('user_id', userId)
    .eq('usage_date', today);

  if (error || !data) return { plan: 0, meal: 0 };

  const usage = { plan: 0, meal: 0 };
  for (const row of data) {
    if (row.kind === 'plan') usage.plan = row.count;
    else if (row.kind === 'meal') usage.meal = row.count;
  }
  return usage;
}

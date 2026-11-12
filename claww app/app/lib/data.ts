import { lastNightSleep } from './sleepTarget';
import type { FoodProfile } from './foodProfile';
import { suggestedWeekdayIndex } from './trainingWeek';
import { computeRecoveryScore, proteinShare } from './engine';
import { invalidateProfile } from './profileStore';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import type { Injury } from './engine';
import { dateKey } from './planStreak';
import { activityKcal, activityMet, OTHER_ACTIVITY_MET } from './activities';
import { computeNutritionSample, type ActivityLevel, type Goal, type NutritionDefaults } from './nutrition';
import { track, AnalyticsEvent } from './analytics';
import type { LoggedSetRow } from './workoutDayState';
import { lastSessionSets, type LastTimeMap } from './sessionPlan';
import { enqueueSet, newClientId } from './setQueueRuntime';
import { mergeById, queuedRowsFor, writeOrQueue } from './writeQueueRuntime';
import { queuePhoto } from './photoQueue';
import { toExerciseForm, type ExerciseForm, type ExerciseFormRow } from './exerciseForm';
import type { ReminderSettings } from './reminderPlan';
import type { DayActivity } from './activityMath';

export { computeNutritionSample, type ActivityLevel, type Goal, type NutritionDefaults } from './nutrition';

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'gym' | 'home' | 'none';
export type Modality = 'strength' | 'cardio' | 'mobility' | 'yoga';

export type SplitPreference = 'auto' | 'full_body' | 'upper_lower' | 'push_pull_legs';

export interface WorkoutDefaults {
  /** NG PHASE 5: days per week asked in setup; generate-plan uses it before the weekday picks. */
  daysPerWeek?: number;
  modalities: Modality[];
  activityLevel: ActivityLevel;
  /** Free-text injuries/limitations (e.g. "bad knees, avoid heavy squats") — feeds the exercise-exclusion filter in generate-plan. */
  injuries?: string;
  /** Real weekday names the user actually picked (e.g. ["Monday","Wednesday"])
   * — when present, generate-plan uses these directly instead of estimating
   * a day count from activity level, and names each generated day after the
   * real weekday instead of a generic "Day 1". Empty/absent falls back to
   * the old activity-based estimate untouched. */
  trainingDays?: string[];
  /** Usual time of day the user trains, "HH:MM" 24-hour (V2 PHASE 6.1); optional. */
  usualTrainingTime?: string;
  /** Polish step 2: how the user likes to train, in the order picked (first is the main style): gym, calisthenics, home, yoga, mobility. */
  styles?: string[];
  /** 'auto' lets the LLM choose within its existing judgment, same as
   * before this existed — the other values are a hard constraint passed
   * into the prompt, not another exercise-picking `suggestion`. */
  splitPreference?: SplitPreference;
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
  /** Polish step 2: the goal picked in onboarding (fat, gain, muscle, strong, fit); the profile goal column keeps the four-value mapping. */
  goalChoice?: string;
  nutritionDefaults?: NutritionDefaults | null;
  dietaryRestrictions?: DietaryRestriction[];
  /** Per-type reminder switches and times (V2 PHASE 3.3); read through normalizeReminderSettings. */
  reminders?: Partial<ReminderSettings>;
  /** Daily steps goal (V2 PHASE 4.2); DEFAULT_STEPS_GOAL when unset. */
  stepsGoal?: number;
  /** Polish step 4: the Burned ring's goal in kcal when the user set one; otherwise derived from the profile (lib/burnGoal.ts). */
  burnedGoal?: number;
  /** Polish step 6: plates the user saved from logged meals (see lib/plates.ts). */
  plates?: unknown[];
  /** NG PHASE 9: the user agreed (Settings, default off) to share scan corrections to train the scanner. */
  scanTraining?: boolean;
  /** Exam week (NG PHASE 12): days in this range neither count toward nor break the plan streak. */
  examWeek?: { from: string; until: string } | null;
  /** Premium F6: planned days the user froze, YYYY-MM-DD. */
  frozenDates?: string[];
  /** Preferred cuisines and foods to avoid (V2 PHASE 5.1). */
  foodProfile?: FoodProfile;
  /** The goal picked for food when the meal plan was last started over (lose, maintain, gain). */
  nutritionGoal?: 'lose' | 'maintain' | 'gain';
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
  rating_prompt_shown_at: string | null;
  /** NG PHASE 2 column; the player's plate math uses it. Null for a profile row written before it existed. */
  bar_weight_kg?: number | null;
  /** NG PHASE 5 setup answers (columns from NG PHASE 2). */
  training_months?: number | null;
  session_minutes?: number | null;
  injuries?: Injury[] | null;
}

const PROFILE_COLUMNS =
  'id, name, email, age, gender, height, weight, goal, experience_level, equipment, personalization_profile, notifications_enabled, notification_prompt_shown_at, rating_prompt_shown_at, bar_weight_kg, training_months, session_minutes, injuries';

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
  invalidateProfile();
  if (error) console.warn('[Claww] Failed to record notification prompt shown:', error.message);
}

/** Saves the per-type reminder settings into personalization_profile.reminders (read-modify-write, like the other JSON fields). */
export async function saveReminderSettings(userId: string, reminders: ReminderSettings): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = { ...(profile?.personalization_profile ?? {}), reminders };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save reminder settings:', error.message);
    return false;
  }
  return true;
}

export async function saveFoodProfile(userId: string, foodProfile: FoodProfile): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = {
    ...(profile?.personalization_profile ?? {}),
    foodProfile: { ...foodProfile, askedAt: foodProfile.askedAt ?? new Date().toISOString() },
  };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save food profile:', error.message);
    return false;
  }
  return true;
}

export async function saveBurnedGoal(userId: string, burnedGoal: number): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = { ...(profile?.personalization_profile ?? {}), burnedGoal };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save burned goal:', error.message);
    return false;
  }
  return true;
}

export async function saveStepsGoal(userId: string, stepsGoal: number): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = { ...(profile?.personalization_profile ?? {}), stepsGoal };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save steps goal:', error.message);
    return false;
  }
  return true;
}

/**
 * Which local days had a sleep, meal or workout log, and which of the three
 * — the same signals getActivityStreak counts — over the last `days` days.
 * Keyed by toDateString, like getActivityStreak.
 */
export async function getActivityDays(userId: string, days = 90): Promise<Map<string, DayActivity>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const iso = since.toISOString();
  const [sleepRes, mealRes, workoutRes] = await Promise.all([
    supabase.from('sleep_logs').select('logged_at').eq('user_id', userId).gte('logged_at', iso),
    supabase.from('meal_logs').select('logged_at').eq('user_id', userId).gte('logged_at', iso),
    supabase.from('workout_logs').select('completed_at').eq('user_id', userId).gte('completed_at', iso),
  ]);
  const out = new Map<string, DayActivity>();
  const mark = (ts: string, key: keyof DayActivity) => {
    const k = new Date(ts).toDateString();
    const cur = out.get(k) ?? { sleep: false, meal: false, workout: false };
    cur[key] = true;
    out.set(k, cur);
  };
  for (const r of sleepRes.data ?? []) mark(r.logged_at, 'sleep');
  for (const r of mealRes.data ?? []) mark(r.logged_at, 'meal');
  for (const r of workoutRes.data ?? []) mark(r.completed_at, 'workout');
  return out;
}

export async function setNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', userId);
  invalidateProfile();
  if (error) console.warn('[Claww] Failed to update notification preference:', error.message);
}

// Item #31 — same one-time-ever gate as setNotificationPromptShown above.
export async function setRatingPromptShown(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ rating_prompt_shown_at: new Date().toISOString() }).eq('id', userId);
  invalidateProfile();
  if (error) console.warn('[Claww] Failed to record rating prompt shown:', error.message);
}

export interface WorkoutIntakeInput {
  /** Only sent when the profile did not have them (or the user edited them). */
  height?: number;
  weight?: number;
  goal: Goal;
  equipment: Equipment;
  daysPerWeek: number;
  /** Months of training: 0 (new), 12 (6 months to 2 years), 36 (2 years and more). */
  trainingMonths: number;
  sessionMinutes: number;
  injuries: Injury[];
}

/** Experience level kept in step with the months trained (older code still reads experience_level). */
export function experienceFromMonths(months: number): ExperienceLevel {
  return months < 6 ? 'beginner' : months < 24 ? 'intermediate' : 'advanced';
}

/**
 * Saves the one-screen workout setup (NG PHASE 5.5): the flat profile columns (goal, equipment, experience,
 * training months, session minutes, structured injuries, and height and weight when given) plus a merge into
 * personalization_profile.workoutDefaults (days per week), which also holds the weekday picks and anything
 * else we must not clobber.
 */
export async function saveWorkoutIntake(userId: string, input: WorkoutIntakeInput): Promise<boolean> {
  const profile = await getProfile(userId);
  const existing = profile?.personalization_profile?.workoutDefaults ?? null;
  const nextPersonalization: PersonalizationProfile = {
    ...(profile?.personalization_profile ?? {}),
    workoutDefaults: {
      modalities: existing?.modalities ?? ['strength'],
      activityLevel: existing?.activityLevel ?? 'moderate',
      ...existing,
      daysPerWeek: input.daysPerWeek,
      // The structured injuries replace the old free text, so the two can't disagree.
      injuries: undefined,
    },
  };

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(input.height ? { height: input.height } : {}),
      ...(input.weight ? { weight: input.weight } : {}),
      goal: input.goal,
      experience_level: experienceFromMonths(input.trainingMonths),
      equipment: input.equipment,
      training_months: input.trainingMonths,
      session_minutes: input.sessionMinutes,
      injuries: input.injuries,
      personalization_profile: nextPersonalization,
    })
    .eq('id', userId);
  invalidateProfile();

  if (error) {
    console.warn('[Claww] Failed to save workout intake:', error.message);
    return false;
  }
  return true;
}

/** The weekday picks that follow the setup screen (V2 PHASE 6.1), merged into workoutDefaults. */
export async function saveTrainingSchedule(userId: string, trainingDays: string[], usualTrainingTime?: string): Promise<boolean> {
  const profile = await getProfile(userId);
  const existing = profile?.personalization_profile?.workoutDefaults ?? null;
  const next: PersonalizationProfile = {
    ...(profile?.personalization_profile ?? {}),
    workoutDefaults: {
      modalities: existing?.modalities ?? ['strength'],
      activityLevel: existing?.activityLevel ?? 'moderate',
      ...existing,
      trainingDays: trainingDays.length ? trainingDays : undefined,
      usualTrainingTime: usualTrainingTime || undefined,
    },
  };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save training schedule:', error.message);
    return false;
  }
  return true;
}

/** Height, weight and age as typed in nutrition setup; saved to the profile with the targets. */
export interface ProfileBasicsInput {
  height?: number | null;
  weight?: number | null;
  age?: number | null;
}

export async function saveNutritionTargets(
  userId: string,
  targets: NutritionDefaults,
  dietaryRestrictions?: DietaryRestriction[],
  basics?: ProfileBasicsInput,
  /** Extra settings saved with the targets, such as the goal picked for food when starting the meal plan over. */
  extra?: Partial<PersonalizationProfile>
): Promise<boolean> {
  const profile = await getProfile(userId);
  const nextPersonalization: PersonalizationProfile = {
    ...(profile?.personalization_profile ?? {}),
    ...(extra ?? {}),
    nutritionDefaults: targets,
    dietaryRestrictions: dietaryRestrictions ?? profile?.personalization_profile?.dietaryRestrictions,
  };

  // NG PHASE 2: the targets were calculated from these, so the profile must hold the same numbers.
  // Before this, nutrition setup used what was typed but never saved it, and the next setup
  // pre-filled the old values.
  const positive = (v: number | null | undefined) => (typeof v === 'number' && v > 0 ? v : undefined);
  const basicsUpdate = {
    ...(positive(basics?.height) ? { height: positive(basics?.height) } : {}),
    ...(positive(basics?.weight) ? { weight: positive(basics?.weight) } : {}),
    ...(positive(basics?.age) ? { age: Math.round(positive(basics?.age)!) } : {}),
  };

  const { error } = await supabase
    .from('profiles')
    .update({ personalization_profile: nextPersonalization, ...basicsUpdate })
    .eq('id', userId);
  invalidateProfile();

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

/**
 * Last night's sleep (polish step 1): the log whose wake time is today, else the most recent one within 18 hours
 * (`lastNightSleep`). The old "logged since midnight" check disagreed with the Tracker whenever a night was entered
 * the evening before, so this is now the single definition everywhere.
 */
export async function getLastNightSleep(userId: string): Promise<SleepLogRow | null> {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('hours, bedtime, wake_time, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false });
  if (error) {
    console.warn("[Claww] Failed to load last night's sleep:", error.message);
    return null;
  }
  return lastNightSleep(data ?? [], new Date());
}

export async function getRecentSleepLogs(userId: string, days = 7): Promise<SleepLogRow[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('hours, bedtime, wake_time, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false });
  if (error) {
    console.warn('[Claww] Failed to load recent sleep logs:', error.message);
    return [];
  }
  return data ?? [];
}

export async function insertSleepLog(userId: string, hours: number, bedtime: Date, wakeTime: Date): Promise<boolean> {
  // NG PHASE 14: stored on the phone first, sent from there; XP is awarded when it is really saved.
  const id = newClientId();
  const outcome = await writeOrQueue(id, {
    op: 'insert',
    table: 'sleep_logs',
    userId,
    row: { id, user_id: userId, hours, bedtime: bedtime.toISOString(), wake_time: wakeTime.toISOString(), logged_at: new Date().toISOString() },
    xp: { amount: 10, reason: 'sleep_logged' },
  });
  if (outcome === 'failed') console.warn('[Claww] The server refused this sleep log.');
  return outcome !== 'failed';
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery score
//
// Client-side port of supabase/functions/_shared/recovery.ts's formula, so
// Home can show a real score today without depending on that Edge Function
// being deployed yet. Once it is deployed, generate-plan will use the
// server-side version for plan generation; this stays as Home's quick read.
// Keep this formula in sync with that file by hand — same documented
// constraint as EQUIPMENT_TIERS above (Deno Edge Functions and the RN
// bundle can't share an import).
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryResult {
  score: number;
  band: 'Low' | 'Moderate' | 'High';
}

/** Returns null when there's no sleep log yet — nothing to compute a score from. */
export async function getRecoveryScore(userId: string): Promise<RecoveryResult | null> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [sleepLog, workoutLogResult, mealsResult, profile] = await Promise.all([
    getLastNightSleep(userId),
    supabase
      .from('workout_logs')
      .select('sets, reps_achieved, reps_prescribed, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('meal_logs').select('protein_g').eq('user_id', userId).gte('logged_at', last24h),
    getProfile(userId),
  ]);
  if (!sleepLog) return null;
  const pct = proteinShare(mealsResult.data, profile?.personalization_profile?.nutritionDefaults?.protein_g ?? null);
  return computeRecoveryScore(sleepLog, workoutLogResult.data, pct === null ? null : { proteinPct: pct });
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
  /** Path into the private meal-photos Storage bucket, not a usable URL —
   * see getSignedMealPhotoUrl. NULL for text-only logs. */
  photo_url: string | null;  /** NG PHASE 8 columns; absent until docs/ng-pending-2.sql is applied. */
  plan_status?: 'as_planned' | 'swapped' | 'extra' | 'skipped' | null;
  items?: { food: string; unit: string; qty: number; grams: number }[] | null;
  nutrients?: MealNutrients | null;
  /** NG PHASE 9: where, how oily and what size, when the meal came from the scanner. */
  context?: { place: string; oil: string; portion: string } | null;
}

export interface MealNutrients {
  fibreG?: number | null;
  ironMg?: number | null;
  calciumMg?: number | null;
  vitcMg?: number | null;
  b12Ug?: number | null;
  sodiumMg?: number | null;
}

export async function getTodaysMealLogs(userId: string): Promise<MealLogRow[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const base = 'id, description, calories, protein_g, carbs_g, fats_g, estimated, meal_type, logged_at, photo_url';
  let res = await supabase.from('meal_logs').select(`${base}, plan_status, items, nutrients`).eq('user_id', userId).gte('logged_at', startOfDay.toISOString()).order('logged_at', { ascending: true });
  if (res.error) {
    // The NG PHASE 8 columns may not exist yet (docs/ng-pending-2.sql): read the old set.
    res = (await supabase.from('meal_logs').select(base).eq('user_id', userId).gte('logged_at', startOfDay.toISOString()).order('logged_at', { ascending: true })) as unknown as typeof res;
  }
  if (res.error) {
    console.warn('[Claww] Failed to load meal logs:', res.error.message);
  }
  // Meals still waiting to be sent (offline) count as logged.
  const queued = ((await queuedRowsFor('meal_logs', userId)) as unknown as MealLogRow[]).filter((r) => r.logged_at >= startOfDay.toISOString());
  return mergeById(res.error ? [] : ((res.data ?? []) as unknown as MealLogRow[]), queued).sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

export interface NutritionSummary {
  /** Real average across days that actually had a meal logged in the last
   * 7 days — not divided by 7 unconditionally, which would understate a
   * user who only started logging 2 days ago. */
  avgDailyCalories: number;
  daysLoggedLast7: number;
  mealsLoggedThisMonth: number;
}

/** Tracker had zero nutrition content before this — every stat here is a
 * real aggregate over meal_logs, not a fabricated number. */
export async function getNutritionSummary(userId: string): Promise<NutritionSummary> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [weekRes, monthRes] = await Promise.all([
    supabase.from('meal_logs').select('calories, logged_at').eq('user_id', userId).gte('logged_at', sevenDaysAgo.toISOString()),
    supabase.from('meal_logs').select('logged_at').eq('user_id', userId).gte('logged_at', startOfMonth.toISOString()),
  ]);

  const weekRows = weekRes.data ?? [];
  const dayTotals = new Map<string, number>();
  for (const row of weekRows) {
    const day = new Date(row.logged_at).toDateString();
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + (row.calories ?? 0));
  }
  const daysLoggedLast7 = dayTotals.size;
  const avgDailyCalories = daysLoggedLast7 > 0 ? Math.round([...dayTotals.values()].reduce((s, c) => s + c, 0) / daysLoggedLast7) : 0;

  const monthDays = new Set((monthRes.data ?? []).map((row) => new Date(row.logged_at).toDateString()));

  return { avgDailyCalories, daysLoggedLast7, mealsLoggedThisMonth: monthDays.size };
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
  /** Set when a photo was captured/reused for this meal — a Storage path (see uploadMealPhoto), not a URL. */
  photoPath?: string | null;
  /** NG PHASE 8: how it was logged, what it was made of and its micronutrients (from the food database). */
  planStatus?: 'as_planned' | 'swapped' | 'extra' | 'skipped';
  items?: { food: string; unit: string; qty: number; grams: number }[];
  nutrients?: MealNutrients;
  context?: { place: string; oil: string; portion: string };
}

export interface EstimateResult {
  ok: boolean;
  meal?: EstimatedMeal;
  reason?: string;
}

export interface RemainingMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export type SuggestRefine = 'more_protein' | 'quicker' | 'something_else';

/** One of the (up to) three options the suggest-meal function returns (V2 PHASE 5.2). */
export interface MealSuggestion extends EstimatedMeal {
  prep_minutes: number;
  /** One line written by deterministic code from the numbers. */
  why: string;
  bestFit: boolean;
}

export interface SuggestMealsInput {
  mealType: MealType;
  preference: string;
  dietaryRestrictions: DietaryRestriction[];
  goal: string | null;
  cuisines: string[];
  avoid: string;
  eatenToday: string[];
  trainedToday: boolean;
  remaining?: RemainingMacros;
  refine?: SuggestRefine;
}

export interface SuggestMealsResult {
  options: MealSuggestion[];
  /** True when the function was unreachable or returned nothing usable and a generic per-meal-type estimate is shown instead. */
  generic: boolean;
}

/**
 * Asks the suggest-meal Edge Function for three ranked options. Falls back
 * to one generic per-meal-type estimate (the same table estimateMeal uses),
 * honestly marked `generic`, if the function is unreachable or fails.
 */
export async function suggestMeals(input: SuggestMealsInput): Promise<SuggestMealsResult> {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-meal', {
      body: {
        mealType: input.mealType,
        preference: input.preference,
        dietaryRestrictions: input.dietaryRestrictions,
        goal: input.goal ?? '',
        cuisines: input.cuisines,
        avoid: input.avoid,
        eatenToday: input.eatenToday,
        trainedToday: input.trainedToday,
        refine: input.refine,
        remaining: input.remaining,
      },
    });
    if (!error && data && Array.isArray(data.options) && data.options.length > 0) {
      track(AnalyticsEvent.MealEstimated, { generated: true, source: 'suggestion' });
      return { options: data.options as MealSuggestion[], generic: false };
    }
  } catch {
    // Edge Function not deployed / unreachable — fall through to a generic suggestion.
  }

  track(AnalyticsEvent.MealEstimated, { generated: false, source: 'suggestion' });
  const f = FALLBACK_MEAL_MACROS[input.mealType];
  return {
    options: [
      {
        description: `${input.mealType} suggestion`,
        calories: f.calories,
        protein_g: f.protein_g,
        carbs_g: f.carbs_g,
        fats_g: f.fats_g,
        prep_minutes: 15,
        why: 'A typical portion for this meal.',
        bestFit: true,
      },
    ],
    generic: true,
  };
}

/** Whether any workout set was logged today (local day) — one input to meal suggestions. */
export async function didTrainToday(userId: string): Promise<boolean> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('workout_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString());
  return !error && (count ?? 0) > 0;
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
  const core = {
    user_id: userId,
    description: meal.description,
    calories: Math.round(meal.calories),
    protein_g: Math.round(meal.protein_g),
    carbs_g: Math.round(meal.carbs_g),
    fats_g: Math.round(meal.fats_g),
    estimated: true,
    meal_type: mealType,
    photo_url: meal.photoPath ?? null,
  };
  const extras = {
    ...(meal.planStatus ? { plan_status: meal.planStatus } : {}),
    ...(meal.items ? { items: meal.items } : {}),
    ...(meal.nutrients ? { nutrients: meal.nutrients } : {}),
    ...(meal.context ? { context: meal.context } : {}),
  };
  // NG PHASE 14: the meal is stored on the phone first with its own id and sent from there, so a bad signal or airplane
  // mode loses nothing; the columns an older database lacks are dropped on the way. XP is awarded when it is really saved.
  const id = newClientId();
  const loggedAt = new Date().toISOString();
  const outcome = await writeOrQueue(id, {
    op: 'insert',
    table: 'meal_logs',
    userId,
    row: { id, ...core, logged_at: loggedAt },
    optional: extras,
    xp: meal.planStatus !== 'skipped' ? { amount: 10, reason: 'meal_logged' } : undefined,
  });
  if (outcome === 'failed') {
    console.warn('[Claww] The server refused this meal log.');
    return null;
  }
  // A skipped meal (NG PHASE 10 catch-up) is an answer, not a meal: no meal event.
  if (meal.planStatus !== 'skipped') track(AnalyticsEvent.MealLogged, { meal_type: mealType });
  return {
    id,
    description: core.description,
    calories: core.calories,
    protein_g: core.protein_g,
    carbs_g: core.carbs_g,
    fats_g: core.fats_g,
    estimated: true,
    meal_type: mealType,
    logged_at: loggedAt,
    photo_url: core.photo_url,
    ...extras,
  } as MealLogRow;
}

/** Deletes one meal log (the one-tap Undo after logging a usual). */
export async function deleteMealLog(userId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from('meal_logs').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    console.warn('[Claww] Failed to delete meal log:', error.message);
    return false;
  }
  return true;
}

/**
 * Changes a logged meal (its meal type, name, numbers and, when given, its items and micronutrients). Returns the
 * changed fields, or null when nothing was changed: no connection, or the meal has not reached the server yet.
 */
export async function updateMealLog(userId: string, id: string, mealType: MealType, meal: EstimatedMeal): Promise<Partial<MealLogRow> | null> {
  const core = {
    description: meal.description,
    calories: Math.round(meal.calories),
    protein_g: Math.round(meal.protein_g),
    carbs_g: Math.round(meal.carbs_g),
    fats_g: Math.round(meal.fats_g),
    meal_type: mealType,
  };
  const extras = {
    ...(meal.items ? { items: meal.items } : {}),
    ...(meal.nutrients ? { nutrients: meal.nutrients } : {}),
  };
  let res = await supabase.from('meal_logs').update({ ...core, ...extras }).eq('id', id).eq('user_id', userId).select('id');
  // An older database without the items and nutrients columns: change the rest.
  if (res.error && Object.keys(extras).length > 0) res = await supabase.from('meal_logs').update(core).eq('id', id).eq('user_id', userId).select('id');
  if (res.error || !res.data || res.data.length === 0) {
    console.warn('[Claww] Failed to change the meal log:', res.error?.message ?? 'no row matched');
    return null;
  }
  return { ...core, ...extras } as Partial<MealLogRow>;
}

/** Meals logged in [startIso, endIso), oldest first, with the NG PHASE 8 columns when they exist. */
export async function getMealLogsBetween(userId: string, startIso: string, endIso: string): Promise<MealLogRow[]> {
  const base = 'id, description, calories, protein_g, carbs_g, fats_g, estimated, meal_type, logged_at, photo_url';
  let res = await supabase.from('meal_logs').select(`${base}, plan_status, items, nutrients`).eq('user_id', userId).gte('logged_at', startIso).lt('logged_at', endIso).order('logged_at', { ascending: true });
  if (res.error) {
    res = (await supabase.from('meal_logs').select(base).eq('user_id', userId).gte('logged_at', startIso).lt('logged_at', endIso).order('logged_at', { ascending: true })) as unknown as typeof res;
  }
  if (res.error) {
    console.warn('[Claww] Failed to load meals for the diary:', res.error.message);
  }
  const queued = ((await queuedRowsFor('meal_logs', userId)) as unknown as MealLogRow[]).filter((r) => r.logged_at >= startIso && r.logged_at < endIso);
  return mergeById(res.error ? [] : ((res.data ?? []) as unknown as MealLogRow[]), queued).sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

/** Meals from the last `days` days, newest first, for "your usuals". */
export async function getRecentMeals(userId: string, days = 14): Promise<MealLogRow[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('meal_logs')
    .select('id, description, calories, protein_g, carbs_g, fats_g, estimated, meal_type, logged_at, photo_url')
    .eq('user_id', userId)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })
    .limit(300);
  if (error) {
    console.warn('[Claww] Failed to load recent meals:', error.message);
    return [];
  }
  return (data ?? []) as MealLogRow[];
}

// ─── NG PHASE 13: weight over time ───────────────────────────────────────────────────────────────────────────

export interface WeightLog {
  weightKg: number;
  loggedAt: string;
}

/** Weight entries from the last `days` days, oldest first. Empty (not an error) until weight_logs exists. */
export async function getWeightLogs(userId: string, days = 90): Promise<WeightLog[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase.from('weight_logs').select('weight_kg, logged_at').eq('user_id', userId).gte('logged_at', since).order('logged_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({ weightKg: Number(r.weight_kg), loggedAt: r.logged_at as string }));
}

/** Saves a weight and keeps the profile's weight current (setups and calorie targets read it). */
export async function logWeight(userId: string, weightKg: number): Promise<boolean> {
  const { error } = await supabase.from('weight_logs').insert({ user_id: userId, weight_kg: weightKg });
  const profileUpdate = await supabase.from('profiles').update({ weight: weightKg }).eq('id', userId);
  invalidateProfile();
  if (profileUpdate.error) console.warn('[Claww] Failed to update profile weight:', profileUpdate.error.message);
  if (error) {
    console.warn('[Claww] Failed to log weight (is weight_logs applied?):', error.message);
    return !profileUpdate.error; // the profile weight still moved
  }
  return true;
}

const MEAL_PHOTOS_BUCKET = 'meal-photos';

/**
 * Item #22 — a meal photo was previously sent to Groq for estimation and
 * then discarded; never stored anywhere. Uploads to a private bucket
 * (RLS-scoped to "<user_id>/..." — see schema.sql) so a later "you ate
 * this before" suggestion can reuse it without asking for the photo
 * again. Returns the Storage PATH, not a public URL (the bucket isn't
 * public) — display goes through getSignedMealPhotoUrl.
 */
export async function uploadMealPhoto(userId: string, base64: string, mimeType: string): Promise<string | null> {
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
  // The path is chosen here, so the meal can point at it before the file is there (NG PHASE 14: no signal keeps the photo on
  // the phone and uploads it later to this same path; the thumbnail shows the meal's icon until then).
  const path = `${userId}/${newClientId()}.${ext}`;
  const { error } = await supabase.storage.from(MEAL_PHOTOS_BUCKET).upload(path, decode(base64), { contentType: mimeType, upsert: true });
  if (error) {
    console.warn('[Claww] Meal photo not uploaded yet, kept on the phone:', error.message);
    await queuePhoto({ userId, path, base64, mimeType, attempts: 0 });
  }
  return path;
}

/** A short-lived (1h) signed URL for a photo path — the bucket is private, so nothing displays it without one. */
export async function getSignedMealPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(MEAL_PHOTOS_BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.warn('[Claww] Failed to sign meal photo URL:', error.message);
    return null;
  }
  return data.signedUrl;
}

/** Past photographed meals, most recent first — the raw material for
 * "log this again" suggestions on meal-log.tsx. Capped at 20; this is a
 * quick-pick list, not a full history browser. */
export async function getMealPhotoHistory(userId: string): Promise<MealLogRow[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('id, description, calories, protein_g, carbs_g, fats_g, estimated, meal_type, logged_at, photo_url')
    .eq('user_id', userId)
    .not('photo_url', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(20);
  if (error) {
    console.warn('[Claww] Failed to load meal photo history:', error.message);
    return [];
  }
  return data ?? [];
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
  /** Reps left in the tank, 0-3 (3 means 3 or more); undefined when the user didn't say. */
  rir?: number | null;
  sessionId?: string | null;
  /** NG PHASE 3.6: set for a timed block; reps and weight are 0 then. */
  durationMinutes?: number | null;
  distanceKm?: number | null;
}

/** Last session's sets for each of these exercises (most recent calendar day each), for the player's "last time" column and weight prefill. */
export async function getLastTimeSets(userId: string, exerciseNames: string[]): Promise<LastTimeMap> {
  if (exerciseNames.length === 0) return {};
  const { data, error } = await supabase
    .from('workout_logs')
    .select('exercise_name, sets, reps_achieved, reps_prescribed, weight_achieved, weight_prescribed, completed_at')
    .eq('user_id', userId)
    .in('exercise_name', exerciseNames)
    .order('completed_at', { ascending: false })
    .limit(300);
  if (error) {
    console.warn('[Claww] Failed to load last-time sets:', error.message);
    return {};
  }
  return lastSessionSets(data ?? []);
}

/**
 * Form-guide content per exercise name (form steps, common mistake,
 * muscles). The catalog columns arrive in V2 PHASE 6.2; until then the
 * query fails with "column does not exist" and this quietly returns {}, so
 * the form strip simply doesn't render.
 */
export async function getExerciseForms(exerciseNames: string[]): Promise<Record<string, ExerciseForm>> {
  if (exerciseNames.length === 0) return {};
  const { data, error } = await supabase
    .from('exercises')
    .select('name, primary_muscle, secondary_muscles, form_steps, common_mistake')
    .in('name', exerciseNames);
  if (error) {
    if (error.code !== '42703' && error.code !== 'PGRST204') console.warn('[Claww] Failed to load form guides:', error.message);
    return {};
  }
  const out: Record<string, ExerciseForm> = {};
  for (const row of (data ?? []) as (ExerciseFormRow & { name: string })[]) {
    const form = toExerciseForm(row);
    if (form) out[row.name] = form;
  }
  return out;
}

/**
 * Logs one completed set (see WorkoutSessionProvider). It goes into the
 * on-device queue first (lib/setQueueRuntime.ts) and is sent from there, so a
 * set done with no signal is saved once the network is back instead of
 * lost. XP (5 per set) is awarded when the row is actually inserted.
 */
export async function logWorkoutSet(userId: string, log: WorkoutSetInput): Promise<boolean> {
  await enqueueSet(newClientId(), {
    user_id: userId,
    exercise_id: log.exerciseId ?? null,
    exercise_name: log.exerciseName,
    sets: log.setNumber,
    reps_prescribed: log.repsPrescribed,
    reps_achieved: log.repsAchieved,
    weight_prescribed: log.weightPrescribed,
    weight_achieved: log.weightAchieved,
    set_number: log.setNumber,
    rir: log.rir ?? null,
    session_id: log.sessionId ?? null,
    ...(log.durationMinutes ? { duration_minutes: log.durationMinutes } : {}),
    // Only when entered, so a session without a distance never depends on the new column.
    ...(log.distanceKm ? { distance_km: log.distanceKm } : {}),
    completed_at: new Date().toISOString(),
  });
  return true;
}

// Equipment tiers, duplicated from supabase/functions/_shared/planning.ts —
// Deno Edge Functions and the RN bundle can't share an import (same
// documented reason as lib/generationCaps.ts vs the server-side cap
// values), so this must stay in sync with that file by hand.
const EQUIPMENT_TIERS: Record<string, string[]> = {
  none: ['none'],
  home: ['none', 'home'],
  gym: ['none', 'home', 'gym'],
};

export interface CatalogExercise {
  id: string;
  name: string;
  modality: Modality;
  muscle_group: string | null;
  equipment: string | null;
}

/**
 * Item #18 — "user should manually be able to add workouts, selecting from
 * a real dataset". Queries the same exercises catalog generate-plan uses,
 * scoped to the user's own equipment tier (no showing gym-only moves to a
 * bodyweight-only user) and optionally a modality (cardio vs strength, for
 * item #17's ad-hoc session logging).
 */
export async function searchExercises(query: string, equipment: Equipment, modality?: Modality): Promise<CatalogExercise[]> {
  const allowed = EQUIPMENT_TIERS[equipment] ?? EQUIPMENT_TIERS.gym;
  let q = supabase.from('exercises').select('id, name, modality, muscle_group, equipment').in('equipment', allowed).limit(30);
  if (modality) q = q.eq('modality', modality);
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`);
  const { data, error } = await q.order('name', { ascending: true });
  if (error) {
    console.warn('[Claww] Failed to search exercises:', error.message);
    return [];
  }
  return data ?? [];
}

/** Appends an exercise to a specific day of an already-generated plan — the
 * manual-add counterpart to generation, item #18. Read-modify-write on the
 * plan JSON since there's no per-exercise row to insert into. */
export async function addExerciseToDay(workoutId: string, dayIndex: number, exercise: PlanExercise): Promise<boolean> {
  const { data: workout, error: fetchError } = await supabase.from('workouts').select('plan').eq('id', workoutId).single();
  if (fetchError || !workout) {
    console.warn('[Claww] Failed to load workout for manual exercise add:', fetchError?.message);
    return false;
  }
  const plan = workout.plan as WorkoutPlan;
  const day = plan.days[dayIndex];
  if (!day) return false;
  day.exercises = [...day.exercises, exercise];

  const { error } = await supabase.from('workouts').update({ plan }).eq('id', workoutId);
  if (error) {
    console.warn('[Claww] Failed to save manually added exercise:', error.message);
    return false;
  }
  return true;
}

export interface AdHocSessionInput {
  exerciseName: string;
  exerciseId?: string | null;
  modality: Modality;
  /** Strength: reps/weight for one set. Cardio: durationMinutes instead — never both, matches which fields are actually meaningful for the modality. */
  reps?: number;
  weight?: number;
  durationMinutes?: number;
}

/**
 * Item #17 — logging a cardio/strength session that isn't part of the
 * generated plan (e.g. an extra run). Writes directly to workout_logs so it
 * counts toward streak/volume/completed-workout-days exactly like a
 * planned set does (those queries just read workout_logs generally) — not
 * a separate, second-class log table.
 */
export async function logAdHocSession(userId: string, input: AdHocSessionInput): Promise<boolean> {
  const { error } = await supabase.from('workout_logs').insert({
    user_id: userId,
    exercise_id: input.exerciseId ?? null,
    exercise_name: input.exerciseName,
    sets: 1,
    reps_achieved: input.reps ?? null,
    weight_achieved: input.weight ?? null,
    duration_minutes: input.durationMinutes ?? null,
  });
  if (error) {
    console.warn('[Claww] Failed to log ad-hoc session:', error.message);
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

/**
 * Total reps x weight lifted, all-time — achieved where logged, prescribed
 * otherwise (pre-migration rows have no achieved value yet).
 *
 * BUG FIXED: this used to multiply each row by `row.sets`, but `sets` on
 * workout_logs holds the SET NUMBER within an exercise (1, 2, 3...), not a
 * count — logWorkoutSet inserts one row per completed set with
 * `sets: log.setNumber` (see schema.sql's own comment on the column). Each
 * row already IS one set, so multiplying by its set number inflated later
 * sets: a 4-set exercise's volume came out as (1+2+3+4)x too high instead
 * of the true 4x. Found while investigating a cofounder report that
 * Tracker's volume/progress numbers looked wrong.
 */
export async function getTotalVolume(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('reps_achieved, reps_prescribed, weight_achieved, weight_prescribed')
    .eq('user_id', userId);
  if (error) {
    console.warn('[Claww] Failed to load workout volume:', error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => {
    const reps = row.reps_achieved ?? row.reps_prescribed ?? 0;
    const weight = row.weight_achieved ?? row.weight_prescribed ?? 0;
    return sum + reps * weight;
  }, 0);
}

export interface TodayWorkoutStats {
  volume: number;
  setsCompleted: number;
  calorieBurn: number;
}

/** Population-average MET for general resistance training (ACSM tables,
 * "weight lifting, general") — used only when a set's exercise has no
 * met_value in the catalog, same fallback posture as
 * estimateCaloriesFromSteps' weight default. */
const DEFAULT_STRENGTH_MET = 5.0;
/** No prior set to measure a real gap from — a single flat estimate for
 * just that first set, not compounded into every later set's real delta. */
const FIRST_SET_ASSUMED_SECONDS = 60;

/**
 * Today's volume, set count, and a real calorie-burn estimate — for the
 * Workouts tab's daily stat board (previously nothing existed here at
 * all, see the calorie-burn gap called out directly in the cofounder's
 * report).
 *
 * Calorie burn is MET_value * weight_kg * hours, using the ACTUAL elapsed
 * time between consecutive completed_at timestamps for the day as the
 * duration for each set (genuinely measured, not a guessed flat rate per
 * set) — matches the "no fake precision" standard the rest of the app
 * holds itself to (see getTotalVolume's fix above, in the same spirit).
 */
export async function getTodayWorkoutStats(userId: string, weightKg: number | null): Promise<TodayWorkoutStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('workout_logs')
    .select('exercise_name, duration_minutes, reps_achieved, reps_prescribed, weight_achieved, weight_prescribed, completed_at, exercises(met_value)')
    .eq('user_id', userId)
    .gte('completed_at', startOfDay.toISOString())
    .order('completed_at', { ascending: true });
  if (error) {
    console.warn('[Claww] Failed to load today\'s workout stats:', error.message);
    return { volume: 0, setsCompleted: 0, calorieBurn: 0 };
  }
  const rows = data ?? [];
  const weight = weightKg ?? 70; // same population-average fallback as estimateCaloriesFromSteps

  let volume = 0;
  let calorieBurn = 0;
  let prevTime: number | null = null;
  for (const row of rows) {
    const reps = row.reps_achieved ?? row.reps_prescribed ?? 0;
    const w = row.weight_achieved ?? row.weight_prescribed ?? 0;
    volume += reps * w;

    const catalogMet = (row as unknown as { exercises: { met_value: number | null } | null }).exercises?.met_value ?? null;
    // A timed row (a logged activity, a cardio block) burns by its duration, not by the gap between sets.
    if (row.duration_minutes) {
      calorieBurn += activityKcal(catalogMet ?? activityMet(row.exercise_name) ?? OTHER_ACTIVITY_MET, row.duration_minutes, weight);
      continue;
    }
    const met = catalogMet ?? DEFAULT_STRENGTH_MET;
    const thisTime = new Date(row.completed_at).getTime();
    const seconds = prevTime === null ? FIRST_SET_ASSUMED_SECONDS : Math.min(600, (thisTime - prevTime) / 1000); // cap at 10min so a paused/abandoned session doesn't blow up the estimate
    calorieBurn += met * weight * (seconds / 3600);
    prevTime = thisTime;
  }

  return { volume, setsCompleted: rows.length, calorieBurn: Math.round(calorieBurn) };
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
  /** NG PHASE 5 columns; absent until they are applied. */
  blueprint_id?: string | null;
  block_number?: number | null;
  block_week?: number | null;
}

export async function getLatestWorkout(userId: string): Promise<WorkoutRow | null> {
  let res = await supabase
    .from('workouts')
    .select('id, plan, created_at, blueprint_id, block_number, block_week')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) {
    // The block columns may not exist yet (database/schema.sql, NG PHASE 5): ask for the old set.
    res = (await supabase.from('workouts').select('id, plan, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()) as typeof res;
  }
  if (res.error) {
    console.warn('[Claww] Failed to load latest workout:', res.error.message);
    return null;
  }
  return res.data as WorkoutRow | null;
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
  eventDate: string; // YYYY-MM-DD — the server's UTC date; prefer createdAt for anything local-time
  createdAt: string;
}

function mapDayEventRow(row: {
  id: string;
  workout_id: string | null;
  day_label: string;
  day_focus: string | null;
  status: WorkoutDayStatus;
  event_date: string;
  created_at: string;
}): WorkoutDayEvent {
  return {
    id: row.id,
    workoutId: row.workout_id,
    dayLabel: row.day_label,
    dayFocus: row.day_focus,
    status: row.status,
    eventDate: row.event_date,
    createdAt: row.created_at,
  };
}

export async function logWorkoutDayEvent(
  userId: string,
  workoutId: string,
  dayLabel: string,
  dayFocus: string,
  status: WorkoutDayStatus,
  /** When the session started. A session that runs past midnight belongs to the day it began, not the day it ended. */
  at?: Date
): Promise<boolean> {
  const { error } = await supabase.from('workout_day_events').insert({
    user_id: userId,
    workout_id: workoutId,
    day_label: dayLabel,
    day_focus: dayFocus,
    status,
    ...(at ? { created_at: at.toISOString(), event_date: at.toISOString().slice(0, 10) } : {}),
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
    .select('id, workout_id, day_label, day_focus, status, event_date, created_at')
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
    .select('id, workout_id, day_label, day_focus, status, event_date, created_at')
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
export function getSuggestedDayIndex(plan: WorkoutPlan, recentEventsDesc: WorkoutDayEvent[], now: Date = new Date()): number {
  // A plan on real weekdays suggests today's day, or the next planned one (V2 PHASE 6.1).
  const byWeekday = suggestedWeekdayIndex(plan.days.map((d) => d.day), now);
  if (byWeekday !== null) return byWeekday;
  if (recentEventsDesc.length === 0 || plan.days.length === 0) return 0;
  const mostRecent = recentEventsDesc[0];
  const lastIndex = plan.days.findIndex((d) => d.day === mostRecent.dayLabel);
  if (lastIndex === -1) return 0;
  return (lastIndex + 1) % plan.days.length;
}

/**
 * The sets logged for one completed plan day. workout_logs has no session
 * id, so a session is the sets of that day's exercises logged on the same
 * local calendar day as the "completed" event. The event's own timestamp
 * is used rather than event_date, which is the server's UTC date and lands
 * on the previous day for sessions finished early in the morning in India.
 */
export async function getDaySessionLogs(userId: string, completedAt: string, exerciseNames: string[]): Promise<LoggedSetRow[]> {
  if (exerciseNames.length === 0) return [];
  const start = new Date(completedAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const { data, error } = await supabase
    .from('workout_logs')
    .select('exercise_name, sets, reps_achieved, reps_prescribed, weight_achieved, weight_prescribed, completed_at')
    .eq('user_id', userId)
    .in('exercise_name', exerciseNames)
    .gte('completed_at', start.toISOString())
    .lt('completed_at', end.toISOString())
    .order('completed_at', { ascending: true });
  if (error) {
    console.warn('[Claww] Failed to load session sets:', error.message);
    return [];
  }
  return data ?? [];
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
  const [sleepRes, mealRes, workoutRes] = await Promise.all([
    supabase.from('sleep_logs').select('logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(120),
    supabase.from('meal_logs').select('logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(120),
    supabase.from('workout_logs').select('completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(120),
  ]);

  const days = new Set<string>();
  for (const row of [...(sleepRes.data ?? []), ...(mealRes.data ?? [])]) {
    days.add(new Date(row.logged_at).toDateString());
  }
  for (const row of workoutRes.data ?? []) {
    days.add(new Date(row.completed_at).toDateString());
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
  }
  const queued = (await queuedRowsFor('water_logs', userId)).filter((r) => String(r.logged_at) >= startOfDay.toISOString());
  return [...(error ? [] : (data ?? [])), ...queued].reduce((sum: number, row) => sum + Number((row as { ml: number }).ml), 0);
}

export async function logWater(userId: string, ml: number): Promise<boolean> {
  return (await logWaterEntry(userId, ml)) !== null;
}

/** Same as logWater, but returns the new entry's id (null on failure) so the add can be undone from a toast. */
export async function logWaterEntry(userId: string, ml: number): Promise<string | null> {
  // NG PHASE 14: stored on the phone first, sent from there; an id means it is saved or safely waiting.
  const id = newClientId();
  const outcome = await writeOrQueue(id, { op: 'insert', table: 'water_logs', userId, row: { id, user_id: userId, ml, logged_at: new Date().toISOString() } });
  if (outcome === 'failed') console.warn('[Claww] The server refused this water log.');
  return outcome !== 'failed' ? id : null;
}

export interface WaterLogRow {
  id: string;
  ml: number;
  logged_at: string;
}

/** Today's individual water entries, newest first (V2 PHASE 4.3's log with undo). */
export async function getTodaysWaterLogs(userId: string): Promise<WaterLogRow[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('water_logs')
    .select('id, ml, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString())
    .order('logged_at', { ascending: false });
  if (error) {
    console.warn('[Claww] Failed to load water entries:', error.message);
  }
  const queued = ((await queuedRowsFor('water_logs', userId)) as unknown as WaterLogRow[]).filter((r) => r.logged_at >= startOfDay.toISOString());
  return mergeById(error ? [] : (data ?? []), queued).sort((a, b) => b.logged_at.localeCompare(a.logged_at));
}

/** Undo one water entry. RLS limits it to the user's own rows. */
export async function deleteWaterLog(id: string): Promise<boolean> {
  const { error } = await supabase.from('water_logs').delete().eq('id', id);
  if (error) {
    console.warn('[Claww] Failed to undo water entry:', error.message);
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
  /** What it takes, shown under a badge that isn't earned yet. */
  need: string;
}

/** `planStreak` is the one streak the app shows (plan days followed); without it the old activity streak is used. */
export async function getAchievements(userId: string, planStreak?: number): Promise<Achievement[]> {
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

  const days = planStreak ?? streak;
  // Tiers, so there is always a next badge to aim for.
  return [
    { id: 'first_steps', icon: 'footprints', label: 'First steps', color: '#00D68F', earned: sleepCount + mealCount + workoutCount > 0, need: 'Log anything' },
    { id: 'planner', icon: 'dumbbell', label: 'Planner', color: '#3B82F6', earned: workoutCount >= 1, need: 'Build a plan' },
    { id: 'week_warrior', icon: 'flame', label: 'Week warrior', color: '#FF4500', earned: days >= 7, need: '7-day streak' },
    { id: 'month_strong', icon: 'flame', label: 'Month strong', color: '#FF4500', earned: days >= 30, need: '30-day streak' },
    { id: 'nourished', icon: 'salad', label: 'Nourished', color: '#22C55E', earned: mealCount >= 10, need: 'Log 10 meals' },
    { id: 'well_fed', icon: 'salad', label: 'Well fed', color: '#22C55E', earned: mealCount >= 100, need: 'Log 100 meals' },
    { id: 'consistent', icon: 'moon', label: 'Rested', color: '#6366F1', earned: sleepCount >= 5, need: 'Log 5 nights' },
    { id: 'sleep_month', icon: 'moon', label: 'Sleep habit', color: '#6366F1', earned: sleepCount >= 30, need: 'Log 30 nights' },
    { id: 'night_owl', icon: 'moon', label: 'Night owl', color: '#6366F1', earned: hasNightOwlSleep, need: 'Bed after 11 pm' },
    { id: 'legend', icon: 'trophy', label: 'CLAWW legend', color: '#EC4899', earned: xp >= 500, need: '500 XP' },
    { id: 'legend_2', icon: 'trophy', label: 'CLAWW legend II', color: '#EC4899', earned: xp >= 2500, need: '2,500 XP' },
    { id: 'legend_3', icon: 'zap', label: 'CLAWW legend III', color: '#A855F7', earned: xp >= 10000, need: '10,000 XP' },
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
  pushTokens: unknown[];
  pushSends: unknown[];
  exerciseProgress: unknown[];
  muscleCheckins: unknown[];
  prescriptionDecisions: unknown[];
  userResources: unknown | null;
  weightLogs: unknown[];
  mealPlanDays: unknown[];
  scanCorrections: unknown[];
  penMarks: unknown[];
  progressPhotos: unknown[];
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
    pushTokens,
    pushSends,
    exerciseProgress,
    muscleCheckins,
    prescriptionDecisions,
    userResources,
    weightLogs,
    mealPlanDays,
    scanCorrections,
    penMarks,
    progressPhotos,
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
    supabase.from('push_tokens').select('*').eq('user_id', userId),
    supabase.from('push_sends').select('*').eq('user_id', userId),
    supabase.from('exercise_progress').select('*').eq('user_id', userId),
    supabase.from('muscle_checkins').select('*').eq('user_id', userId),
    supabase.from('prescription_decisions').select('*').eq('user_id', userId),
    supabase.from('user_resources').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('weight_logs').select('*').eq('user_id', userId),
    supabase.from('meal_plan_days').select('*').eq('user_id', userId),
    supabase.from('scan_corrections').select('*').eq('user_id', userId),
    supabase.from('pen_marks').select('*').eq('user_id', userId),
    supabase.from('progress_photos').select('*').eq('user_id', userId),
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
    pushTokens: pushTokens.data ?? [],
    pushSends: pushSends.data ?? [],
    exerciseProgress: exerciseProgress.data ?? [],
    muscleCheckins: muscleCheckins.data ?? [],
    prescriptionDecisions: prescriptionDecisions.data ?? [],
    userResources: userResources.data ?? null,
    weightLogs: weightLogs.data ?? [],
    mealPlanDays: mealPlanDays.data ?? [],
    scanCorrections: scanCorrections.data ?? [],
    penMarks: penMarks.data ?? [],
    progressPhotos: progressPhotos.data ?? [],
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


// ─────────────────────────────────────────────────────────────────────────────
// NG PHASE 12 — streak inputs
// ─────────────────────────────────────────────────────────────────────────────

/** Local dates (YYYY-MM-DD) on which a session was completed, across every plan, for the last `days` days. */
export async function getCompletedSessionDates(userId: string, days = 120): Promise<string[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('workout_day_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', since);
  if (error) {
    console.warn('[Claww] Failed to load completed session dates:', error.message);
    return [];
  }
  return Array.from(new Set((data ?? []).map((r) => dateKey(new Date(r.created_at as string)))));
}

export async function saveFrozenDates(userId: string, dates: string[]): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = { ...(profile?.personalization_profile ?? {}), frozenDates: dates.slice(-60) };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save streak freeze:', error.message);
    return false;
  }
  return true;
}

export async function saveExamWeek(userId: string, week: { from: string; until: string } | null): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = { ...(profile?.personalization_profile ?? {}), examWeek: week };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save exam week:', error.message);
    return false;
  }
  return true;
}


/** Logs a sport or walk from the Workouts activity card: counts for calories and recovery, never as a plan day. */
export async function logActivity(userId: string, name: string, minutes: number): Promise<boolean> {
  return logAdHocSession(userId, { exerciseName: name.trim().slice(0, 40) || 'Activity', modality: 'cardio', durationMinutes: minutes });
}


export interface LoggedActivity {
  name: string;
  minutes: number;
  loggedAt: string;
  kcal: number;
}

/** Timed sessions and activities logged in the last `days` days (not plan days), newest first, with an estimated burn. */
export async function getRecentActivities(userId: string, weightKg: number | null, days = 7): Promise<LoggedActivity[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('workout_logs')
    .select('exercise_name, duration_minutes, completed_at, exercises(met_value)')
    .eq('user_id', userId)
    .not('duration_minutes', 'is', null)
    .gt('duration_minutes', 0)
    .gte('completed_at', since)
    .order('completed_at', { ascending: false })
    .limit(20);
  if (error) {
    console.warn('[Claww] Failed to load activities:', error.message);
    return [];
  }
  const weight = weightKg ?? 70;
  return (data ?? []).map((r) => {
    const catalogMet = (r as unknown as { exercises: { met_value: number | null } | null }).exercises?.met_value ?? null;
    const minutes = Number(r.duration_minutes);
    return { name: r.exercise_name as string, minutes, loggedAt: r.completed_at as string, kcal: activityKcal(catalogMet ?? activityMet(r.exercise_name as string) ?? OTHER_ACTIVITY_MET, minutes, weight) };
  });
}


/** The Settings switch "Help improve the scanner". Default off; stored with the rest of the personalization profile. */
export async function saveScanTraining(userId: string, on: boolean): Promise<boolean> {
  const profile = await getProfile(userId);
  const next: PersonalizationProfile = { ...(profile?.personalization_profile ?? {}), scanTraining: on };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save the scanner training choice:', error.message);
    return false;
  }
  return true;
}

export interface SleepLogRow {
  hours: number | null;
}

export interface WorkoutLogRow {
  sets: number | null;
  reps_achieved: number | null;
  reps_prescribed: number | null;
  completed_at: string;
}

/** Today's total logged water, in ml — real data.ts getTodaysWaterMl() output, not fabricated. */
export interface HydrationInfo {
  waterMl: number;
}

/** Whether ANY meal was logged today — a presence signal ("are you tracking
 * intake at all"), not a claim about nutritional quality, which nothing in
 * this app can honestly assess. */
export interface NutritionInfo {
  loggedMealToday: boolean;
}

export interface RecoveryResult {
  score: number;
  band: 'Low' | 'Moderate' | 'High';
}

const WATER_TARGET_ML = 2000; // matches WaterWidget.tsx's own target

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * workout_logs has no explicit intensity/RPE column, so this derives a 0-10
 * intensity proxy from the last session's set*rep volume. Swap this out if
 * an explicit intensity field gets added later.
 */
function estimateSessionIntensity(workoutLog: WorkoutLogRow | null): number {
  if (!workoutLog) return 0;
  const reps = workoutLog.reps_achieved ?? workoutLog.reps_prescribed ?? 0;
  const volume = (workoutLog.sets ?? 0) * reps;
  return clamp(volume / 10, 0, 10);
}

/**
 * Extended per a direct request to cover the cofounder's fuller definition
 * of recovery ("getting enough sleep, eating nutritious food, staying
 * hydrated, taking rest days, doing light activity") — the pre-existing
 * formula covered sleep and rest-days-since-last-session only. Hydration
 * and a nutrition-logging signal are added as real, DB-backed terms, same
 * "don't trust the model, ground it" posture as generate-plan's own
 * thresholds. Light activity (steps/walking) is deliberately NOT added —
 * step data lives only on-device (lib/steps.ts, Health Connect/Core
 * Motion), nothing persists it server-side for this Edge Function to read,
 * so adding a term for it would mean fabricating a number. Revisit if
 * steps ever get written to the DB.
 *
 * recovery_score = clamp(sleep_score + recovery_gap - fatigue_penalty
 *                        + hydration_score + nutrition_score + 20, 0, 100)
 *   sleep_score     = min(sleep_hours / 8, 1) * 35
 *   recovery_gap    = min(hours_since_last_session / 24, 1) * 25 (25 if no prior session)
 *   fatigue_penalty = last_session_intensity * 3
 *   hydration_score = min(water_ml_today / 2000, 1) * 10
 *   nutrition_score = logged_meal_today ? 10 : 0
 *
 * Ceiling check: 35+25+10+10+20 = 100 (perfect everything, zero fatigue).
 * Floor check: 0+0-30+0+0+20 = -10 -> clamps to 0 (max fatigue, nothing else).
 */
export function computeRecoveryScore(
  sleepLog: SleepLogRow | null,
  workoutLog: WorkoutLogRow | null,
  hydration?: HydrationInfo | null,
  nutrition?: NutritionInfo | null
): RecoveryResult {
  const sleepHours = sleepLog?.hours ?? 0;
  const sleepScore = Math.min(sleepHours / 8, 1) * 35;

  let recoveryGap = 25; // no prior session on record -> full recovery credit
  if (workoutLog?.completed_at) {
    const hoursSinceLastSession =
      (Date.now() - new Date(workoutLog.completed_at).getTime()) / (1000 * 60 * 60);
    recoveryGap = Math.min(Math.max(hoursSinceLastSession, 0) / 24, 1) * 25;
  }

  const fatiguePenalty = estimateSessionIntensity(workoutLog) * 3;
  const hydrationScore = Math.min(Math.max(hydration?.waterMl ?? 0, 0) / WATER_TARGET_ML, 1) * 10;
  const nutritionScore = nutrition?.loggedMealToday ? 10 : 0;

  const score = clamp(sleepScore + recoveryGap - fatiguePenalty + hydrationScore + nutritionScore + 20, 0, 100);
  const band: RecoveryResult['band'] = score < 40 ? 'Low' : score <= 70 ? 'Moderate' : 'High';

  return { score: Math.round(score), band };
}

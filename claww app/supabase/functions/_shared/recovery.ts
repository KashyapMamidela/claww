export interface SleepLogRow {
  hours: number | null;
}

export interface WorkoutLogRow {
  sets: number | null;
  reps_achieved: number | null;
  reps_prescribed: number | null;
  completed_at: string;
}

/** Protein eaten over the last 24 hours as a share of the user's target (1 = hit it). Only passed when it is actually known. */
export interface ProteinInfo {
  proteinPct: number;
}

export interface RecoveryResult {
  score: number;
  band: 'Low' | 'Moderate' | 'High';
}

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
 * Whole-body recovery (V2 PHASE 7.5, decision D7). Water and "a meal was
 * logged" no longer count: the inputs are sleep, protein against target,
 * time since the last session and how hard that session was.
 *
 * recovery_score = clamp(sleep_score + recovery_gap - fatigue_penalty
 *                        + protein_score + 20, 0, 100)
 *   sleep_score     = min(sleep_hours / 8, 1) * 40
 *   recovery_gap    = min(hours_since_last_session / 24, 1) * 25 (25 if no prior session)
 *   fatigue_penalty = last_session_intensity * 3
 *   protein_score   = min(protein_pct, 1) * 15
 *
 * Ceiling check: 40+25+15+20 = 100. Floor: 0+0-30+0+20 = -10 -> clamps to 0.
 *
 * Protein is left out, not guessed, when it is unknown (no target set, or
 * nothing logged in the last 24 h): the other terms are then scaled by their
 * own ceiling of 85, so the score is still out of 100.
 */
export function computeRecoveryScore(
  sleepLog: SleepLogRow | null,
  workoutLog: WorkoutLogRow | null,
  protein?: ProteinInfo | null
): RecoveryResult {
  const sleepHours = sleepLog?.hours ?? 0;
  const sleepScore = Math.min(sleepHours / 8, 1) * 40;

  let recoveryGap = 25; // no prior session on record -> full recovery credit
  if (workoutLog?.completed_at) {
    const hoursSinceLastSession =
      (Date.now() - new Date(workoutLog.completed_at).getTime()) / (1000 * 60 * 60);
    recoveryGap = Math.min(Math.max(hoursSinceLastSession, 0) / 24, 1) * 25;
  }

  const fatiguePenalty = estimateSessionIntensity(workoutLog) * 3;

  let score: number;
  if (protein && Number.isFinite(protein.proteinPct)) {
    const proteinScore = Math.min(Math.max(protein.proteinPct, 0), 1) * 15;
    score = clamp(sleepScore + recoveryGap - fatiguePenalty + proteinScore + 20, 0, 100);
  } else {
    score = clamp(((sleepScore + recoveryGap - fatiguePenalty + 20) / 85) * 100, 0, 100);
  }
  const band: RecoveryResult['band'] = score < 40 ? 'Low' : score <= 70 ? 'Moderate' : 'High';

  return { score: Math.round(score), band };
}

/**
 * Protein over the last 24 h as a share of the target, or null when it cannot
 * be known: no target, or no meals logged (zero would read as "ate no protein",
 * which is a guess, not data).
 */
export function proteinShare(meals: { protein_g: number | null }[] | null | undefined, targetG: number | null | undefined): number | null {
  if (!targetG || targetG <= 0 || !meals || meals.length === 0) return null;
  return meals.reduce((sum, m) => sum + (m.protein_g ?? 0), 0) / targetG;
}

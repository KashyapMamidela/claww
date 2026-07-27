export interface SleepLogRow {
  hours: number | null;
}

export interface WorkoutLogRow {
  sets: number | null;
  reps: number | null;
  completed_at: string;
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
  const volume = (workoutLog.sets ?? 0) * (workoutLog.reps ?? 0);
  return clamp(volume / 10, 0, 10);
}

/**
 * recovery_score = clamp(sleep_score + recovery_gap - fatigue_penalty + 30, 0, 100)
 *   sleep_score     = min(sleep_hours / 8, 1) * 40
 *   recovery_gap    = min(hours_since_last_session / 24, 1) * 30
 *   fatigue_penalty = last_session_intensity * 3
 */
export function computeRecoveryScore(
  sleepLog: SleepLogRow | null,
  workoutLog: WorkoutLogRow | null
): RecoveryResult {
  const sleepHours = sleepLog?.hours ?? 0;
  const sleepScore = Math.min(sleepHours / 8, 1) * 40;

  let recoveryGap = 30; // no prior session on record -> full recovery credit
  if (workoutLog?.completed_at) {
    const hoursSinceLastSession =
      (Date.now() - new Date(workoutLog.completed_at).getTime()) / (1000 * 60 * 60);
    recoveryGap = Math.min(Math.max(hoursSinceLastSession, 0) / 24, 1) * 30;
  }

  const fatiguePenalty = estimateSessionIntensity(workoutLog) * 3;

  const score = clamp(sleepScore + recoveryGap - fatiguePenalty + 30, 0, 100);
  const band: RecoveryResult['band'] = score < 40 ? 'Low' : score <= 70 ? 'Moderate' : 'High';

  return { score: Math.round(score), band };
}

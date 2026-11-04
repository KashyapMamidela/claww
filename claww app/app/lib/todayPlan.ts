// NG PHASE 12: what the engine would prescribe for a plan day right now (no check-ins), so Home and Workouts can
// show the marks before the session starts. Same inputs and same prescribeDay as the session start flow.

import { getProfile, type WorkoutRow } from './data';
import { computeRepRange } from './engine';
import { getCatalog, getExerciseProgress, getLastWeights, getRecentLoggedSets, getRecoveryInputs } from './adaptiveData';
import { muscleScores, musclesForExercises } from './muscleRecovery';
import { prescribeDay, type PrescribedExercise } from './sessionPrescription';

export async function loadDayPrescription(userId: string, workout: WorkoutRow, dayIndex: number): Promise<PrescribedExercise[]> {
  const day = workout.plan.days[dayIndex];
  if (!day) return [];
  const names = day.exercises.map((e) => e.name);
  const [catalog, progress, lastWeights, recentSets, recovery, profile] = await Promise.all([
    getCatalog(names),
    getExerciseProgress(userId, names),
    getLastWeights(userId, names),
    getRecentLoggedSets(userId),
    getRecoveryInputs(userId),
    getProfile(userId),
  ]);
  const range = computeRepRange(profile?.goal ?? null, profile?.experience_level ?? null, profile?.age ?? null);
  const muscles = musclesForExercises(names, catalog);
  const scores = muscleScores(muscles, recentSets, catalog, new Date());
  return prescribeDay({
    exercises: day.exercises,
    catalog,
    progress,
    range,
    muscleScores: scores,
    sleepHours: recovery.sleepHours,
    proteinPct: recovery.proteinPct,
    lastWeights,
  });
}

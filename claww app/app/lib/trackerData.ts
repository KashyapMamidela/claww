// Supabase access for the Tracker (V2 PHASE 9). Fetches a year of raw rows once
// and lets lib/trackerMath.ts do all the arithmetic, so switching a chart's
// range never refetches.

import { supabase } from './supabase';
import { getProfile } from './data';
import { getCatalog, getRecentLoggedSets } from './adaptiveData';
import { MAJOR_MUSCLES, muscleScores, type Catalog, type MuscleScore } from './muscleRecovery';
import { DEFAULT_STEPS_GOAL } from './activityMath';
import { toTrainLogs, type MealRow, type SleepRow, type TrainLog } from './trackerMath';

export interface TrackerData {
  logs: TrainLog[];
  catalog: Catalog;
  meals: MealRow[];
  sleep: SleepRow[];
  proteinTargetG: number | null;
  weightKg: number | null;
  stepsGoal: number;
  /** Per-muscle recovery right now. */
  recovery: Record<string, MuscleScore>;
}

const YEAR_MS = 365 * 24 * 3_600_000;

export async function loadTrackerData(userId: string): Promise<TrackerData> {
  const since = new Date(Date.now() - YEAR_MS).toISOString();
  const [setsRes, mealsRes, sleepRes, profile, recentSets] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('exercise_name, reps_achieved, reps_prescribed, weight_achieved, weight_prescribed, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', since)
      .order('completed_at', { ascending: false })
      .limit(5000),
    supabase.from('meal_logs').select('calories, protein_g, logged_at').eq('user_id', userId).gte('logged_at', since).limit(4000),
    supabase.from('sleep_logs').select('hours, logged_at').eq('user_id', userId).gte('logged_at', since).limit(1000),
    getProfile(userId),
    getRecentLoggedSets(userId),
  ]);

  const logs = toTrainLogs(setsRes.data ?? []);
  const names = Array.from(new Set([...logs.map((l) => l.exerciseName), ...recentSets.map((s) => s.exerciseName)]));
  const catalog = await getCatalog(names);

  return {
    logs,
    catalog,
    meals: (mealsRes.data ?? []) as MealRow[],
    sleep: (sleepRes.data ?? []) as SleepRow[],
    proteinTargetG: profile?.personalization_profile?.nutritionDefaults?.protein_g ?? null,
    weightKg: profile?.weight ?? null,
    stepsGoal: profile?.personalization_profile?.stepsGoal ?? DEFAULT_STEPS_GOAL,
    recovery: muscleScores(MAJOR_MUSCLES, recentSets, catalog, new Date()),
  };
}

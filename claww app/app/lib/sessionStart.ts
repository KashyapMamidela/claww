// What a session needs from the adaptive engine, loaded and applied without a screen in the way (V2 PHASE 7.1/7.2,
// moved out of a full-screen flow into the Tracker's "Adaptive" card). Begin Workout now starts straight away with the
// engine's prescription; the optional soreness and readiness answers are given in the Tracker card and kept for the
// day on the phone, then saved with the session.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, type WorkoutRow } from './data';
import { computeRepRange } from './engine';
import type { ExerciseState as EngineState, RepRange } from './engine';
import { getCatalog, getExerciseProgress, getLastWeights, getRecentLoggedSets, getRecoveryInputs, saveCheckins, savePrescriptions } from './adaptiveData';
import { catalogKey, muscleScores, musclesForExercises, type Catalog, type Checkin, type LoggedSet, type MuscleScore } from './muscleRecovery';
import { prescribeDay, type PrescribedExercise } from './sessionPrescription';
import { getKeepPlanNames } from './penData';
import { dateKey } from './planStreak';
import { newClientId } from './setQueueRuntime';

export interface Bundle {
  catalog: Catalog;
  progress: Record<string, EngineState>;
  lastWeights: Record<string, number>;
  recentSets: LoggedSet[];
  sleepHours: number | null;
  proteinPct: number | null;
  range: RepRange;
  muscles: string[];
  /** Exercises the user chose "Use my old plan" for today. */
  keepPlan: Set<string>;
}

/** What a session needs from the engine: its id and every exercise's prescription. */
export interface SessionStart {
  sessionId: string;
  prescribed: PrescribedExercise[];
  /** The workout with each managed exercise's sets and reps replaced by today's prescription (in memory only; the saved plan is untouched). */
  workout: WorkoutRow;
}

export function applyPrescriptions(workout: WorkoutRow, dayIndex: number, prescribed: PrescribedExercise[]): WorkoutRow {
  const byName = new Map(prescribed.map((p) => [p.name, p]));
  const days = workout.plan.days.map((d, i) =>
    i !== dayIndex
      ? d
      : {
          ...d,
          exercises: d.exercises.map((ex) => {
            const p = byName.get(ex.name);
            return p && p.managed ? { ...ex, sets: p.prescription.sets, reps: p.prescription.reps } : ex;
          }),
        }
  );
  return { ...workout, plan: { ...workout.plan, days } };
}

/** The engine's inputs for one plan day, or null when it has nothing to say (a cardio-only day, or no catalog metadata yet). */
export async function loadBundle(userId: string, workout: WorkoutRow, dayIndex: number): Promise<Bundle | null> {
  const day = workout.plan.days[dayIndex];
  if (!day) return null;
  const names = day.exercises.map((e) => e.name);
  const [catalog, progress, lastWeights, recentSets, recovery, profile, keepPlan] = await Promise.all([
    getCatalog(names),
    getExerciseProgress(userId, names),
    getLastWeights(userId, names),
    getRecentLoggedSets(userId),
    getRecoveryInputs(userId),
    getProfile(userId),
    getKeepPlanNames(userId, dateKey(new Date())).catch(() => new Set<string>()),
  ]);
  const managed = names.some((n) => {
    const c = catalog[catalogKey(n)];
    return c && c.modality === 'strength' && c.primaryMuscle && c.loadable !== null;
  });
  if (!managed) return null;
  const range = computeRepRange(profile?.goal ?? null, profile?.experience_level ?? null, profile?.age ?? null);
  const muscles = musclesForExercises(names, catalog);
  return { catalog, progress, lastWeights, recentSets, sleepHours: recovery.sleepHours, proteinPct: recovery.proteinPct, range, muscles, keepPlan };
}

/** Muscle scores and prescriptions for a day, given the optional check-ins. Pure. */
export function planDayFor(bundle: Bundle, workout: WorkoutRow, dayIndex: number, checkins: Record<string, Checkin>): { scores: Record<string, MuscleScore>; prescribed: PrescribedExercise[] } {
  const day = workout.plan.days[dayIndex];
  const scores = muscleScores(bundle.muscles, bundle.recentSets, bundle.catalog, new Date(), checkins);
  const prescribed = day
    ? prescribeDay({
        exercises: day.exercises,
        catalog: bundle.catalog,
        progress: bundle.progress,
        range: bundle.range,
        muscleScores: scores,
        sleepHours: bundle.sleepHours,
        proteinPct: bundle.proteinPct,
        lastWeights: bundle.lastWeights,
        keepPlan: bundle.keepPlan,
      })
    : [];
  return { scores, prescribed };
}

// ─── Today's check-ins (kept on the phone for the day) ──────────────────────────────────────────────────────

const checkinKey = () => `claww:checkins:${dateKey(new Date())}`;

export async function getTodayCheckins(): Promise<Record<string, Checkin>> {
  try {
    const raw = await AsyncStorage.getItem(checkinKey());
    return raw ? (JSON.parse(raw) as Record<string, Checkin>) : {};
  } catch {
    return {};
  }
}

export async function setTodayCheckins(checkins: Record<string, Checkin>): Promise<void> {
  try {
    await AsyncStorage.setItem(checkinKey(), JSON.stringify(checkins));
  } catch {
    // the answers are optional; losing them only lowers the confidence of today's score
  }
}

/**
 * Begin Workout: loads the engine's inputs, uses today's optional check-ins, saves them and the prescriptions with a new
 * session id, and returns what the session needs. Null when the engine has nothing to say: start with the plan as it is.
 */
export async function beginSession(userId: string, workout: WorkoutRow, dayIndex: number): Promise<SessionStart | null> {
  const bundle = await loadBundle(userId, workout, dayIndex);
  if (!bundle) return null;
  const checkins = await getTodayCheckins();
  const { prescribed } = planDayFor(bundle, workout, dayIndex, checkins);
  const sessionId = newClientId();
  saveCheckins(userId, sessionId, checkins).catch(() => {});
  savePrescriptions(userId, sessionId, prescribed).catch(() => {});
  return { sessionId, prescribed, workout: applyPrescriptions(workout, dayIndex, prescribed) };
}

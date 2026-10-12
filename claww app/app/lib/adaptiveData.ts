// Supabase access for the adaptive engine (V2 PHASE 7). Everything here fails
// soft: before database/schema.sql's V2 PHASE 6 block is applied the catalog
// and progress queries return nothing, every exercise reads as unmanaged and
// the app behaves exactly as it did before the engine existed.

import { supabase } from './supabase';
import { getProfile, getTodaysSleepLog } from './data';
import { initialState, proteinShare, type Command, type ExerciseState as EngineState, type Readiness } from './engine';
import { catalogKey, type Catalog, type CatalogEntry, type Checkin, type LoggedSet } from './muscleRecovery';
import type { PrescribedExercise, SessionOutcome } from './sessionPrescription';

const MISSING_SCHEMA = new Set(['42703', 'PGRST204', '42P01', 'PGRST205']);

function warn(what: string, error: { code?: string; message: string }) {
  if (!error.code || !MISSING_SCHEMA.has(error.code)) console.warn(`[Claww] ${what}:`, error.message);
}

// ─── Catalog ────────────────────────────────────────────────────────────────

interface CatalogRow {
  id: string;
  name: string;
  modality: string;
  equipment: string | null;
  primary_muscle: string | null;
  secondary_muscles: string[] | null;
  movement_pattern: string | null;
  role: string | null;
  loadable: boolean | null;
  stimulus_type: string | null;
  load_increment_kg: number | string | null;
  harder_variation_id: string | null;
  easier_variation_id: string | null;
}

const CATALOG_COLUMNS =
  'id, name, modality, equipment, primary_muscle, secondary_muscles, movement_pattern, role, loadable, stimulus_type, load_increment_kg, harder_variation_id, easier_variation_id';

function toEntry(r: CatalogRow, namesById: Record<string, string>): CatalogEntry {
  return {
    id: r.id,
    name: r.name,
    modality: r.modality,
    equipment: r.equipment,
    primaryMuscle: r.primary_muscle,
    secondaryMuscles: r.secondary_muscles ?? [],
    movementPattern: r.movement_pattern,
    role: r.role === 'main' || r.role === 'accessory' ? r.role : null,
    loadable: r.loadable,
    stimulusType: r.stimulus_type,
    loadIncrementKg: r.load_increment_kg === null ? null : Number(r.load_increment_kg),
    harderVariationName: r.harder_variation_id ? namesById[r.harder_variation_id] ?? null : null,
    easierVariationName: r.easier_variation_id ? namesById[r.easier_variation_id] ?? null : null,
  };
}

/** Catalog metadata for these exercise names (and, for the variation links, their names), keyed by lowercase name. */
export async function getCatalog(names: string[]): Promise<Catalog> {
  if (names.length === 0) return {};
  const { data, error } = await supabase.from('exercises').select(CATALOG_COLUMNS).in('name', names);
  if (error) {
    warn('Failed to load the exercise catalog', error);
    return {};
  }
  const rows = (data ?? []) as CatalogRow[];
  const variationIds = Array.from(new Set(rows.flatMap((r) => [r.harder_variation_id, r.easier_variation_id]).filter((x): x is string => !!x)));
  const namesById: Record<string, string> = {};
  if (variationIds.length > 0) {
    const { data: vars } = await supabase.from('exercises').select('id, name').in('id', variationIds);
    for (const v of vars ?? []) namesById[v.id] = v.name;
  }
  return Object.fromEntries(rows.map((r) => [catalogKey(r.name), toEntry(r, namesById)]));
}

// ─── exercise_progress ──────────────────────────────────────────────────────

interface ProgressRow {
  exercise_name: string;
  rep_min: number;
  rep_max: number;
  rep_target: number;
  working_weight_kg: number | string | null;
  sets: number;
  top_streak: number;
  failure_streak: number;
  success_cycles: number;
  decline_cycles: number;
  stagnant_sessions: number;
  last_weight_kg: number | string | null;
  last_rep_target: number | null;
  last_sets: number | null;
  pending_commands: string[] | null;
  pending_reason: string | null;
  last_session_date: string | null;
}

const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

export function progressFromRow(r: ProgressRow): EngineState {
  const base = initialState({ repMin: r.rep_min, repMax: r.rep_max, startReps: r.rep_target, sets: r.sets, weightKg: num(r.working_weight_kg) });
  return {
    ...base,
    last: r.last_rep_target === null ? null : { weightKg: num(r.last_weight_kg), repTarget: r.last_rep_target, sets: r.last_sets ?? r.sets },
    topStreak: r.top_streak,
    failureStreak: r.failure_streak,
    successCycles: r.success_cycles,
    declineStreak: r.decline_cycles,
    stagnantSessions: r.stagnant_sessions ?? 0,
    lastSessionDate: r.last_session_date,
    pendingCommands: (r.pending_commands ?? []) as Command[],
    pendingReason: r.pending_reason ?? '',
  };
}

export function progressToRow(userId: string, name: string, exerciseId: string | undefined, s: EngineState) {
  return {
    user_id: userId,
    exercise_name: name,
    exercise_id: exerciseId ?? null,
    rep_min: s.repMin,
    rep_max: s.repMax,
    rep_target: s.next.repTarget,
    working_weight_kg: s.next.weightKg,
    sets: s.next.sets,
    top_streak: s.topStreak,
    failure_streak: s.failureStreak,
    success_cycles: s.successCycles,
    decline_cycles: s.declineStreak,
    stagnant_sessions: s.stagnantSessions,
    last_weight_kg: s.last?.weightKg ?? null,
    last_rep_target: s.last?.repTarget ?? null,
    last_sets: s.last?.sets ?? null,
    pending_commands: s.pendingCommands,
    pending_reason: s.pendingReason,
    last_session_date: s.lastSessionDate,
    updated_at: new Date().toISOString(),
  };
}

export async function getExerciseProgress(userId: string, names: string[]): Promise<Record<string, EngineState>> {
  if (names.length === 0) return {};
  const { data, error } = await supabase.from('exercise_progress').select('*').eq('user_id', userId).in('exercise_name', names);
  if (error) {
    warn('Failed to load exercise progress', error);
    return {};
  }
  return Object.fromEntries(((data ?? []) as ProgressRow[]).map((r) => [catalogKey(r.exercise_name), progressFromRow(r)]));
}

export async function saveExerciseProgress(userId: string, name: string, exerciseId: string | undefined, state: EngineState): Promise<boolean> {
  const { error } = await supabase.from('exercise_progress').upsert(progressToRow(userId, name, exerciseId, state), { onConflict: 'user_id,exercise_name' });
  if (error) {
    warn('Failed to save exercise progress', error);
    return false;
  }
  return true;
}

// ─── Logs, sleep and protein ────────────────────────────────────────────────

/** Sets logged in the last `hours`, for the per-muscle fatigue and time parts. */
export async function getRecentLoggedSets(userId: string, hours = 96): Promise<LoggedSet[]> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await supabase.from('workout_logs').select('exercise_name, completed_at, rir').eq('user_id', userId).gte('completed_at', since);
  if (error) {
    // `rir` does not exist until the V2 PHASE 6 schema is applied: retry without it.
    if (error.code === '42703') {
      const retry = await supabase.from('workout_logs').select('exercise_name, completed_at').eq('user_id', userId).gte('completed_at', since);
      return (retry.data ?? []).map((r) => ({ exerciseName: r.exercise_name, completedAt: r.completed_at, rir: null }));
    }
    warn('Failed to load recent sets', error);
    return [];
  }
  return (data ?? []).map((r) => ({ exerciseName: r.exercise_name, completedAt: r.completed_at, rir: r.rir ?? null }));
}

/** Heaviest weight used in each exercise's most recent logged session. */
export async function getLastWeights(userId: string, names: string[]): Promise<Record<string, number>> {
  if (names.length === 0) return {};
  const { data, error } = await supabase
    .from('workout_logs')
    .select('exercise_name, weight_achieved, weight_prescribed, completed_at')
    .eq('user_id', userId)
    .in('exercise_name', names)
    .order('completed_at', { ascending: false })
    .limit(300);
  if (error) {
    warn('Failed to load last weights', error);
    return {};
  }
  const latestDay: Record<string, string> = {};
  const out: Record<string, number> = {};
  for (const r of data ?? []) {
    const key = catalogKey(r.exercise_name);
    const day = new Date(r.completed_at).toDateString();
    if (latestDay[key] === undefined) latestDay[key] = day;
    if (latestDay[key] !== day) continue;
    const w = r.weight_achieved ?? r.weight_prescribed ?? 0;
    if (w > 0 && (out[key] === undefined || w > out[key])) out[key] = w;
  }
  return out;
}

/**
 * Last night's sleep hours (today's log) and protein over the last 24 hours as
 * a share of the target. Either is null when unknown: no log, no target, or
 * no meals logged (zero would read as "ate no protein", which is a guess,
 * not data).
 */
export async function getRecoveryInputs(userId: string): Promise<{ sleepHours: number | null; proteinPct: number | null }> {
  const [sleep, profile] = await Promise.all([getTodaysSleepLog(userId), getProfile(userId)]);
  const target = profile?.personalization_profile?.nutritionDefaults?.protein_g ?? null;
  let proteinPct: number | null = null;
  if (target && target > 0) {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data, error } = await supabase.from('meal_logs').select('protein_g').eq('user_id', userId).gte('logged_at', since);
    if (!error) proteinPct = proteinShare(data, target);
  }
  return { sleepHours: sleep?.hours ?? null, proteinPct };
}

// ─── Check-ins and decisions ────────────────────────────────────────────────

export async function saveCheckins(userId: string, sessionId: string, checkins: Record<string, Checkin>): Promise<boolean> {
  const rows = Object.entries(checkins)
    .filter(([, c]) => c.soreness !== null || c.readiness !== null)
    .map(([muscle, c]) => ({ user_id: userId, session_id: sessionId, muscle, soreness: c.soreness, readiness: c.readiness as Readiness | null }));
  if (rows.length === 0) return true;
  const { error } = await supabase.from('muscle_checkins').insert(rows);
  if (error) {
    warn('Failed to save muscle check-ins', error);
    return false;
  }
  return true;
}

export async function savePrescriptions(userId: string, sessionId: string, prescribed: PrescribedExercise[]): Promise<boolean> {
  const rows = prescribed
    .filter((p) => p.managed)
    .map((p) => ({
      user_id: userId,
      session_id: sessionId,
      exercise_name: p.name,
      prescribed_weight: p.prescription.weightKg,
      prescribed_reps: p.prescription.reps,
      prescribed_sets: p.prescription.sets,
      commands: p.prescription.commands,
      reason: p.prescription.reason,
      phase: 'prescribed',
    }));
  if (rows.length === 0) return true;
  const { error } = await supabase.from('prescription_decisions').insert(rows);
  if (error) {
    warn('Failed to save prescriptions', error);
    return false;
  }
  return true;
}

/** Saves each exercise's new engine state and the decision for next time. */
export async function saveSessionOutcomes(userId: string, sessionId: string, outcomes: SessionOutcome[]): Promise<void> {
  await Promise.all(outcomes.map((o) => saveExerciseProgress(userId, o.name, o.exerciseId, o.evaluation.state)));
  const rows = outcomes.map((o) => ({
    user_id: userId,
    session_id: sessionId,
    exercise_name: o.name,
    prescribed_weight: o.evaluation.state.next.weightKg,
    prescribed_reps: o.evaluation.state.next.repTarget,
    prescribed_sets: o.evaluation.state.next.sets,
    commands: o.evaluation.commands,
    reason: o.evaluation.reason,
    phase: 'result',
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('prescription_decisions').insert(rows);
  if (error) warn('Failed to save session decisions', error);
}

export interface NextTimeDecision {
  exerciseName: string;
  commands: Command[];
  reason: string;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
}

/** "What changed for next time" for a finished day: the result decisions saved between these timestamps. */
export async function getNextTimeDecisions(userId: string, fromIso: string, toIso: string, names: string[]): Promise<NextTimeDecision[]> {
  if (names.length === 0) return [];
  const { data, error } = await supabase
    .from('prescription_decisions')
    .select('exercise_name, commands, reason, prescribed_weight, prescribed_reps, prescribed_sets, created_at')
    .eq('user_id', userId)
    .eq('phase', 'result')
    .in('exercise_name', names)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .order('created_at', { ascending: true });
  if (error) {
    warn('Failed to load next-time decisions', error);
    return [];
  }
  const latest = new Map<string, NextTimeDecision>();
  for (const r of data ?? []) {
    latest.set(r.exercise_name, {
      exerciseName: r.exercise_name,
      commands: (r.commands ?? []) as Command[],
      reason: r.reason ?? '',
      weightKg: num(r.prescribed_weight),
      reps: r.prescribed_reps,
      sets: r.prescribed_sets,
    });
  }
  return [...latest.values()];
}

// Turns today's plan day into the engine's prescriptions at session start, and
// the finished session into updated engine state (V2 PHASE 7.1 / 7.3). Pure:
// no Supabase or React imports, so Vitest runs it directly.

import {
  evaluateSession,
  initialState,
  prescribe,
  startingPrescription,
  type Command,
  type ExerciseMeta,
  type ExerciseState as EngineState,
  type Prescription,
  type RepRange,
  type SessionEvaluation,
} from './engine';
import { catalogKey, type Catalog, type CatalogEntry, type MuscleScore } from './muscleRecovery';

export interface DayExerciseInput {
  name: string;
  exerciseId?: string;
  sets: number;
  reps: number;
}

export interface PrescribedExercise {
  name: string;
  exerciseId?: string;
  /** False for cardio / mobility / yoga and for exercises with no catalog metadata: those keep the plan's numbers. */
  managed: boolean;
  meta: ExerciseMeta | null;
  entry: CatalogEntry | null;
  /** Engine state before this session (stored, or built from the plan for a new exercise). */
  state: EngineState;
  isNew: boolean;
  prescription: Prescription;
  /** Score of the exercise's primary muscle, when there is one. */
  muscleScore: number | null;
}

export interface PrescribeDayInput {
  exercises: DayExerciseInput[];
  catalog: Catalog;
  /** Stored engine state by lowercase exercise name. */
  progress: Record<string, EngineState>;
  /** The goal-level rep range from computeRepRange(goal, experience, age). */
  range: RepRange;
  muscleScores: Record<string, MuscleScore>;
  sleepHours: number | null;
  proteinPct: number | null;
  /** Heaviest weight used in each exercise's previous session, so existing users don't start from scratch. */
  lastWeights?: Record<string, number>;
}

export function isManaged(entry: CatalogEntry | null): boolean {
  return !!entry && entry.modality === 'strength' && entry.primaryMuscle !== null && entry.loadable !== null;
}

export function metaFor(entry: CatalogEntry): ExerciseMeta {
  return {
    name: entry.name,
    loadable: entry.loadable === true,
    incrementKg: entry.loadIncrementKg,
    primaryMuscle: entry.primaryMuscle ?? 'unknown',
    hasHarderVariation: !!entry.harderVariationName,
  };
}

/** State for an exercise the engine has not seen: the plan's numbers become the starting point, the role sets the range. */
export function newStateFor(ex: DayExerciseInput, entry: CatalogEntry, range: RepRange, lastWeightKg: number | null): EngineState {
  const start = startingPrescription(range, entry.role);
  const startReps = Math.min(start.repMax, Math.max(start.repMin, ex.reps));
  return initialState({
    repMin: start.repMin,
    repMax: start.repMax,
    startReps,
    sets: Math.max(1, ex.sets),
    weightKg: entry.loadable === true ? lastWeightKg : null,
  });
}

export function prescribeDay(input: PrescribeDayInput): PrescribedExercise[] {
  return input.exercises.map((ex) => {
    const entry = input.catalog[catalogKey(ex.name)] ?? null;
    if (!isManaged(entry)) {
      const state = initialState({ repMin: ex.reps, repMax: ex.reps, startReps: ex.reps, sets: ex.sets, weightKg: null });
      return {
        name: ex.name,
        exerciseId: ex.exerciseId,
        managed: false,
        meta: null,
        entry,
        state,
        isNew: false,
        muscleScore: null,
        prescription: { weightKg: null, reps: ex.reps, sets: ex.sets, commands: ['HOLD' as Command], reason: '' },
      };
    }
    const e = entry as CatalogEntry;
    const meta = metaFor(e);
    const stored = input.progress[catalogKey(ex.name)];
    const isNew = !stored;
    const state = stored ?? newStateFor(ex, e, input.range, input.lastWeights?.[catalogKey(ex.name)] ?? null);
    const score = input.muscleScores[meta.primaryMuscle]?.score ?? null;
    const prescription = prescribe(state, meta, { sleepHours: input.sleepHours, proteinPct: input.proteinPct, muscleScore: score });
    return { name: ex.name, exerciseId: ex.exerciseId, managed: true, meta, entry: e, state, isNew, muscleScore: score, prescription };
  });
}

/** The label for a command pill: Weight / Reps / Sets up or down, Hold, or Calibrate. */
export function commandPill(commands: Command[]): { label: string; tone: 'up' | 'down' | 'hold' | 'info' } {
  const has = (c: Command) => commands.includes(c);
  if (has('CALIBRATE')) return { label: 'Find your weight', tone: 'info' };
  if (has('BLOCK_PROGRESSION') && has('REDUCE_SETS_TODAY')) return { label: 'Sets down', tone: 'down' };
  if (has('DELOAD')) return { label: 'Weight down', tone: 'down' };
  if (has('INCREASE_WEIGHT')) return { label: 'Weight up', tone: 'up' };
  if (has('DECREASE_WEIGHT')) return { label: 'Weight down', tone: 'down' };
  if (has('INCREASE_SETS')) return { label: 'Sets up', tone: 'up' };
  if (has('DECREASE_SETS')) return { label: 'Sets down', tone: 'down' };
  if (has('INCREASE_REPS')) return { label: 'Reps up', tone: 'up' };
  if (has('DECREASE_REPS')) return { label: 'Reps down', tone: 'down' };
  if (has('SUGGEST_HARDER_VARIATION')) return { label: 'Try harder', tone: 'up' };
  return { label: 'Hold', tone: 'hold' };
}

/** The reason line shown under the exercise name in the player and on the prescription screen. */
export function reasonLine(p: PrescribedExercise): string {
  if (!p.managed) return '';
  if (p.isNew && p.prescription.commands.includes('CALIBRATE')) return p.prescription.reason;
  if (p.isNew) return `New exercise: ${p.prescription.sets} x ${p.prescription.reps} to start. Aim for about 2 reps left in the tank.`;
  return p.prescription.reason;
}

export interface LoggedRowLike {
  reps: number;
  weight: number;
  done: boolean;
}

export interface SessionOutcome {
  name: string;
  exerciseId?: string;
  before: EngineState;
  evaluation: SessionEvaluation;
}

/**
 * Runs the performance step for each managed exercise that had at least one
 * set logged. `rowsByName` is the final rows of the session. A session whose
 * prescription was reduced or blocked by recovery is flagged so the engine
 * keeps its pending decision (see evaluateSession).
 */
export function sessionOutcomes(prescribed: PrescribedExercise[], rowsByName: Record<string, LoggedRowLike[]>, date: string): SessionOutcome[] {
  const out: SessionOutcome[] = [];
  for (const p of prescribed) {
    if (!p.managed || !p.meta) continue;
    const done = (rowsByName[p.name] ?? []).filter((r) => r.done);
    if (done.length === 0) continue;
    const weight = p.meta.loadable ? done[done.length - 1].weight : null;
    if (p.meta.loadable && !(weight && weight > 0)) continue; // no weight entered: nothing to learn from
    const blocked = p.prescription.commands.includes('BLOCK_PROGRESSION') || p.prescription.commands.includes('REDUCE_SETS_TODAY');
    const evaluation = evaluateSession(
      p.state,
      {
        date,
        reps: done.map((r) => r.reps),
        prescribed: { weightKg: p.prescription.weightKg ?? weight, reps: p.prescription.reps, sets: p.prescription.sets },
        weightKg: weight,
        blocked,
      },
      p.meta
    );
    out.push({ name: p.name, exerciseId: p.exerciseId, before: p.state, evaluation });
  }
  return out;
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

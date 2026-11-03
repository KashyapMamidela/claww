// Pure state for the set-row workout player (V2 PHASE 2.3). Every set of
// every exercise is a row the user can edit before logging; the provider
// (workoutSession.tsx) holds an ExerciseState[] and calls these helpers.
// Dependency-free so Vitest can test it.

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: number;
}

export interface SetRowState {
  reps: number;
  weight: number;
  /** What the row was prefilled with — logged as weight_prescribed. */
  prescribedWeight: number;
  done: boolean;
}

export interface ExerciseState {
  rows: SetRowState[];
  skipped: boolean;
}

export interface LastSet {
  reps: number;
  weight: number;
}

/** Last session's sets per exercise name, in set order. */
export type LastTimeMap = Record<string, LastSet[]>;

export interface LastTimeRow {
  exercise_name: string;
  sets: number | null; // set NUMBER within the exercise
  reps_achieved: number | null;
  reps_prescribed: number | null;
  weight_achieved: number | null;
  weight_prescribed: number | null;
  completed_at: string;
}

function localDayKey(iso: string): string {
  return new Date(iso).toDateString();
}

/**
 * For each exercise, the sets from its most recent calendar day of logs,
 * ordered by set number. `rows` may be in any order.
 */
export function lastSessionSets(rows: LastTimeRow[]): LastTimeMap {
  const latestDay = new Map<string, string>();
  const latestTime = new Map<string, number>();
  for (const r of rows) {
    const t = new Date(r.completed_at).getTime();
    if (!latestTime.has(r.exercise_name) || t > (latestTime.get(r.exercise_name) as number)) {
      latestTime.set(r.exercise_name, t);
      latestDay.set(r.exercise_name, localDayKey(r.completed_at));
    }
  }
  const out: LastTimeMap = {};
  const grouped = new Map<string, LastTimeRow[]>();
  for (const r of rows) {
    if (localDayKey(r.completed_at) !== latestDay.get(r.exercise_name)) continue;
    const list = grouped.get(r.exercise_name) ?? [];
    list.push(r);
    grouped.set(r.exercise_name, list);
  }
  for (const [name, list] of grouped) {
    list.sort((a, b) => (a.sets ?? 0) - (b.sets ?? 0) || new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
    out[name] = list.map((r) => ({
      reps: r.reps_achieved ?? r.reps_prescribed ?? 0,
      weight: r.weight_achieved ?? r.weight_prescribed ?? 0,
    }));
  }
  return out;
}

/** Last time's numbers for one set, falling back to that session's final set when it had fewer sets. */
export function lastFor(lastTime: LastTimeMap, name: string, setIndex: number): LastSet | null {
  const sets = lastTime[name];
  if (!sets || sets.length === 0) return null;
  return sets[setIndex] ?? sets[sets.length - 1];
}

/** Rows prefilled with today's prescription: plan reps, and last time's weight for that set (0 if never done). */
export function buildInitialState(exercises: PlannedExercise[], lastTime: LastTimeMap): ExerciseState[] {
  return exercises.map((ex) => ({
    skipped: false,
    rows: Array.from({ length: Math.max(1, ex.sets) }, (_, i) => {
      const weight = lastFor(lastTime, ex.name, i)?.weight ?? 0;
      return { reps: ex.reps, weight, prescribedWeight: weight, done: false };
    }),
  }));
}

/** Fills in weights once last-time data arrives, without touching anything the user already edited or logged. */
export function applyLastTimeWeights(
  state: ExerciseState[],
  exercises: PlannedExercise[],
  lastTime: LastTimeMap,
  untouched: (exIdx: number, setIdx: number) => boolean
): ExerciseState[] {
  return state.map((ex, e) => ({
    ...ex,
    rows: ex.rows.map((row, s) => {
      if (row.done || !untouched(e, s)) return row;
      const weight = lastFor(lastTime, exercises[e]?.name ?? '', s)?.weight;
      return weight === undefined ? row : { ...row, weight, prescribedWeight: weight };
    }),
  }));
}

/** Index of the first set not yet logged, or -1 when the exercise is complete. */
export function currentSetIndex(ex: ExerciseState | undefined): number {
  if (!ex) return -1;
  return ex.rows.findIndex((r) => !r.done);
}

export function isExerciseComplete(ex: ExerciseState): boolean {
  return ex.rows.every((r) => r.done);
}

/** Edits a row. A weight change carries forward to every later set of the same exercise that hasn't been logged yet. */
export function updateRow(
  state: ExerciseState[],
  exIdx: number,
  setIdx: number,
  patch: Partial<Pick<SetRowState, 'reps' | 'weight'>>
): ExerciseState[] {
  return state.map((ex, e) => {
    if (e !== exIdx) return ex;
    return {
      ...ex,
      rows: ex.rows.map((row, s) => {
        if (s === setIdx) return { ...row, ...patch };
        if (patch.weight !== undefined && s > setIdx && !row.done) return { ...row, weight: patch.weight };
        return row;
      }),
    };
  });
}

export function markDone(state: ExerciseState[], exIdx: number, setIdx: number): ExerciseState[] {
  return state.map((ex, e) =>
    e !== exIdx ? ex : { ...ex, rows: ex.rows.map((row, s) => (s === setIdx ? { ...row, done: true } : row)) }
  );
}

export function markSkipped(state: ExerciseState[], exIdx: number): ExerciseState[] {
  return state.map((ex, e) => (e === exIdx ? { ...ex, skipped: true } : ex));
}

function hasWorkLeft(ex: ExerciseState): boolean {
  return !ex.skipped && !isExerciseComplete(ex);
}

/** Next exercise with work left, looking forward from `from` and then wrapping to the start. -1 when nothing is left. */
export function nextExerciseWithWork(state: ExerciseState[], from: number): number {
  for (let i = from + 1; i < state.length; i++) if (hasWorkLeft(state[i])) return i;
  for (let i = 0; i <= from && i < state.length; i++) if (hasWorkLeft(state[i])) return i;
  return -1;
}

export function isSessionComplete(state: ExerciseState[]): boolean {
  return state.every((ex) => !hasWorkLeft(ex));
}

export interface SessionTotals {
  setsCompleted: number;
  repsCompleted: number;
  exercisesCompleted: number;
}

export function sessionTotals(state: ExerciseState[]): SessionTotals {
  let setsCompleted = 0;
  let repsCompleted = 0;
  let exercisesCompleted = 0;
  for (const ex of state) {
    for (const r of ex.rows) {
      if (r.done) {
        setsCompleted += 1;
        repsCompleted += r.reps;
      }
    }
    if (isExerciseComplete(ex)) exercisesCompleted += 1;
  }
  return { setsCompleted, repsCompleted, exercisesCompleted };
}

/**
 * The quick-pick chips for a value: the prescription, one step either side,
 * and last time's — de-duplicated, never negative, at most 4, in that order.
 */
export function quickValues(prescribed: number, step: number, last: number | null): number[] {
  const candidates = [prescribed, prescribed - step, prescribed + step, last];
  const out: number[] = [];
  for (const v of candidates) {
    if (v === null || !Number.isFinite(v) || v < 0) continue;
    const rounded = Math.round(v * 100) / 100;
    if (!out.includes(rounded)) out.push(rounded);
  }
  return out.slice(0, 4);
}

/** Values for the picker wheel: 0..max in `step` increments. */
export function wheelValues(step: number, max: number): number[] {
  const count = Math.floor(max / step) + 1;
  return Array.from({ length: count }, (_, i) => Math.round(i * step * 100) / 100);
}

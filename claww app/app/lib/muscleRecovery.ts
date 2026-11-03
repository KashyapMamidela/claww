// Per-muscle recovery from the user's own logs (V2 PHASE 7). Pure: data.ts
// fetches the rows, this turns them into the engine's MuscleInputs and the
// score. The engine (supabase/functions/_shared/adaptive.ts) owns the maths.

import { fatigueFromSets, muscleRecovery, type MuscleInputs, type MuscleRecovery, type Readiness, type SetForFatigue } from './engine';

export const MAJOR_MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'] as const;
export type Muscle = (typeof MAJOR_MUSCLES)[number];

export function isMajorMuscle(m: string | null | undefined): m is Muscle {
  return !!m && (MAJOR_MUSCLES as readonly string[]).includes(m);
}

/** The slice of an `exercises` row the app needs, with variations as names. */
export interface CatalogEntry {
  id: string;
  name: string;
  modality: string;
  equipment: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  movementPattern: string | null;
  role: 'main' | 'accessory' | null;
  loadable: boolean | null;
  stimulusType: string | null;
  loadIncrementKg: number | null;
  harderVariationName: string | null;
  easierVariationName: string | null;
}

export type Catalog = Record<string, CatalogEntry>;

export const catalogKey = (name: string) => name.trim().toLowerCase();

export interface LoggedSet {
  exerciseName: string;
  completedAt: string;
  rir: number | null;
}

export interface Checkin {
  soreness: number | null;
  readiness: Readiness | null;
}

/** Sets older than this have fully recovered as far as the time part of the score goes. */
export const RECOVERY_WINDOW_HOURS = 96;
const SECONDARY_SHARE = 0.5;

/** The engine's inputs for one muscle. A muscle with no sets in the window is fresh: fatigue 100, 96 h. */
export function inputsForMuscle(
  muscle: string,
  sets: LoggedSet[],
  catalog: Catalog,
  now: Date,
  checkin?: Checkin | null
): MuscleInputs {
  const forFatigue: SetForFatigue[] = [];
  let latest: number | null = null;
  for (const s of sets) {
    const entry = catalog[catalogKey(s.exerciseName)];
    if (!entry) continue;
    const t = new Date(s.completedAt).getTime();
    if (now.getTime() - t > RECOVERY_WINDOW_HOURS * 3_600_000) continue;
    let share = 0;
    if (entry.primaryMuscle === muscle) share = 1;
    else if (entry.secondaryMuscles.includes(muscle)) share = SECONDARY_SHARE;
    if (share === 0) continue;
    forFatigue.push({ stimulus: entry.stimulusType ?? 'compound', rir: s.rir, share });
    if (latest === null || t > latest) latest = t;
  }
  const { score, rirMissing } = fatigueFromSets(forFatigue);
  return {
    fatigue: score,
    hoursSinceTrained: latest === null ? RECOVERY_WINDOW_HOURS : Math.max(0, (now.getTime() - latest) / 3_600_000),
    soreness: checkin?.soreness ?? null,
    readiness: checkin?.readiness ?? null,
    rirMissing,
  };
}

export interface MuscleScore extends MuscleRecovery {
  muscle: string;
  /** Hours since the muscle was last trained, or null when not in the window. */
  hoursSinceTrained: number | null;
}

export function muscleScores(
  muscles: readonly string[],
  sets: LoggedSet[],
  catalog: Catalog,
  now: Date,
  checkins: Record<string, Checkin> = {}
): Record<string, MuscleScore> {
  const out: Record<string, MuscleScore> = {};
  for (const m of muscles) {
    const inputs = inputsForMuscle(m, sets, catalog, now, checkins[m]);
    const r = muscleRecovery(inputs);
    out[m] = { ...r, muscle: m, hoursSinceTrained: inputs.hoursSinceTrained !== null && inputs.hoursSinceTrained < RECOVERY_WINDOW_HOURS ? inputs.hoursSinceTrained : null };
  }
  return out;
}

/** The primary muscles of today's exercises, in first-seen order, majors only. */
export function musclesForExercises(names: string[], catalog: Catalog): string[] {
  const out: string[] = [];
  for (const n of names) {
    const m = catalog[catalogKey(n)]?.primaryMuscle;
    if (isMajorMuscle(m) && !out.includes(m)) out.push(m);
  }
  return out;
}

/** "trained 2 days ago", "trained 5 h ago", or "not trained in the last 4 days". */
export function trainedAgoLabel(hours: number | null): string {
  if (hours === null) return 'not trained in the last 4 days';
  if (hours < 1) return 'trained just now';
  if (hours < 24) return `trained ${Math.round(hours)} h ago`;
  const days = Math.round(hours / 24);
  return `trained ${days} day${days === 1 ? '' : 's'} ago`;
}

/** The lowest-scoring muscle among those given, ignoring muscles without a score. */
export function lowestMuscle(scores: Record<string, MuscleScore>, among: readonly string[]): MuscleScore | null {
  let best: MuscleScore | null = null;
  for (const m of among) {
    const s = scores[m];
    if (!s || s.score === null) continue;
    if (best === null || (s.score as number) < (best.score as number)) best = s;
  }
  return best;
}

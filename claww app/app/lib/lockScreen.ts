// NG PHASE 3.5: what the lock screen shows while a workout runs (screen 09). Pure, so Vitest can test it;
// workoutSession.tsx feeds it to the Android ongoing notification
// (modules/claww-session-notification) and, behind a flag, to the iOS Live Activity.

export type LockAction = 'done' | 'skip' | 'minus15';

export interface LockScreenInput {
  sessionName: string;
  exerciseName: string;
  /** The set being done, or the one coming after the rest (1-based). */
  setNumber: number;
  totalSets: number;
  weightKg: number;
  reps: number;
  resting: boolean;
  /** Epoch ms the rest ends; null when not resting. */
  restEndsAtMs: number | null;
  paused: boolean;
  /** NG PHASE 3.6: set for a timed block (cardio, yoga, mobility): its target length in minutes. */
  timedMinutes?: number | null;
}

export interface LockScreenContent {
  title: string;
  text: string;
  /** Epoch ms the chronometer counts down to; null = no chronometer. */
  chronometerAtMs: number | null;
  countDown: boolean;
  actions: LockAction[];
}

function setLine(weightKg: number, reps: number): string {
  return weightKg > 0 ? `${weightKg} kg × ${reps}` : `${reps} reps`;
}

/**
 * Resting: "Rest · Bench press, set 3 of 4" with a countdown, buttons Done and Skip.
 * Working: "Bench press · set 3 of 4 · 60 kg × 8", button Done. Paused: just "Paused", no buttons.
 */
export function lockScreenContent(i: LockScreenInput): LockScreenContent {
  const where = `${i.exerciseName}, set ${i.setNumber} of ${i.totalSets}`;
  if (i.paused) return { title: i.sessionName, text: 'Paused', chronometerAtMs: null, countDown: false, actions: [] };
  if (i.resting && i.restEndsAtMs !== null) {
    return { title: i.sessionName, text: `Rest · ${where}`, chronometerAtMs: i.restEndsAtMs, countDown: true, actions: ['done', 'skip'] };
  }
  if (i.timedMinutes) {
    return { title: i.sessionName, text: `${i.exerciseName} · ${i.timedMinutes} min`, chronometerAtMs: null, countDown: false, actions: ['done'] };
  }
  return {
    title: i.sessionName,
    text: `${i.exerciseName} · set ${i.setNumber} of ${i.totalSets} · ${setLine(i.weightKg, i.reps)}`,
    chronometerAtMs: null,
    countDown: false,
    actions: ['done'],
  };
}

export type LockStep = 'log' | 'skipRestThenLog' | 'skipRest' | 'adjustRest' | 'ignore';

/**
 * What a lock-screen button does. Done during a rest means the lifter finished the next set early:
 * the rest ends and that set is logged as planned. A second tap within `windowMs` of the same button is
 * ignored, so a double tap can't log two sets.
 */
export function lockActionStep(action: LockAction, resting: boolean, lastTapAt: Record<string, number>, now: number, windowMs = 800): LockStep {
  const last = lastTapAt[action];
  if (last !== undefined && now - last < windowMs) return 'ignore';
  if (action === 'done') return resting ? 'skipRestThenLog' : 'log';
  if (action === 'skip') return resting ? 'skipRest' : 'ignore';
  return resting ? 'adjustRest' : 'ignore';
}

import { describe, expect, it } from 'vitest';
import {
  applyLastTimeWeights,
  buildInitialState,
  currentSetIndex,
  isSessionComplete,
  lastFor,
  lastSessionSets,
  markDone,
  markSkipped,
  nextExerciseWithWork,
  quickValues,
  sessionTotals,
  updateRow,
  wheelValues,
  type LastTimeRow,
} from './sessionPlan';

const exercises = [
  { name: 'Bench Press', sets: 3, reps: 8 },
  { name: 'Row', sets: 2, reps: 10 },
  { name: 'Plank', sets: 1, reps: 30 },
];

const log = (name: string, set: number, reps: number, weight: number, at: string): LastTimeRow => ({
  exercise_name: name,
  sets: set,
  reps_achieved: reps,
  reps_prescribed: reps,
  weight_achieved: weight,
  weight_prescribed: weight,
  completed_at: at,
});

describe('lastSessionSets', () => {
  it('keeps only each exercise’s most recent day, ordered by set number', () => {
    const map = lastSessionSets([
      log('Bench Press', 2, 9, 60, '2026-10-09T10:05:00'),
      log('Bench Press', 1, 10, 60, '2026-10-09T10:00:00'),
      log('Bench Press', 1, 8, 55, '2026-10-02T10:00:00'),
      log('Row', 1, 12, 40, '2026-10-05T10:00:00'),
    ]);
    expect(map['Bench Press']).toEqual([
      { reps: 10, weight: 60 },
      { reps: 9, weight: 60 },
    ]);
    expect(map.Row).toEqual([{ reps: 12, weight: 40 }]);
  });

  it('falls back to prescribed values when achieved is missing', () => {
    const row = { ...log('Squat', 1, 5, 80, '2026-10-09T10:00:00'), reps_achieved: null, weight_achieved: null };
    expect(lastSessionSets([row]).Squat).toEqual([{ reps: 5, weight: 80 }]);
  });
});

describe('lastFor', () => {
  const last = { 'Bench Press': [{ reps: 10, weight: 60 }, { reps: 9, weight: 62.5 }] };
  it('returns the matching set, else the session’s last set, else null', () => {
    expect(lastFor(last, 'Bench Press', 1)).toEqual({ reps: 9, weight: 62.5 });
    expect(lastFor(last, 'Bench Press', 2)).toEqual({ reps: 9, weight: 62.5 });
    expect(lastFor(last, 'Row', 0)).toBeNull();
  });
});

describe('buildInitialState', () => {
  it('prefills plan reps and last time’s weight per set (0 when never done)', () => {
    const state = buildInitialState(exercises, { 'Bench Press': [{ reps: 10, weight: 60 }] });
    expect(state[0].rows).toHaveLength(3);
    expect(state[0].rows.map((r) => [r.reps, r.weight, r.prescribedWeight])).toEqual([
      [8, 60, 60],
      [8, 60, 60],
      [8, 60, 60],
    ]);
    expect(state[1].rows.every((r) => r.weight === 0 && !r.done)).toBe(true);
  });

  it('always gives an exercise at least one row', () => {
    expect(buildInitialState([{ name: 'X', sets: 0, reps: 5 }], {})[0].rows).toHaveLength(1);
  });
});

describe('applyLastTimeWeights', () => {
  it('fills untouched, unlogged rows only', () => {
    let state = buildInitialState(exercises, {});
    state = markDone(state, 0, 0);
    const next = applyLastTimeWeights(state, exercises, { 'Bench Press': [{ reps: 8, weight: 70 }] }, (e, s) => !(e === 0 && s === 2));
    expect(next[0].rows.map((r) => r.weight)).toEqual([0, 70, 0]);
  });
});

describe('updateRow', () => {
  it('carries a weight change forward to later unlogged sets only', () => {
    let state = buildInitialState(exercises, {});
    state = markDone(state, 0, 2);
    state = updateRow(state, 0, 0, { weight: 62.5 });
    expect(state[0].rows.map((r) => r.weight)).toEqual([62.5, 62.5, 0]);
  });

  it('does not carry a reps change forward', () => {
    const state = updateRow(buildInitialState(exercises, {}), 0, 0, { reps: 6 });
    expect(state[0].rows.map((r) => r.reps)).toEqual([6, 8, 8]);
  });

  it('leaves earlier sets alone', () => {
    const state = updateRow(buildInitialState(exercises, {}), 0, 1, { weight: 50 });
    expect(state[0].rows.map((r) => r.weight)).toEqual([0, 50, 50]);
  });
});

describe('progression through a session', () => {
  it('tracks the current set and moves to the next exercise with work left', () => {
    let state = buildInitialState(exercises, {});
    expect(currentSetIndex(state[0])).toBe(0);
    state = markDone(state, 0, 0);
    expect(currentSetIndex(state[0])).toBe(1);
    state = markDone(markDone(state, 0, 1), 0, 2);
    expect(currentSetIndex(state[0])).toBe(-1);
    expect(nextExerciseWithWork(state, 0)).toBe(1);
  });

  it('wraps back to an earlier unfinished exercise and skips skipped ones', () => {
    let state = buildInitialState(exercises, {});
    state = markSkipped(state, 1);
    expect(nextExerciseWithWork(state, 0)).toBe(2);
    state = markDone(state, 2, 0);
    expect(nextExerciseWithWork(state, 2)).toBe(0);
  });

  it('is complete when every exercise is done or skipped', () => {
    let state = buildInitialState(exercises, {});
    state = markSkipped(markSkipped(state, 0), 1);
    expect(isSessionComplete(state)).toBe(false);
    state = markDone(state, 2, 0);
    expect(isSessionComplete(state)).toBe(true);
    expect(nextExerciseWithWork(state, 2)).toBe(-1);
  });

  it('totals logged sets, reps and fully completed exercises', () => {
    let state = buildInitialState(exercises, {});
    state = updateRow(state, 0, 0, { reps: 6 });
    state = markDone(markDone(state, 0, 0), 2, 0);
    expect(sessionTotals(state)).toEqual({ setsCompleted: 2, repsCompleted: 36, exercisesCompleted: 1 });
  });
});

describe('quickValues', () => {
  it('orders prescription, -step, +step, last time, de-duplicated', () => {
    expect(quickValues(60, 2.5, 55)).toEqual([60, 57.5, 62.5, 55]);
    expect(quickValues(60, 2.5, 62.5)).toEqual([60, 57.5, 62.5]);
  });

  it('drops negatives and missing last time', () => {
    expect(quickValues(0, 2.5, null)).toEqual([0, 2.5]);
    expect(quickValues(1, 1, null)).toEqual([1, 0, 2]);
  });
});

describe('wheelValues', () => {
  it('steps from 0 to max inclusive', () => {
    expect(wheelValues(2.5, 10)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(wheelValues(1, 3)).toEqual([0, 1, 2, 3]);
  });
});

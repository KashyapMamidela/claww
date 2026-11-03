import { describe, expect, it } from 'vitest';
import { exerciseProgress, exerciseVolume, markDone, repsText, rowHint, sessionKcal, stepValue, tickTap, type ExerciseState } from './sessionPlan';

const row = (reps: number, weight: number, done = false) => ({ reps, weight, prescribedWeight: weight, done });
const bench: ExerciseState = { skipped: false, rows: [row(8, 60, true), row(8, 60), row(8, 60), row(8, 60)] };

describe('tickTap (screen 07: tick = logged as planned)', () => {
  it('logs only the current set', () => {
    expect(tickTap([bench], 0, 1)).toBe('log');
  });

  it('ignores a set already logged', () => {
    expect(tickTap([bench], 0, 0)).toBe('ignore');
  });

  it('ignores sets after the current one', () => {
    expect(tickTap([bench], 0, 2)).toBe('ignore');
    expect(tickTap([bench], 0, 3)).toBe('ignore');
  });

  it('ignores a skipped exercise and bad indexes', () => {
    expect(tickTap([{ ...bench, skipped: true }], 0, 1)).toBe('ignore');
    expect(tickTap([bench], 1, 0)).toBe('ignore');
    expect(tickTap([bench], 0, 9)).toBe('ignore');
  });

  it('moves on to the next set once the current one is logged', () => {
    const after = markDone([bench], 0, 1);
    expect(tickTap(after, 0, 1)).toBe('ignore');
    expect(tickTap(after, 0, 2)).toBe('log');
  });
});

describe('row text', () => {
  it('hints "now" on the current set and "top of range" on a set that reached the top', () => {
    expect(rowHint(row(8, 60), true, 8)).toBe('now');
    expect(rowHint(row(8, 60, true), false, 8)).toBe('top of range');
    expect(rowHint(row(7, 60, true), false, 8)).toBe('');
    expect(rowHint(row(8, 60), false, 8)).toBe('');
    expect(rowHint(row(8, 60, true), false, null)).toBe('');
  });

  it('shows the rep range when there is one', () => {
    expect(repsText(8, 6, 8)).toBe('6–8');
    expect(repsText(10, null, null)).toBe('10');
    expect(repsText(12, 12, 12)).toBe('12');
  });
});

describe('numbers', () => {
  it('volume counts logged sets only', () => {
    expect(exerciseVolume(bench)).toBe(480);
    expect(exerciseVolume({ skipped: false, rows: [row(15, 0, true)] })).toBe(0);
  });

  it('progress for the segmented bar', () => {
    expect(exerciseProgress(bench)).toBe(0.25);
    expect(exerciseProgress({ ...bench, skipped: true })).toBe(1);
    expect(exerciseProgress(undefined)).toBe(0);
  });

  it('stepper moves by the exercise step and stays clean', () => {
    expect(stepValue(60, 1, 2.5)).toBe(62.5);
    expect(stepValue(62.5, -1, 2.5)).toBe(60);
    expect(stepValue(1.25, -1, 2.5)).toBe(0);
    expect(stepValue(8, -1, 1, 1)).toBe(7);
    expect(stepValue(1, -1, 1, 1)).toBe(1);
    expect(stepValue(0.1, 2, 0.1)).toBe(0.3);
  });

  it('kcal estimate from time and body weight', () => {
    expect(sessionKcal(60 * 60_000, 70)).toBe(350);
    expect(sessionKcal(12 * 60_000, 70)).toBe(70);
    expect(sessionKcal(30 * 60_000, null)).toBe(175);
    expect(sessionKcal(-5, 70)).toBe(0);
  });
});

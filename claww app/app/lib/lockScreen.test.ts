import { describe, expect, it } from 'vitest';
import { lockActionStep, lockScreenContent, type LockScreenInput } from './lockScreen';

const base: LockScreenInput = {
  sessionName: 'Push day',
  exerciseName: 'Bench press',
  setNumber: 3,
  totalSets: 4,
  weightKg: 60,
  reps: 8,
  resting: false,
  restEndsAtMs: null,
  paused: false,
};

describe('lockScreenContent (screen 09)', () => {
  it('resting: a countdown to the rest end, Done and Skip', () => {
    const c = lockScreenContent({ ...base, resting: true, restEndsAtMs: 1_000_000 });
    expect(c.title).toBe('Push day');
    expect(c.text).toBe('Rest · Bench press, set 3 of 4');
    expect(c.chronometerAtMs).toBe(1_000_000);
    expect(c.countDown).toBe(true);
    expect(c.actions).toEqual(['done', 'skip']);
  });

  it('working: the set to do, and only Done', () => {
    const c = lockScreenContent(base);
    expect(c.text).toBe('Bench press · set 3 of 4 · 60 kg × 8');
    expect(c.chronometerAtMs).toBeNull();
    expect(c.actions).toEqual(['done']);
  });

  it('bodyweight sets read as reps', () => {
    expect(lockScreenContent({ ...base, exerciseName: 'Push-Up', weightKg: 0, reps: 15 }).text).toBe('Push-Up · set 3 of 4 · 15 reps');
  });

  it('paused: no buttons, no clock', () => {
    const c = lockScreenContent({ ...base, resting: true, restEndsAtMs: 5, paused: true });
    expect(c).toEqual({ title: 'Push day', text: 'Paused', chronometerAtMs: null, countDown: false, actions: [] });
  });

  it('a timed block reads as its length, not as a set', () => {
    const c = lockScreenContent({ ...base, exerciseName: 'Running', timedMinutes: 20 });
    expect(c.text).toBe('Running · 20 min');
    expect(c.actions).toEqual(['done']);
  });

  it('a rest flag without an end time falls back to the working text', () => {
    expect(lockScreenContent({ ...base, resting: true, restEndsAtMs: null }).actions).toEqual(['done']);
  });
});

describe('lockActionStep', () => {
  it('Done logs the current set when working', () => {
    expect(lockActionStep('done', false, {}, 1000)).toBe('log');
  });

  it('Done during rest ends the rest and logs the next set', () => {
    expect(lockActionStep('done', true, {}, 1000)).toBe('skipRestThenLog');
  });

  it('Skip only does something during a rest', () => {
    expect(lockActionStep('skip', true, {}, 1000)).toBe('skipRest');
    expect(lockActionStep('skip', false, {}, 1000)).toBe('ignore');
  });

  it('a double tap within the window is ignored, a later one is not', () => {
    expect(lockActionStep('done', false, { done: 1000 }, 1300)).toBe('ignore');
    expect(lockActionStep('done', false, { done: 1000 }, 1900)).toBe('log');
  });

  it('the window is per button', () => {
    expect(lockActionStep('skip', true, { done: 1000 }, 1100)).toBe('skipRest');
  });

  it('minus15 adjusts the rest only while resting', () => {
    expect(lockActionStep('minus15', true, {}, 1000)).toBe('adjustRest');
    expect(lockActionStep('minus15', false, {}, 1000)).toBe('ignore');
  });
});

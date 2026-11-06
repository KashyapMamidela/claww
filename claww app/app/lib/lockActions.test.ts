import { describe, expect, it } from 'vitest';
import { ACTION_ATE, ACTION_ELSE, ACTION_SLEEP_YES, ACTION_WATER, CATEGORY_MEAL, CATEGORY_SLEEP, CATEGORY_WATER, categoryFor, lockEffect, sleepGuess } from './lockActions';

describe('lock screen actions', () => {
  it('meal reminders get Ate it and Something else, water gets +250 ml, sleep gets Yes only with a guess', () => {
    expect(categoryFor('meal')).toBe(CATEGORY_MEAL);
    expect(categoryFor('water')).toBe(CATEGORY_WATER);
    expect(categoryFor('sleep', true)).toBe(CATEGORY_SLEEP);
    expect(categoryFor('sleep', false)).toBeNull();
    expect(categoryFor('workout')).toBeNull();
  });
  it('maps a press to its effect', () => {
    expect(lockEffect(ACTION_ATE, { slot: 'lunch' })).toEqual({ kind: 'meal_as_planned', slot: 'lunch' });
    expect(lockEffect(ACTION_ELSE, { slot: 'dinner' })).toEqual({ kind: 'meal_else', slot: 'dinner' });
    expect(lockEffect(ACTION_WATER, {})).toEqual({ kind: 'water', ml: 250 });
  });
  it('ignores a meal press with no meal, and an unknown button', () => {
    expect(lockEffect(ACTION_ATE, {})).toBeNull();
    expect(lockEffect('other', { slot: 'lunch' })).toBeNull();
  });
  it('the sleep Yes logs the guessed night, and refuses a nonsense one', () => {
    const e = lockEffect(ACTION_SLEEP_YES, { sleepBed: new Date(2026, 10, 5, 23, 40).toISOString(), sleepWake: new Date(2026, 10, 6, 7, 10).toISOString() });
    expect(e).toMatchObject({ kind: 'sleep', hours: 7.5 });
    expect(lockEffect(ACTION_SLEEP_YES, { sleepBed: new Date(2026, 10, 6, 6, 0).toISOString(), sleepWake: new Date(2026, 10, 6, 7, 0).toISOString() })).toBeNull();
    expect(lockEffect(ACTION_SLEEP_YES, {})).toBeNull();
  });
});

describe('sleepGuess', () => {
  const now = new Date(2026, 10, 6, 6, 30);
  it('copies the last night onto last night and this morning', () => {
    const g = sleepGuess(new Date(2026, 10, 4, 23, 40), new Date(2026, 10, 5, 7, 10), now);
    expect(g?.label).toBe('Slept 11:40 pm to 7:10 am?');
    expect(g?.hours).toBe(7.5);
    expect(g?.bed.getDate()).toBe(5);
    expect(g?.wake.getDate()).toBe(6);
  });
  it('handles a bedtime after midnight', () => {
    const g = sleepGuess(new Date(2026, 10, 5, 0, 30), new Date(2026, 10, 5, 8, 0), now);
    expect(g?.bed.getDate()).toBe(6);
    expect(g?.hours).toBe(7.5);
  });
  it('is null with no earlier night, or an implausible one', () => {
    expect(sleepGuess(null, null, now)).toBeNull();
    expect(sleepGuess(new Date(2026, 10, 4, 7, 0), new Date(2026, 10, 4, 7, 30), now)).toBeNull();
  });
});

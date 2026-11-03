import { describe, expect, it } from 'vitest';
import {
  dailyGoalPct,
  isSessionPlannedToday,
  nutritionNote,
  nutritionRingPct,
  nutritionRingPctRaw,
  recoveryRingPct,
  sessionTimeNote,
  workoutRingPct,
  workoutRow,
} from './dailyGoal';

const planned = { planned: true, completed: false, setsDone: 0, setsPlanned: 16 };

describe('workoutRingPct', () => {
  it('is 0 before the session starts', () => {
    expect(workoutRingPct(planned)).toBe(0);
  });

  it('fills with sets done when the session is partly done', () => {
    expect(workoutRingPct({ ...planned, setsDone: 4 })).toBe(25);
    expect(workoutRingPct({ ...planned, setsDone: 8 })).toBe(50);
  });

  it('is full once the session is completed, even with sets skipped', () => {
    expect(workoutRingPct({ ...planned, completed: true, setsDone: 12 })).toBe(100);
  });

  it('never passes 100 when extra sets are logged', () => {
    expect(workoutRingPct({ ...planned, setsDone: 20 })).toBe(100);
  });

  it('counts a rest day as complete when nothing is planned', () => {
    expect(workoutRingPct({ planned: false, completed: false, setsDone: 0, setsPlanned: 0 })).toBe(100);
  });

  it('is 0 for a planned day with no sets to count', () => {
    expect(workoutRingPct({ ...planned, setsPlanned: 0 })).toBe(0);
  });
});

describe('nutrition and recovery rings', () => {
  it('nutrition is eaten over target', () => {
    expect(nutritionRingPct(410, 2150)).toBeCloseTo(19.07, 1);
    expect(nutritionRingPct(3000, 2000)).toBe(100);
    expect(nutritionRingPctRaw(3000, 2000)).toBe(150);
    expect(nutritionRingPct(500, 0)).toBe(0);
  });

  it('recovery is the score, or nothing without one', () => {
    expect(recoveryRingPct(64)).toBe(64);
    expect(recoveryRingPct(140)).toBe(100);
    expect(recoveryRingPct(null)).toBeNull();
    expect(recoveryRingPct(undefined)).toBeNull();
  });
});

describe('dailyGoalPct', () => {
  it('averages the three rings', () => {
    // screen 01: workout 0, nutrition 410 / 2150, recovery 64 -> about 28 %
    expect(dailyGoalPct(0, nutritionRingPct(410, 2150), 64)).toBe(28);
    // screen 02: done, 1590 / 2150, recovery 64 -> 79 %
    expect(dailyGoalPct(100, nutritionRingPct(1590, 2150), 64)).toBe(79);
  });

  it('leaves recovery out until there is a score', () => {
    expect(dailyGoalPct(100, 50, null)).toBe(75);
  });

  it('caps nutrition at 100 inside the average', () => {
    expect(dailyGoalPct(100, 150, 100)).toBe(100);
  });
});

describe('isSessionPlannedToday', () => {
  const thursday = new Date(2026, 10, 5, 9, 0); // Thursday 5 Nov 2026, local time

  it('weekday plans: only on their weekdays', () => {
    expect(isSessionPlannedToday(['Monday', 'Thursday'], thursday)).toBe(true);
    expect(isSessionPlannedToday(['Monday', 'Wednesday'], thursday)).toBe(false);
  });

  it('"Day 1, Day 2" plans always have today\'s session', () => {
    expect(isSessionPlannedToday(['Day 1', 'Day 2'], thursday)).toBe(true);
  });

  it('no plan means nothing planned', () => {
    expect(isSessionPlannedToday([], thursday)).toBe(false);
  });
});

describe('row text', () => {
  it('session time in 12-hour form', () => {
    expect(sessionTimeNote('Push day', '18:00')).toBe('Push day at 6 pm');
    expect(sessionTimeNote('Push day', '07:30')).toBe('Push day at 7:30 am');
    expect(sessionTimeNote('Push day', '12:00')).toBe('Push day at 12 pm');
    expect(sessionTimeNote('Push day', null)).toBe('Push day');
  });

  it('workout row by state', () => {
    expect(workoutRow(planned, 'Push day', '18:00')).toEqual({ value: '0 / 1', unit: 'session', note: 'Push day at 6 pm' });
    expect(workoutRow({ ...planned, setsDone: 5 }, 'Push day')).toEqual({ value: '5 / 16', unit: 'sets', note: 'Push day, in progress' });
    expect(workoutRow({ ...planned, completed: true, setsDone: 14 }, 'Push day').note).toBe('Push day · 14 sets');
    expect(workoutRow({ planned: false, completed: false, setsDone: 0, setsPlanned: 0 }, 'Push day').value).toBe('Rest');
  });

  it('nutrition note counts main meals', () => {
    expect(nutritionNote([])).toBe('nothing logged yet');
    expect(nutritionNote(['Breakfast'])).toBe('breakfast logged');
    expect(nutritionNote(['Breakfast', 'Lunch', 'Snack'])).toBe('2 of 3 meals logged');
    expect(nutritionNote(['Snack', 'Snack'])).toBe('snack logged');
  });
});

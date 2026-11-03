import { describe, expect, it } from 'vitest';
import { formatTimer, isTimedModality, loggedMinutes, stepKm, targetMinutes, timerDisplay, usesDistance } from './timedExercise';

describe('isTimedModality', () => {
  it('cardio, mobility and yoga are timed; strength and unknown are not', () => {
    expect(isTimedModality('cardio')).toBe(true);
    expect(isTimedModality('mobility')).toBe(true);
    expect(isTimedModality('yoga')).toBe(true);
    expect(isTimedModality('strength')).toBe(false);
    expect(isTimedModality(null)).toBe(false);
    expect(isTimedModality(undefined)).toBe(false);
  });
});

describe('targetMinutes', () => {
  it('a one-set slot whose reps look like minutes uses them', () => {
    expect(targetMinutes('cardio', 1, 30)).toBe(30);
    expect(targetMinutes('yoga', 1, 45)).toBe(45);
  });

  it('otherwise the modality default', () => {
    expect(targetMinutes('cardio', 3, 10)).toBe(20);
    expect(targetMinutes('mobility', 3, 10)).toBe(10);
    expect(targetMinutes('yoga', 2, 12)).toBe(20);
    expect(targetMinutes('cardio', 1, 3)).toBe(20);
    expect(targetMinutes('cardio', 1, 200)).toBe(20);
  });
});

describe('usesDistance', () => {
  it('walking, running, cycling and measuring machines', () => {
    for (const n of ['Running', 'Jogging', 'Cycling', 'Brisk Walking', 'Power Walking', 'Treadmill Jog', 'Treadmill Walk', 'Stationary Bike', 'Hill Sprints', 'Fartlek Running', 'Rowing Machine', 'Swimming Laps']) {
      expect(usesDistance(n)).toBe(true);
    }
  });

  it('everything else has no distance', () => {
    for (const n of ['Jump Rope', 'Burpee Cardio Circuit', 'High Knees', 'Battle Ropes', 'Sun Salutation', 'Hip Opener Flow']) {
      expect(usesDistance(n)).toBe(false);
    }
  });
});

describe('timer text', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatTimer(0)).toBe('0:00');
    expect(formatTimer(65_000)).toBe('1:05');
    expect(formatTimer(20 * 60_000)).toBe('20:00');
    expect(formatTimer(3_725_000)).toBe('1:02:05');
    expect(formatTimer(-500)).toBe('0:00');
  });

  it('counts down to the target, then counts up as over', () => {
    const target = 20 * 60_000;
    expect(timerDisplay(0, target)).toEqual({ text: '20:00', over: false, fraction: 0 });
    expect(timerDisplay(5 * 60_000, target)).toEqual({ text: '15:00', over: false, fraction: 0.25 });
    expect(timerDisplay(target, target)).toEqual({ text: '+0:00', over: true, fraction: 1 });
    expect(timerDisplay(target + 83_000, target)).toEqual({ text: '+1:23', over: true, fraction: 1 });
  });

  it('with no target it just counts up', () => {
    expect(timerDisplay(61_000, 0)).toEqual({ text: '1:01', over: false, fraction: 0 });
  });
});

describe('loggedMinutes', () => {
  it('the time the timer ran, to one decimal', () => {
    expect(loggedMinutes(18 * 60_000 + 30_000, 20)).toBe(18.5);
    expect(loggedMinutes(15_000, 20)).toBe(0.3);
  });

  it('Done without using the timer logs the target, as planned', () => {
    expect(loggedMinutes(0, 20)).toBe(20);
    expect(loggedMinutes(14_000, 20)).toBe(20);
  });
});

describe('stepKm', () => {
  it('half a kilometre at a time, never below zero', () => {
    expect(stepKm(0, 1)).toBe(0.5);
    expect(stepKm(5, 1)).toBe(5.5);
    expect(stepKm(0.5, -1)).toBe(0);
    expect(stepKm(0, -1)).toBe(0);
    expect(stepKm(2.5, 1)).toBe(3);
  });
});

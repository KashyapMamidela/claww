import { describe, expect, it } from 'vitest';
import { computeDayStates, latestEventForDay, summarizeSession, type DayEventLike, type LoggedSetRow } from './workoutDayState';

const ev = (dayLabel: string, status: 'completed' | 'skipped', createdAt: string): DayEventLike => ({ dayLabel, status, createdAt });

describe('latestEventForDay', () => {
  it('returns the newest event for the day (input is newest first)', () => {
    const events = [ev('Day 1', 'skipped', '2026-10-09T10:00:00Z'), ev('Day 1', 'completed', '2026-10-02T10:00:00Z')];
    expect(latestEventForDay('Day 1', events)?.status).toBe('skipped');
  });

  it('returns null when the day has no events', () => {
    expect(latestEventForDay('Day 3', [ev('Day 1', 'completed', '2026-10-09T10:00:00Z')])).toBeNull();
  });
});

describe('computeDayStates', () => {
  const days = ['Day 1', 'Day 2', 'Day 3'];

  it('marks completed, skipped, suggested and upcoming days', () => {
    const events = [ev('Day 2', 'skipped', '2026-10-09T10:00:00Z'), ev('Day 1', 'completed', '2026-10-08T10:00:00Z')];
    expect(computeDayStates(days, events, 2).map((d) => d.state)).toEqual(['completed', 'skipped', 'suggested']);
  });

  it('uses the most recent event when a day has several', () => {
    const events = [ev('Day 1', 'completed', '2026-10-09T10:00:00Z'), ev('Day 1', 'skipped', '2026-10-02T10:00:00Z')];
    expect(computeDayStates(days, events, 1)[0].state).toBe('completed');
  });

  it('keeps the suggested day startable even if it was completed in an earlier cycle', () => {
    const events = [
      ev('Day 3', 'completed', '2026-10-09T10:00:00Z'),
      ev('Day 2', 'completed', '2026-10-08T10:00:00Z'),
      ev('Day 1', 'completed', '2026-10-07T10:00:00Z'),
    ];
    const states = computeDayStates(days, events, 0);
    expect(states.map((d) => d.state)).toEqual(['suggested', 'completed', 'completed']);
    expect(states[0].event?.status).toBe('completed');
  });

  it('is all upcoming apart from the suggested day with no events', () => {
    expect(computeDayStates(days, [], 0).map((d) => d.state)).toEqual(['suggested', 'upcoming', 'upcoming']);
  });
});

describe('summarizeSession', () => {
  const row = (name: string, set: number, reps: number | null, weight: number | null, at: string, prescribedReps = 10, prescribedWeight = 0): LoggedSetRow => ({
    exercise_name: name,
    sets: set,
    reps_achieved: reps,
    reps_prescribed: prescribedReps,
    weight_achieved: weight,
    weight_prescribed: prescribedWeight,
    completed_at: at,
  });

  it('totals sets and volume and groups sets by exercise in logged order', () => {
    const s = summarizeSession([
      row('Bench Press', 2, 8, 60, '2026-10-09T10:05:00Z'),
      row('Bench Press', 1, 10, 60, '2026-10-09T10:00:00Z'),
      row('Row', 1, 12, 40, '2026-10-09T10:20:00Z'),
    ]);
    expect(s.setsDone).toBe(3);
    expect(s.totalVolumeKg).toBe(10 * 60 + 8 * 60 + 12 * 40);
    expect(s.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Row']);
    expect(s.exercises[0].sets.map((x) => x.setNumber)).toEqual([1, 2]);
    expect(s.startedAt).toBe('2026-10-09T10:00:00Z');
    expect(s.endedAt).toBe('2026-10-09T10:20:00Z');
    expect(s.durationMinutes).toBe(20);
  });

  it('falls back to prescribed reps and weight when achieved is missing', () => {
    const s = summarizeSession([row('Squat', 1, null, null, '2026-10-09T10:00:00Z', 8, 50)]);
    expect(s.totalVolumeKg).toBe(400);
    expect(s.exercises[0].sets[0]).toEqual({ setNumber: 1, reps: 8, weight: 50 });
  });

  it('has no duration with a single set, and an empty summary with no rows', () => {
    expect(summarizeSession([row('Plank', 1, 30, 0, '2026-10-09T10:00:00Z')]).durationMinutes).toBeNull();
    const empty = summarizeSession([]);
    expect(empty).toEqual({ startedAt: null, endedAt: null, durationMinutes: null, setsDone: 0, totalVolumeKg: 0, exercises: [] });
  });
});

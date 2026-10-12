import { describe, expect, it } from 'vitest';
import { catalogKey, inputsForMuscle, lowestMuscle, muscleScores, musclesForExercises, trainedAgoLabel, type Catalog, type CatalogEntry, type LoggedSet } from './muscleRecovery';

const entry = (name: string, primary: string, secondary: string[] = [], stimulus = 'compound'): CatalogEntry => ({
  id: name,
  name,
  modality: 'strength',
  equipment: 'gym',
  primaryMuscle: primary,
  secondaryMuscles: secondary,
  movementPattern: 'horizontal_push',
  role: 'main',
  loadable: true,
  stimulusType: stimulus,
  loadIncrementKg: 2.5,
  harderVariationName: null,
  easierVariationName: null,
});

const catalog: Catalog = Object.fromEntries(
  [entry('Bench Press', 'chest', ['triceps', 'shoulders']), entry('Barbell Back Squat', 'quads', ['glutes']), entry('Dumbbell Bicep Curl', 'biceps', [], 'isolation')].map((e) => [catalogKey(e.name), e])
);

const now = new Date(2026, 9, 12, 18, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const sets = (name: string, n: number, h: number, rir: number | null = 2): LoggedSet[] =>
  Array.from({ length: n }, () => ({ exerciseName: name, completedAt: hoursAgo(h), rir }));

describe('inputsForMuscle', () => {
  it('counts a muscle with no recent sets as fresh', () => {
    const i = inputsForMuscle('chest', [], catalog, now);
    expect(i).toMatchObject({ fatigue: 100, hoursSinceTrained: 96, soreness: null, readiness: null });
  });
  it('builds fatigue and hours since from the primary muscle sets', () => {
    // 6 compound sets at RIR 2 = 6 points -> fatigue 70, trained 30 h ago
    const i = inputsForMuscle('chest', sets('Bench Press', 6, 30), catalog, now);
    expect(i.fatigue).toBe(70);
    expect(Math.round(i.hoursSinceTrained as number)).toBe(30);
    expect(i.rirMissing).toBe(false);
  });
  it('counts secondary muscles at half', () => {
    const i = inputsForMuscle('triceps', sets('Bench Press', 6, 30), catalog, now);
    expect(i.fatigue).toBe(85); // 3 points
  });
  it('ignores sets older than the window and sets of unknown exercises', () => {
    expect(inputsForMuscle('chest', sets('Bench Press', 6, 200), catalog, now).fatigue).toBe(100);
    expect(inputsForMuscle('chest', sets('Mystery Lift', 6, 10), catalog, now).fatigue).toBe(100);
  });
  it('flags missing RIR and passes the check-in through', () => {
    const i = inputsForMuscle('chest', sets('Bench Press', 2, 10, null), catalog, now, { soreness: 3, readiness: 'weak' });
    expect(i.rirMissing).toBe(true);
    expect(i.soreness).toBe(3);
    expect(i.readiness).toBe('weak');
  });
});

describe('muscleScores', () => {
  it('scores each muscle and reports confidence', () => {
    const s = muscleScores(['chest', 'quads'], sets('Bench Press', 12, 20, 1), catalog, now, { chest: { soreness: 2, readiness: 'normal' } });
    // chest: fatigue 25 (12 x 1.25 = 15 pts), time under 24 h -> 20, soreness 2 -> 75, readiness normal -> 85
    // 25*.4 + 20*.25 + 75*.2 + 85*.15 = 10 + 5 + 15 + 12.75 = 42.75
    expect(s.chest.score).toBe(43);
    expect(s.chest.band).toBe('Low');
    expect(s.chest.confidence).toBe('high');
    expect(Math.round(s.chest.hoursSinceTrained as number)).toBe(20);
    // quads: untrained, no check-in -> fresh but low confidence (no soreness or readiness)
    expect(s.quads.score).toBe(Math.round((100 * 0.4 + 100 * 0.25) / 0.65));
    expect(s.quads.confidence).toBe('low');
    expect(s.quads.hoursSinceTrained).toBeNull();
  });
});

describe('musclesForExercises and labels', () => {
  it('lists the primary muscles of the day, once each, ignoring unknown exercises', () => {
    expect(musclesForExercises(['Bench Press', 'Mystery', 'Barbell Back Squat', 'bench press'], catalog)).toEqual(['chest', 'quads']);
  });
  it('words how long ago a muscle was trained', () => {
    expect(trainedAgoLabel(null)).toBe('not trained in the last 4 days');
    expect(trainedAgoLabel(0.2)).toBe('trained just now');
    expect(trainedAgoLabel(5)).toBe('trained 5 h ago');
    expect(trainedAgoLabel(48)).toBe('trained 2 days ago');
    expect(trainedAgoLabel(24)).toBe('trained 1 day ago');
  });
  it('finds the lowest scoring muscle among the given ones', () => {
    const s = muscleScores(['chest', 'quads', 'biceps'], sets('Bench Press', 12, 10, 0), catalog, now);
    expect(lowestMuscle(s, ['quads', 'chest'])?.muscle).toBe('chest');
    expect(lowestMuscle(s, ['quads'])?.muscle).toBe('quads');
    expect(lowestMuscle(s, ['calves'])).toBeNull();
  });
});

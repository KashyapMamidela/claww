import { describe, expect, it } from 'vitest';
import { computeRepRange, initialState } from './engine';
import { catalogKey, type Catalog, type CatalogEntry, type MuscleScore } from './muscleRecovery';
import { commandPill, localDateKey, newStateFor, prescribeDay, reasonLine, sessionOutcomes } from './sessionPrescription';

const entry = (over: Partial<CatalogEntry> & { name: string }): CatalogEntry => ({
  id: over.name,
  modality: 'strength',
  equipment: 'gym',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  movementPattern: 'horizontal_push',
  role: 'main',
  loadable: true,
  stimulusType: 'compound',
  loadIncrementKg: 2.5,
  harderVariationName: null,
  easierVariationName: null,
  ...over,
});

const catalog: Catalog = Object.fromEntries(
  [
    entry({ name: 'Bench Press' }),
    entry({ name: 'Dumbbell Bicep Curl', primaryMuscle: 'biceps', role: 'accessory', stimulusType: 'isolation', loadIncrementKg: 1 }),
    entry({ name: 'Push-Up', equipment: 'none', loadable: false, loadIncrementKg: null, harderVariationName: 'Decline Push-Up' }),
    entry({ name: 'Running', modality: 'cardio', primaryMuscle: 'quads', loadable: false, stimulusType: 'conditioning' }),
  ].map((e) => [catalogKey(e.name), e])
);

const range = computeRepRange('muscle_gain', 'intermediate', 30); // 6-12 reps
const fresh = (muscle: string, score: number): Record<string, MuscleScore> => ({
  [muscle]: { muscle, score, band: 'Good', confidence: 'high', missing: [], hoursSinceTrained: 72 },
});
const base = { catalog, progress: {}, range, muscleScores: {}, sleepHours: 8, proteinPct: 1 };

describe('prescribeDay', () => {
  it('a new loadable exercise starts with the plan numbers and asks the user to calibrate', () => {
    const [p] = prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }] });
    expect(p.managed).toBe(true);
    expect(p.isNew).toBe(true);
    expect(p.prescription.commands).toEqual(['CALIBRATE']);
    expect(p.prescription.weightKg).toBeNull();
    expect(p.prescription).toMatchObject({ reps: 8, sets: 3 });
    expect(p.state).toMatchObject({ repMin: 6, repMax: 10 });
  });
  it('seeds the weight from the last session so existing users do not start over', () => {
    const [p] = prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }], lastWeights: { [catalogKey('Bench Press')]: 60 } });
    expect(p.prescription.weightKg).toBe(60);
    expect(p.prescription.commands).not.toContain('CALIBRATE');
  });
  it('uses stored state and shows the engine decision with its reason', () => {
    const stored = { ...initialState({ repMin: 6, repMax: 10, startReps: 8, sets: 3, weightKg: 60 }), next: { weightKg: 62.5, repTarget: 6, sets: 3 }, pendingCommands: ['INCREASE_WEIGHT' as const], pendingReason: 'Top of range.' };
    const [p] = prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }], progress: { [catalogKey('Bench Press')]: stored } });
    expect(p.isNew).toBe(false);
    expect(p.prescription).toMatchObject({ weightKg: 62.5, reps: 6, sets: 3, commands: ['INCREASE_WEIGHT'] });
    expect(reasonLine(p)).toBe('Top of range.');
  });
  it('a low muscle score blocks progression and takes a set off', () => {
    const stored = { ...initialState({ repMin: 6, repMax: 10, startReps: 8, sets: 3, weightKg: 60 }), next: { weightKg: 62.5, repTarget: 6, sets: 3 }, last: { weightKg: 60, repTarget: 10, sets: 3 } };
    const [p] = prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }], progress: { [catalogKey('Bench Press')]: stored }, muscleScores: fresh('chest', 44) });
    expect(p.prescription).toMatchObject({ weightKg: 60, reps: 10, sets: 2 });
    expect(p.muscleScore).toBe(44);
  });
  it('gives an accessory the upper part of the rep range', () => {
    const [p] = prescribeDay({ ...base, exercises: [{ name: 'Dumbbell Bicep Curl', sets: 3, reps: 12 }] });
    expect(p.state).toMatchObject({ repMin: 8, repMax: 12 });
  });
  it('a bodyweight exercise needs no calibration', () => {
    const [p] = prescribeDay({ ...base, exercises: [{ name: 'Push-Up', sets: 3, reps: 10 }] });
    expect(p.prescription.commands).not.toContain('CALIBRATE');
    expect(p.prescription.weightKg).toBeNull();
    expect(p.meta?.hasHarderVariation).toBe(true);
  });
  it('leaves cardio and unknown exercises on the plan numbers, unmanaged', () => {
    const ps = prescribeDay({ ...base, exercises: [{ name: 'Running', sets: 1, reps: 20 }, { name: 'Mystery Lift', sets: 4, reps: 9 }] });
    expect(ps.map((p) => p.managed)).toEqual([false, false]);
    expect(ps[1].prescription).toMatchObject({ reps: 9, sets: 4 });
    expect(reasonLine(ps[1])).toBe('');
  });
});

describe('newStateFor', () => {
  it('clamps the plan reps into the role range', () => {
    const e = catalog[catalogKey('Bench Press')];
    expect(newStateFor({ name: 'Bench Press', sets: 3, reps: 20 }, e, range, 50).next.repTarget).toBe(10);
    expect(newStateFor({ name: 'Bench Press', sets: 3, reps: 2 }, e, range, 50).next.repTarget).toBe(6);
    expect(newStateFor({ name: 'Bench Press', sets: 3, reps: 8 }, e, range, 50).next.weightKg).toBe(50);
  });
});

describe('commandPill', () => {
  it('names the change', () => {
    expect(commandPill(['INCREASE_WEIGHT']).label).toBe('Weight up');
    expect(commandPill(['INCREASE_REPS']).label).toBe('Reps up');
    expect(commandPill(['DECREASE_WEIGHT']).tone).toBe('down');
    expect(commandPill(['BLOCK_PROGRESSION', 'REDUCE_SETS_TODAY']).label).toBe('Sets down');
    expect(commandPill(['INCREASE_SETS']).label).toBe('Sets up');
    expect(commandPill(['CALIBRATE']).tone).toBe('info');
    expect(commandPill(['HOLD']).label).toBe('Hold');
    expect(commandPill([]).label).toBe('Hold');
  });
});

describe('sessionOutcomes', () => {
  const stored = { ...initialState({ repMin: 6, repMax: 10, startReps: 8, sets: 3, weightKg: 60 }) };
  const prescribed = () => prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }], progress: { [catalogKey('Bench Press')]: stored } });
  const rows = (reps: number[], weight = 60) => reps.map((r) => ({ reps: r, weight, done: true }));

  it('runs the performance step on logged sets', () => {
    const out = sessionOutcomes(prescribed(), { 'Bench Press': rows([8, 8, 8]) }, '2026-10-12');
    expect(out).toHaveLength(1);
    expect(out[0].evaluation.commands).toEqual(['INCREASE_REPS']);
    expect(out[0].evaluation.state.next.repTarget).toBe(9);
    expect(out[0].evaluation.state.lastSessionDate).toBe('2026-10-12');
  });
  it('skips exercises with no logged set, unmanaged ones and loadable sets without a weight', () => {
    expect(sessionOutcomes(prescribed(), {}, '2026-10-12')).toEqual([]);
    expect(sessionOutcomes(prescribed(), { 'Bench Press': [{ reps: 8, weight: 60, done: false }] }, '2026-10-12')).toEqual([]);
    expect(sessionOutcomes(prescribed(), { 'Bench Press': rows([8, 8, 8], 0) }, '2026-10-12')).toEqual([]);
    const cardio = prescribeDay({ ...base, exercises: [{ name: 'Running', sets: 1, reps: 20 }] });
    expect(sessionOutcomes(cardio, { Running: rows([20], 0) }, '2026-10-12')).toEqual([]);
  });
  it('the first session of a calibrating exercise takes the weight the user chose', () => {
    const p = prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }] });
    const out = sessionOutcomes(p, { 'Bench Press': rows([8, 8, 8], 45) }, '2026-10-12');
    expect(out[0].evaluation.state.next.weightKg).toBe(45);
    expect(out[0].evaluation.state.last?.weightKg).toBe(45);
  });
  it('a reduced day does not move the pending decision', () => {
    const blockedStored = { ...stored, next: { weightKg: 62.5, repTarget: 6, sets: 3 }, last: { weightKg: 60, repTarget: 10, sets: 3 } };
    const p = prescribeDay({ ...base, exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }], progress: { [catalogKey('Bench Press')]: blockedStored }, muscleScores: fresh('chest', 40) });
    const out = sessionOutcomes(p, { 'Bench Press': rows([10, 10], 60) }, '2026-10-12');
    expect(out[0].evaluation.state.next).toEqual(blockedStored.next);
  });
});

describe('localDateKey', () => {
  it('formats the local calendar date', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

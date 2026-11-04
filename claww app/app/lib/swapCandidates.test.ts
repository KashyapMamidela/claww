import { describe, expect, it } from 'vitest';
import { swapCandidates } from './swapCandidates';
import type { CatalogEntry } from './muscleRecovery';

const e = (name: string, over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: name,
  name,
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

const bench = e('Bench Press');
const pool: CatalogEntry[] = [
  bench,
  e('Incline Bench Press'),
  e('Dumbbell Chest Press', { equipment: 'home' }),
  e('Push-Up', { equipment: 'none', role: 'main' }),
  e('Decline Push-Up', { equipment: 'none' }),
  e('Cable Fly', { role: 'accessory', stimulusType: 'isolation' }),
  e('Overhead Press', { primaryMuscle: 'shoulders', movementPattern: 'vertical_push' }),
  e('Cardio Row', { modality: 'cardio' }),
  e('Squat', { primaryMuscle: 'quads', movementPattern: 'squat' }),
  e('Chest Press Machine Wide', { movementPattern: 'horizontal_push', primaryMuscle: 'chest', equipment: 'gym', role: 'accessory' }),
];
const base = { todayNames: ['Bench Press', 'Face Pull'], equipment: 'gym', injuriesText: null as string | null };

describe('swapCandidates', () => {
  it('same primary muscle and movement pattern only, never the current exercise', () => {
    const names = swapCandidates(bench, pool, base).map((x) => x.name);
    expect(names).not.toContain('Bench Press');
    expect(names).not.toContain('Overhead Press');
    expect(names).not.toContain('Squat');
    expect(names).not.toContain('Cardio Row');
    expect(names).toContain('Incline Bench Press');
    expect(names).toContain('Dumbbell Chest Press');
  });

  it('respects the equipment tier: a home user gets no gym exercises, a bodyweight user only bodyweight', () => {
    const home = swapCandidates(bench, pool, { ...base, equipment: 'home' }).map((x) => x.name);
    expect(home).toEqual(expect.arrayContaining(['Dumbbell Chest Press', 'Push-Up']));
    expect(home).not.toContain('Incline Bench Press');
    const none = swapCandidates(bench, pool, { ...base, equipment: 'none' }).map((x) => x.name);
    expect(none.sort()).toEqual(['Decline Push-Up', 'Push-Up']);
  });

  it('drops anything already in today\'s session', () => {
    const names = swapCandidates(bench, pool, { ...base, todayNames: ['Bench Press', 'Incline Bench Press'] }).map((x) => x.name);
    expect(names).not.toContain('Incline Bench Press');
  });

  it('drops exercises the injury filter excludes (shoulder: bench and push-ups)', () => {
    const names = swapCandidates(bench, pool, { ...base, injuriesText: 'my shoulder hurts' }).map((x) => x.name);
    expect(names).not.toContain('Incline Bench Press');
    expect(names).not.toContain('Push-Up');
    expect(names).toContain('Dumbbell Chest Press');
  });

  it('same role first, then same equipment, then by name', () => {
    const names = swapCandidates(bench, pool, base).map((x) => x.name);
    // main + gym first, then main on other equipment (by name), then accessories (by name)
    expect(names).toEqual(['Incline Bench Press', 'Decline Push-Up', 'Dumbbell Chest Press', 'Push-Up', 'Cable Fly', 'Chest Press Machine Wide']);
  });

  it('at most six', () => {
    const many = Array.from({ length: 12 }, (_, i) => e(`Press ${i}`));
    expect(swapCandidates(bench, [bench, ...many], base)).toHaveLength(6);
  });

  it('nothing when the exercise has no catalog muscle or pattern', () => {
    expect(swapCandidates(e('Mystery', { primaryMuscle: null }), pool, base)).toEqual([]);
    expect(swapCandidates(e('Mystery', { movementPattern: null }), pool, base)).toEqual([]);
  });

  it('drops patterns a structured injury rules out (NG PHASE 5)', () => {
    const none = swapCandidates(bench, pool, { ...base, injuries: [{ part: 'shoulder', severity: 'severe' }] });
    expect(none).toEqual([]);
    const some = swapCandidates(bench, pool, { ...base, injuries: [{ part: 'knee', severity: 'moderate' }] });
    expect(some.length).toBeGreaterThan(0);
  });
});

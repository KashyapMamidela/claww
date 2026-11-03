import { describe, expect, it } from 'vitest';
import { plateLoad, plateText, warmupSets } from './plateMath';

describe('plateLoad (20 to 200 kg, bar 20)', () => {
  it('60 kg is 20 a side, as on screen 07', () => {
    const l = plateLoad(60)!;
    expect(l.perSide).toEqual([20]);
    expect(l.loadedKg).toBe(60);
    expect(l.note).toBeNull();
    expect(plateText(l)).toBe('Bar 20 + 20 a side');
  });

  it('every multiple of 2.5 from 20 to 200 loads exactly', () => {
    for (let kg = 20; kg <= 200; kg += 2.5) {
      const l = plateLoad(kg)!;
      expect(l.loadedKg).toBe(kg);
      expect(l.note).toBeNull();
    }
  });

  it('greedy: heaviest plates first, small ones last', () => {
    expect(plateLoad(100)!.perSide).toEqual([25, 15]);
    expect(plateLoad(62.5)!.perSide).toEqual([20, 1.25]);
    expect(plateLoad(142.5)!.perSide).toEqual([25, 25, 10, 1.25]);
  });

  it('the bar alone, and lighter than the bar', () => {
    expect(plateLoad(20)!.perSide).toEqual([]);
    expect(plateText(plateLoad(20)!)).toBe('Bar 20');
    expect(plateLoad(15)!.note).toBe('Lighter than the 20 kg bar');
  });

  it('impossible weights round down with a note', () => {
    const l = plateLoad(61)!;
    expect(l.loadedKg).toBe(60);
    expect(l.note).toBe('Loads 60 kg');
    expect(plateLoad(61.7)!.loadedKg).toBe(60);
    expect(plateLoad(63.9)!.loadedKg).toBe(62.5);
  });

  it('uses the profile bar weight (15 kg women\'s bar, 25 kg)', () => {
    expect(plateLoad(50, 15)!.perSide).toEqual([15, 2.5]);
    expect(plateLoad(60, 25)!.perSide).toEqual([15, 2.5]);
  });

  it('bad input is nothing', () => {
    expect(plateLoad(0)).toBeNull();
    expect(plateLoad(-5)).toBeNull();
    expect(plateLoad(NaN)).toBeNull();
    expect(plateLoad(60, 0)).toBeNull();
  });
});

describe('warmupSets', () => {
  it('60 kg: 30 x 8 then 45 x 3 (the bar is 20, so 30 is above it)', () => {
    expect(warmupSets(60)).toEqual([
      { weight: 30, reps: 8, pct: 50 },
      { weight: 45, reps: 3, pct: 75 },
    ]);
  });

  it('80 kg: 40 x 8 then 60 x 3', () => {
    expect(warmupSets(80).map((w) => [w.weight, w.reps])).toEqual([[40, 8], [60, 3]]);
  });

  it('never below the bar', () => {
    expect(warmupSets(30)).toEqual([{ weight: 20, reps: 8, pct: 50 }]);
  });

  it('nothing for light or unloaded work', () => {
    expect(warmupSets(null)).toEqual([]);
    expect(warmupSets(0)).toEqual([]);
    expect(warmupSets(22.5)).toEqual([]);
    expect(warmupSets(25)).toEqual([]);
  });

  it('warm-ups always rise and stay under the work weight', () => {
    for (let kg = 30; kg <= 200; kg += 2.5) {
      const w = warmupSets(kg);
      for (let i = 0; i < w.length; i++) {
        expect(w[i].weight).toBeLessThan(kg);
        expect(w[i].weight).toBeGreaterThanOrEqual(20);
        if (i > 0) expect(w[i].weight).toBeGreaterThan(w[i - 1].weight);
      }
    }
  });
});

import { isBarbellLift, targetDiffers } from './plateMath';

describe('isBarbellLift (catalog names, 2026-11-03)', () => {
  it('barbell lifts', () => {
    for (const n of ['Barbell Back Squat', 'Barbell Front Squat', 'Bench Press', 'Incline Bench Press', 'Bent-Over Row', 'Deadlift', 'Overhead Press', 'Romanian Deadlift']) {
      expect(isBarbellLift(n)).toBe(true);
    }
  });

  it('dumbbells, machines, cables and bodyweight are not', () => {
    for (const n of ['Dumbbell Chest Press', 'Dumbbell Romanian Deadlift', 'Dumbbell Bent-Over Row', 'Cable Row', 'Lat Pulldown', 'Pull-Up', 'Push-Up', 'Bodyweight Squat', 'Goblet Squat']) {
      expect(isBarbellLift(n)).toBe(false);
    }
  });

  it('is case and space tolerant', () => {
    expect(isBarbellLift('  bench press ')).toBe(true);
  });
});

describe('targetDiffers', () => {
  it('a mark only when today is not the plan', () => {
    expect(targetDiffers(62.5, 60)).toBe(true);
    expect(targetDiffers(60, 60)).toBe(false);
    expect(targetDiffers(60, 60.004)).toBe(false);
  });

  it('never for bodyweight or missing numbers', () => {
    expect(targetDiffers(null, 60)).toBe(false);
    expect(targetDiffers(60, null)).toBe(false);
    expect(targetDiffers(0, 0)).toBe(false);
  });
});

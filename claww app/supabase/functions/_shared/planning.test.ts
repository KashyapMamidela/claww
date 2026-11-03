import { describe, expect, it } from 'vitest';
import { deriveAllowedEquipment, groundPlanInCatalog, type CatalogExercise, type GroundablePlan } from './planning.ts';

describe('deriveAllowedEquipment', () => {
  it('none tier only allows none — excludes home and gym movements', () => {
    expect(deriveAllowedEquipment('none')).toEqual(['none']);
  });

  it('home tier allows none + home, still excludes gym', () => {
    expect(deriveAllowedEquipment('home')).toEqual(['none', 'home']);
  });

  it('gym tier allows all three (a gym-goer can still do bodyweight moves)', () => {
    expect(deriveAllowedEquipment('gym')).toEqual(['none', 'home', 'gym']);
  });

  it('unrecognized or missing equipment defaults to the gym tier', () => {
    expect(deriveAllowedEquipment(null)).toEqual(['none', 'home', 'gym']);
    expect(deriveAllowedEquipment(undefined)).toEqual(['none', 'home', 'gym']);
    expect(deriveAllowedEquipment('not-a-real-tier')).toEqual(['none', 'home', 'gym']);
  });

  it('excludes gym-only movements from a real exercise pool when equipment is none', () => {
    // The actual bug this guards: a gym-only exercise slipping into a
    // bodyweight-only user's pool. Simulates generate-plan's own
    // `.in('equipment', allowedEquipment)` filter as a plain array filter.
    const pool = [
      { name: 'Push-Up', equipment: 'none' },
      { name: 'Bodyweight Squat', equipment: 'none' },
      { name: 'Barbell Back Squat', equipment: 'gym' },
      { name: 'Dumbbell Lunge', equipment: 'home' },
    ];
    const allowed = deriveAllowedEquipment('none');
    const filtered = pool.filter((ex) => allowed.includes(ex.equipment));
    expect(filtered.map((ex) => ex.name)).toEqual(['Push-Up', 'Bodyweight Squat']);
    expect(filtered.some((ex) => ex.equipment === 'gym')).toBe(false);
  });
});

describe('groundPlanInCatalog', () => {
  const catalog: CatalogExercise[] = [
    { id: 'ex-1', name: 'Push-Up' },
    { id: 'ex-2', name: 'Bodyweight Squat' },
  ];

  it('drops a hallucinated exercise name the model returned that was never offered', () => {
    const plan: GroundablePlan = {
      days: [
        {
          day: 'Day 1',
          focus: 'Full Body',
          exercises: [
            { name: 'Push-Up', sets: 3, reps: 10 },
            { name: 'Laser Squat 9000', sets: 3, reps: 10 }, // hallucinated — never in the catalog
          ],
        },
      ],
    };

    const grounded = groundPlanInCatalog(plan, catalog);

    expect(grounded.days).toHaveLength(1);
    expect(grounded.days[0].exercises.map((ex) => ex.name)).toEqual(['Push-Up']);
  });

  it('drops a whole day if every exercise in it was hallucinated', () => {
    const plan: GroundablePlan = {
      days: [
        { day: 'Day 1', focus: 'Real', exercises: [{ name: 'Push-Up', sets: 3, reps: 10 }] },
        { day: 'Day 2', focus: 'Fake', exercises: [{ name: 'Invisible Deadlift', sets: 3, reps: 10 }] },
      ],
    };

    const grounded = groundPlanInCatalog(plan, catalog);

    expect(grounded.days).toHaveLength(1);
    expect(grounded.days[0].day).toBe('Day 1');
  });

  it('rewrites exerciseId to the real catalog id, case-insensitively, ignoring anything the model sent', () => {
    const plan: GroundablePlan = {
      days: [
        {
          day: 'Day 1',
          focus: 'Full Body',
          exercises: [{ exerciseId: 'made-up-id', name: 'push-up', sets: 3, reps: 10 }],
        },
      ],
    };

    const grounded = groundPlanInCatalog(plan, catalog);

    expect(grounded.days[0].exercises[0].exerciseId).toBe('ex-1');
  });

  it('an entirely hallucinated plan grounds down to zero days', () => {
    const plan: GroundablePlan = {
      days: [{ day: 'Day 1', focus: 'Fake', exercises: [{ name: 'Nonexistent Move', sets: 3, reps: 10 }] }],
    };

    const grounded = groundPlanInCatalog(plan, catalog);

    expect(grounded.days).toHaveLength(0);
  });
});

import { applyTrainingWeekdays } from './planning';

describe('applyTrainingWeekdays', () => {
  const plan = { days: [{ day: 'Day 1 - Push' }, { day: 'Pull' }, { day: 'monday legs' }] };
  it('labels the generated days with the picked weekdays in calendar order', () => {
    expect(applyTrainingWeekdays(plan, ['Friday', 'monday', 'Wednesday']).days.map((d) => d.day)).toEqual(['Monday', 'Wednesday', 'Friday']);
  });
  it('drops generated days beyond the picks', () => {
    expect(applyTrainingWeekdays(plan, ['Tuesday', 'Thursday']).days.map((d) => d.day)).toEqual(['Tuesday', 'Thursday']);
  });
  it('keeps fewer generated days than picks without inventing any', () => {
    expect(applyTrainingWeekdays({ days: [{ day: 'x' }] }, ['Monday', 'Tuesday']).days).toEqual([{ day: 'Monday' }]);
  });
  it('ignores unknown names and repeats, and leaves the plan alone without picks', () => {
    expect(applyTrainingWeekdays(plan, ['Funday', 'Monday', 'monday']).days.map((d) => d.day)).toEqual(['Monday']);
    expect(applyTrainingWeekdays(plan, null)).toBe(plan);
    expect(applyTrainingWeekdays(plan, [])).toBe(plan);
    expect(applyTrainingWeekdays(plan, ['Funday'])).toBe(plan);
  });
});

import { computeRepRange, startingPrescription } from './planning';

describe('computeRepRange', () => {
  it('uses the goal range, capped by experience', () => {
    expect(computeRepRange('muscle_gain', 'advanced', 30)).toEqual({ minSets: 3, maxSets: 5, minReps: 6, maxReps: 12 });
    expect(computeRepRange('muscle_gain', 'beginner', 30).maxSets).toBe(3);
  });
  it('falls back to maintenance for an unknown goal', () => {
    expect(computeRepRange(null, null, null)).toEqual({ minSets: 2, maxSets: 4, minReps: 8, maxReps: 15 });
  });
  it('moves older adults away from heavy low-rep work', () => {
    const r = computeRepRange('muscle_gain', 'advanced', 66);
    expect(r.maxSets).toBe(3);
    expect(r.minReps).toBe(10);
  });
});

describe('startingPrescription', () => {
  const gain = computeRepRange('muscle_gain', 'intermediate', 30); // 6-12 reps, 3-4 sets
  it('gives a main lift the lower part of the range and starts mid-range', () => {
    expect(startingPrescription(gain, 'main')).toEqual({ repMin: 6, repMax: 10, sets: 3, startReps: 8 });
  });
  it('gives an accessory the upper part of the range', () => {
    expect(startingPrescription(gain, 'accessory')).toEqual({ repMin: 8, repMax: 12, sets: 3, startReps: 10 });
  });
  it('uses the whole range when the role is unknown', () => {
    expect(startingPrescription(gain, null)).toEqual({ repMin: 6, repMax: 12, sets: 3, startReps: 9 });
  });
  it('keeps sets inside the goal range', () => {
    expect(startingPrescription(computeRepRange('flexibility', 'beginner', 30), 'main').sets).toBeLessThanOrEqual(3);
    expect(startingPrescription(computeRepRange('fat_loss', 'beginner', 30), 'main').sets).toBe(3);
    expect(startingPrescription({ minSets: 1, maxSets: 2, minReps: 10, maxReps: 12 }, 'main').sets).toBe(2);
  });
  it('never returns an inverted range', () => {
    const r = startingPrescription({ minSets: 1, maxSets: 3, minReps: 20, maxReps: 20 }, 'accessory');
    expect(r.repMax).toBeGreaterThanOrEqual(r.repMin);
  });
});

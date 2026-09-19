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

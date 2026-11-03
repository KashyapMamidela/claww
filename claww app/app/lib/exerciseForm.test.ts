import { describe, expect, it } from 'vitest';
import { cueIndexForSet, hasFormContent, toExerciseForm } from './exerciseForm';

describe('toExerciseForm', () => {
  it('returns null without form steps, so the strip never renders empty', () => {
    expect(toExerciseForm(null)).toBeNull();
    expect(toExerciseForm({ primary_muscle: 'chest', form_steps: [] })).toBeNull();
    expect(toExerciseForm({ primary_muscle: 'chest', form_steps: ['  ', ''] })).toBeNull();
  });

  it('trims and normalises the fields', () => {
    expect(
      toExerciseForm({
        primary_muscle: ' chest ',
        secondary_muscles: ['triceps', ' shoulders', ''],
        form_steps: ['Grip just outside shoulders', ' Lower to mid-chest ', 'Press up'],
        common_mistake: ' Flaring elbows ',
      })
    ).toEqual({
      primaryMuscle: 'chest',
      secondaryMuscles: ['triceps', 'shoulders'],
      formSteps: ['Grip just outside shoulders', 'Lower to mid-chest', 'Press up'],
      commonMistake: 'Flaring elbows',
    });
  });

  it('tolerates missing optional fields', () => {
    const form = toExerciseForm({ form_steps: ['One'] });
    expect(form).toEqual({ primaryMuscle: null, secondaryMuscles: [], formSteps: ['One'], commonMistake: null });
    expect(hasFormContent(form)).toBe(true);
  });
});

describe('cueIndexForSet', () => {
  it('advances one cue per set and wraps', () => {
    expect([0, 1, 2, 3, 4].map((s) => cueIndexForSet(3, s))).toEqual([0, 1, 2, 0, 1]);
  });

  it('is 0 with no steps or a negative set', () => {
    expect(cueIndexForSet(0, 2)).toBe(0);
    expect(cueIndexForSet(3, -1)).toBe(0);
  });
});

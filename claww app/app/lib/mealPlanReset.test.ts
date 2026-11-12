import { describe, expect, it } from 'vitest';
import { foodGoalFrom, freshTargets, targetsChange } from './mealPlanReset';

describe('start my meal plan over', () => {
  it('starts from the saved food goal, else the training goal', () => {
    expect(foodGoalFrom('muscle_gain', 'lose')).toBe('lose');
    expect(foodGoalFrom('fat_loss')).toBe('lose');
    expect(foodGoalFrom('muscle_gain')).toBe('gain');
    expect(foodGoalFrom('strength')).toBe('maintain');
    expect(foodGoalFrom(null)).toBe('maintain');
  });

  it('recalculates targets from today\'s numbers, lower for losing fat than for building muscle', () => {
    const base = { height: 178, weight: 75, age: 25, gender: 'male', activityLevel: 'moderate' as const };
    const lose = freshTargets({ ...base, foodGoal: 'lose' })!;
    const keep = freshTargets({ ...base, foodGoal: 'maintain' })!;
    const gain = freshTargets({ ...base, foodGoal: 'gain' })!;
    expect(lose.calories).toBeLessThan(keep.calories);
    expect(keep.calories).toBeLessThan(gain.calories);
    expect(keep.calories - lose.calories).toBe(500);
  });

  it('asks for the basics first when one is missing', () => {
    expect(freshTargets({ height: 0, weight: 75, age: 25, gender: null, foodGoal: 'maintain' })).toBeNull();
  });

  it('shows the old value next to a changed one', () => {
    const next = { calories: 2150, protein_g: 130, carbs_g: 250, fats_g: 60 };
    expect(targetsChange(next, { calories: 2400, protein_g: 130, carbs_g: 280, fats_g: 70 })).toEqual({ kcal: '2,150 kcal, was 2,400', protein: '130 g protein' });
    expect(targetsChange(next, null)).toEqual({ kcal: '2,150 kcal', protein: '130 g protein' });
  });
});

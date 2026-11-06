import { describe, expect, it } from 'vitest';
import { BURN_GOAL_FLOOR, burnedGoal, burnedPct, defaultBurnedGoal, stepBurnedGoal } from './burnGoal';
import { bmrFor } from './nutrition';

describe('burned goal', () => {
  it('is round10(BMR x (multiplier - 1.2)), never under 250', () => {
    expect(defaultBurnedGoal(1700, 1.45)).toBe(430); // 425 rounds to 430
    expect(defaultBurnedGoal(1700, 1.7)).toBe(850);
    expect(defaultBurnedGoal(1700, 1.2)).toBe(BURN_GOAL_FLOOR); // sedentary gives 0, so the floor
    expect(defaultBurnedGoal(1000, 1.45)).toBe(BURN_GOAL_FLOOR); // 250 exactly
  });
  it('derives from the profile, using the same BMR as the calorie goal', () => {
    const bmr = bmrFor({ height: 178, weight: 75, age: 25, gender: 'male' });
    expect(burnedGoal({ stored: null, height: 178, weight: 75, age: 25, gender: 'male', activityLevel: 'moderate' })).toBe(defaultBurnedGoal(bmr, 1.45));
  });
  it('a stored goal wins, and a missing profile gives null rather than a guess', () => {
    expect(burnedGoal({ stored: 600, height: null, weight: null, age: null, gender: null, activityLevel: null })).toBe(600);
    expect(burnedGoal({ stored: null, height: null, weight: 70, age: 25, gender: 'male', activityLevel: 'moderate' })).toBeNull();
    expect(burnedGoal({ stored: 100, height: null, weight: null, age: null, gender: null, activityLevel: null })).toBeNull(); // under the floor is ignored
  });
  it('percentage', () => {
    expect(burnedPct(120, 410)).toBeCloseTo(29.27, 1);
    expect(burnedPct(null, 410)).toBe(0);
    expect(burnedPct(500, null)).toBe(0);
    expect(burnedPct(820, 410)).toBe(200);
  });
  it('steps by 50 within the floor and the ceiling', () => {
    expect(stepBurnedGoal(400, 1)).toBe(450);
    expect(stepBurnedGoal(250, -1)).toBe(250);
    expect(stepBurnedGoal(3000, 1)).toBe(3000);
  });
});

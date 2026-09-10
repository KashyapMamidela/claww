import { describe, expect, it } from 'vitest';
import { computeNutritionSample } from './nutrition';

// Mifflin-St Jeor: bmrMale = 10*kg + 6.25*cm - 5*age + 5
//                  bmrFemale = 10*kg + 6.25*cm - 5*age - 161
// tdee = bmr * activityMultiplier; calories = round(max(1200, tdee + goalAdjustment))
// protein_g = round(kg * PROTEIN_G_PER_KG[goal]); fats_g = round(calories*0.25/9)
// carbs_g = round(max(0, calories - protein_g*4 - fats_g*9) / 4)
//
// Every expected number below is hand-derived from the formula in
// computeNutritionSample, not copied from claww-phased-prompts.md's "already
// verified" 178/75/25/male/muscle_gain/moderate case — that doc's numbers
// (135g protein, 394g carbs) match a 1.8g/kg protein rate, but the code
// currently uses 2.0g/kg for muscle_gain (PROTEIN_G_PER_KG.muscle_gain),
// which computes to 150g protein / 379g carbs instead. Flagged to the user;
// this test asserts what the code actually does today so it protects
// against future regressions of the real behavior, not a stale number.

describe('computeNutritionSample', () => {
  it('male, muscle_gain, moderate activity', () => {
    // bmr = 10*75 + 6.25*178 - 5*25 + 5 = 1742.5
    // tdee = 1742.5 * 1.45 = 2526.625; +300 (muscle_gain) = 2826.625 -> 2827
    // protein = round(75 * 2.0) = 150; fats = round(2827*0.25/9) = 79
    // carbs = round((2827 - 150*4 - 79*9) / 4) = round(1516/4) = 379
    const result = computeNutritionSample({
      height: 178,
      weight: 75,
      age: 25,
      gender: 'male',
      goal: 'muscle_gain',
      activityLevel: 'moderate',
    });
    expect(result).toEqual({ calories: 2827, protein_g: 150, carbs_g: 379, fats_g: 79 });
  });

  it('female, maintenance, moderate activity', () => {
    // bmr = 10*60 + 6.25*165 - 5*28 - 161 = 1330.25
    // tdee = 1330.25 * 1.45 = 1928.8625 -> +0 (maintenance) -> 1929
    // protein = round(60 * 1.6) = 96; fats = round(1929*0.25/9) = 54
    // carbs = round((1929 - 96*4 - 54*9) / 4) = round(1059/4) = 265
    const result = computeNutritionSample({
      height: 165,
      weight: 60,
      age: 28,
      gender: 'female',
      goal: 'maintenance',
      activityLevel: 'moderate',
    });
    expect(result).toEqual({ calories: 1929, protein_g: 96, carbs_g: 265, fats_g: 54 });
  });

  it('low end of the weight range hits the 1200 kcal floor', () => {
    // bmr = 10*40 + 6.25*150 - 5*20 - 161 = 1076.5
    // tdee = 1076.5 * 1.2 = 1291.8; -500 (fat_loss) = 791.8 -> below the
    // floor, so calories clamps to max(1200, 791.8) = 1200, not the raw TDEE.
    // protein = round(40 * 2.2) = 88; fats = round(1200*0.25/9) = 33
    // carbs = round((1200 - 88*4 - 33*9) / 4) = round(551/4) = 138
    const result = computeNutritionSample({
      height: 150,
      weight: 40,
      age: 20,
      gender: 'female',
      goal: 'fat_loss',
      activityLevel: 'sedentary',
    });
    expect(result).toEqual({ calories: 1200, protein_g: 88, carbs_g: 138, fats_g: 33 });
  });
});

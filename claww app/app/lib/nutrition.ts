// Pure nutrition-formula logic, deliberately dependency-free — no Supabase
// import, no React Native import — so it's testable with a plain Node test
// runner. `data.ts` re-exports everything here for existing call sites;
// this file is the source of truth for these types and the formula.

export type Goal = 'muscle_gain' | 'fat_loss' | 'endurance' | 'maintenance' | 'flexibility';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active';

export interface NutritionDefaults {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

/**
 * Mifflin-St Jeor BMR -> TDEE -> goal-adjusted calories -> macro split.
 * Deterministic and instant — no LLM involved, this is a solved formula,
 * not a generation problem. Produces the "sample plan" nutrition-setup
 * shows before the user customizes it.
 */
export function computeNutritionSample(input: {
  height: number;
  weight: number;
  age: number;
  gender: string | null;
  goal: Goal | null;
  activityLevel: ActivityLevel;
}): NutritionDefaults {
  const bmrMale = 10 * input.weight + 6.25 * input.height - 5 * input.age + 5;
  const bmrFemale = 10 * input.weight + 6.25 * input.height - 5 * input.age - 161;
  const bmr = input.gender === 'male' ? bmrMale : input.gender === 'female' ? bmrFemale : (bmrMale + bmrFemale) / 2;

  const activityMultiplier: Record<ActivityLevel, number> = { sedentary: 1.2, moderate: 1.45, active: 1.7 };
  const tdee = bmr * activityMultiplier[input.activityLevel];

  const goalAdjustment = input.goal === 'fat_loss' ? -500 : input.goal === 'muscle_gain' ? 300 : 0;
  const calories = Math.round(Math.max(1200, tdee + goalAdjustment));

  // Protein floor scales with goal, like a coach would set it — a cutting
  // client needs more protein per kg to preserve lean mass in a deficit
  // than someone just maintaining.
  const PROTEIN_G_PER_KG: Record<Goal, number> = {
    fat_loss: 2.2,
    muscle_gain: 2.0,
    maintenance: 1.6,
    endurance: 1.4,
    flexibility: 1.2,
  };
  const proteinPerKg = input.goal ? PROTEIN_G_PER_KG[input.goal] : 1.6;
  const protein_g = Math.round(input.weight * proteinPerKg);
  const fats_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round(Math.max(0, calories - protein_g * 4 - fats_g * 9) / 4);

  return { calories, protein_g, carbs_g, fats_g };
}

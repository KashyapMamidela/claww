// NG PHASE 7: the shapes the meal planner and its generated template data share. Type-only, dependency-free.

export type MealName = 'breakfast' | 'lunch' | 'dinner';
export type Availability = 'yes' | 'sometimes' | 'no';

export interface TemplateItem {
  food: string;
  unit: string;
  qty: number;
  grams: number;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fibreG: number | null;
  ironMg: number | null;
  calciumMg: number | null;
  vitcMg: number | null;
  b12Ug: number | null;
  sodiumMg: number | null;
}

export interface MealTemplate {
  id: string;
  meal: MealName;
  name: string;
  cuisine: string | null;
  /** Any one of these sources makes the template possible; empty means any. */
  needsSources: string[];
  /** Any one of these ways to cook makes it possible; empty means no cooking needed. */
  needsCook: string[];
  diet: 'vegan' | 'veg' | 'egg' | 'nonveg';
  jainOk: boolean;
  /** The "can you get these?" rows the template depends on (eggs, soya, curd, ...). */
  uses: string[];
  items: TemplateItem[];
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  costInr: number | null;
  reviewed: boolean;
}

export interface AddOn {
  key: string;
  label: string;
  food: string;
  unit: string;
  qty: number;
  grams: number;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

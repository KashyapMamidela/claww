// Polish step 6: "Save as my plate". After any logged meal the user can keep it as a plate; saved plates come first in
// "Something else" and in food search, one tap to log again. Works for home food, mess and hostel cooking because it
// stores what was eaten, not a recipe. Kept in personalization_profile.plates (owner-only through the profile's RLS).
// Pure.

export const MAX_PLATES = 30;

export interface SavedPlate {
  id: string;
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** The meal it was usually eaten as (Breakfast, Lunch, Dinner, Snack), when known. */
  mealType: string | null;
  items?: { food: string; unit: string; qty: number; grams: number }[];
  nutrients?: object;
  /** How many times it has been logged from here; used to order the list. */
  uses: number;
  savedAt: string;
}

export interface MealLike {
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  meal_type: string | null;
  items?: { food: string; unit: string; qty: number; grams: number }[] | null;
  nutrients?: object | null;
}

const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export function plateFromMeal(meal: MealLike, id: string, now: Date): SavedPlate {
  return {
    id,
    name: meal.description.trim().slice(0, 80) || 'My plate',
    kcal: Math.round(meal.calories ?? 0),
    proteinG: Math.round(meal.protein_g ?? 0),
    carbsG: Math.round(meal.carbs_g ?? 0),
    fatG: Math.round(meal.fats_g ?? 0),
    mealType: meal.meal_type,
    ...(meal.items && meal.items.length > 0 ? { items: meal.items } : {}),
    ...(meal.nutrients ? { nutrients: meal.nutrients as object } : {}),
    uses: 0,
    savedAt: now.toISOString(),
  };
}

/** Adds a plate. A plate with the same name replaces the old one (keeping its use count); the list is capped. */
export function addPlate(plates: SavedPlate[], plate: SavedPlate): SavedPlate[] {
  const same = plates.find((p) => key(p.name) === key(plate.name));
  const rest = plates.filter((p) => key(p.name) !== key(plate.name));
  return [{ ...plate, uses: same?.uses ?? plate.uses }, ...rest].slice(0, MAX_PLATES);
}

export const removePlate = (plates: SavedPlate[], id: string): SavedPlate[] => plates.filter((p) => p.id !== id);

export const countUse = (plates: SavedPlate[], id: string): SavedPlate[] => plates.map((p) => (p.id === id ? { ...p, uses: p.uses + 1 } : p));

export function hasPlate(plates: SavedPlate[], description: string): boolean {
  return plates.some((p) => key(p.name) === key(description));
}

/** Most used first, then the most recently saved; plates for this meal come ahead of the others. */
export function platesFor(plates: SavedPlate[], mealType: string | null): SavedPlate[] {
  const m = (mealType ?? '').toLowerCase();
  return [...plates].sort((a, b) => {
    const am = a.mealType && a.mealType.toLowerCase() === m ? 0 : 1;
    const bm = b.mealType && b.mealType.toLowerCase() === m ? 0 : 1;
    return am - bm || b.uses - a.uses || b.savedAt.localeCompare(a.savedAt);
  });
}

/** Reads the stored list defensively. */
export function parsePlates(raw: unknown): SavedPlate[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedPlate[] = [];
  for (const r of raw as Partial<SavedPlate>[]) {
    if (r && typeof r.id === 'string' && typeof r.name === 'string' && Number.isFinite(r.kcal)) {
      out.push({
        id: r.id,
        name: r.name,
        kcal: Number(r.kcal),
        proteinG: Number(r.proteinG) || 0,
        carbsG: Number(r.carbsG) || 0,
        fatG: Number(r.fatG) || 0,
        mealType: typeof r.mealType === 'string' ? r.mealType : null,
        ...(Array.isArray(r.items) ? { items: r.items } : {}),
        ...(r.nutrients && typeof r.nutrients === 'object' ? { nutrients: r.nutrients } : {}),
        uses: Number(r.uses) || 0,
        savedAt: typeof r.savedAt === 'string' ? r.savedAt : new Date(0).toISOString(),
      });
    }
  }
  return out.slice(0, MAX_PLATES);
}

// NG PHASE 4: the food database in the app. Loads foods and their units from Supabase (read-only for
// signed-in users), keeps the 200 most-used on the phone so search works offline, and counts uses so the
// favourites stay in that set. The search, units and nutrient maths are in lib/foodLookup.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { pickCacheSet, resolveFood, searchFoods, type Food, type Resolved } from './foodLookup';

const CACHE_KEY = 'claww.foodCache.v1';
const USE_KEY = 'claww.foodUses.v1';
const CACHE_SIZE = 200;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CacheShape {
  at: number;
  foods: Food[];
}

let memory: Food[] | null = null;
let uses: Record<number, number> | null = null;

async function readUses(): Promise<Record<number, number>> {
  if (uses) return uses;
  try {
    const raw = await AsyncStorage.getItem(USE_KEY);
    uses = raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    uses = {};
  }
  return uses;
}

/** Count one use of a food (when a meal is logged from it), so it stays in the on-phone set. */
export async function recordFoodUse(foodId: number): Promise<void> {
  const counts = await readUses();
  counts[foodId] = (counts[foodId] ?? 0) + 1;
  try {
    await AsyncStorage.setItem(USE_KEY, JSON.stringify(counts));
  } catch {
    // The count is a nicety; losing one is fine.
  }
}

interface FoodRow {
  id: number; name: string; aliases: string[] | null; kind: 'ingredient' | 'dish'; cuisine: string | null;
  diet: Food['diet']; jain_ok: boolean | null; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number;
  fibre_100g: number | null; iron_mg_100g: number | null; calcium_mg_100g: number | null; vitc_mg_100g: number | null;
  b12_ug_100g: number | null; sodium_mg_100g: number | null; sugar_100g: number | null; cost_inr_100g: number | null;
  reviewed_by: string | null;
  food_units: { unit: string; grams: number; is_default: boolean | null }[] | null;
}

const COLUMNS =
  'id, name, aliases, kind, cuisine, diet, jain_ok, kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g, iron_mg_100g, ' +
  'calcium_mg_100g, vitc_mg_100g, b12_ug_100g, sodium_mg_100g, sugar_100g, cost_inr_100g, reviewed_by, food_units(unit, grams, is_default)';

function toFood(r: FoodRow): Food {
  return {
    id: r.id, name: r.name, aliases: r.aliases ?? [], kind: r.kind, cuisine: r.cuisine, diet: r.diet, jainOk: !!r.jain_ok,
    kcal100g: Number(r.kcal_100g), protein100g: Number(r.protein_100g), carbs100g: Number(r.carbs_100g), fat100g: Number(r.fat_100g),
    fibre100g: nz(r.fibre_100g), ironMg100g: nz(r.iron_mg_100g), calciumMg100g: nz(r.calcium_mg_100g), vitcMg100g: nz(r.vitc_mg_100g),
    b12Ug100g: nz(r.b12_ug_100g), sodiumMg100g: nz(r.sodium_mg_100g), sugar100g: nz(r.sugar_100g), costInr100g: nz(r.cost_inr_100g),
    units: (r.food_units ?? []).map((u) => ({ unit: u.unit, grams: Number(u.grams), isDefault: !!u.is_default })),
    reviewed: r.reviewed_by !== null,
  };
}

const nz = (v: number | null): number | null => (v === null || v === undefined ? null : Number(v));

async function readCache(): Promise<CacheShape | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : null;
  } catch {
    return null;
  }
}

/**
 * All foods when online (and the on-phone set is refreshed once a day), the cached 200 when offline.
 * An empty table is a normal answer until the seed is applied, not an error.
 */
export async function loadFoods(): Promise<Food[]> {
  if (memory) return memory;
  const cached = await readCache();
  if (cached && Date.now() - cached.at < CACHE_MAX_AGE_MS) {
    memory = cached.foods;
    return memory;
  }
  const { data, error } = await supabase.from('foods').select(COLUMNS).order('name').limit(2000);
  if (error || !data) {
    if (cached) {
      memory = cached.foods;
      return memory;
    }
    return [];
  }
  const foods = (data as unknown as FoodRow[]).map(toFood);
  memory = foods;
  try {
    const keep = pickCacheSet(foods, await readUses(), CACHE_SIZE);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), foods: keep } satisfies CacheShape));
  } catch {
    // No cache is fine; the next start fetches again.
  }
  return foods;
}

export async function searchFoodDb(query: string, limit = 8): Promise<Food[]> {
  return searchFoods(await loadFoods(), query, limit, await readUses());
}

export async function resolveFoodDb(input: string): Promise<Resolved | null> {
  return resolveFood(await loadFoods(), input, await readUses());
}

/** Forget the in-memory copy (sign-out, or after a seed change in development). */
export function clearFoodMemory(): void {
  memory = null;
}

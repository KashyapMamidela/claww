import AsyncStorage from '@react-native-async-storage/async-storage';

// Polish step 6b: the unit the user last chose for each food (katori, bowl, pieces, grams), so the next time they see
// that food it is already in the unit they know. Kept on the phone only.

const KEY = 'claww.foodUnits';
let cache: Record<string, string> | null = null;

async function load(): Promise<Record<string, string>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

const norm = (name: string) => name.trim().toLowerCase();

export async function rememberedUnit(foodName: string): Promise<string | null> {
  const m = await load();
  return m[norm(foodName)] ?? null;
}

export async function rememberUnit(foodName: string, unit: string): Promise<void> {
  const m = await load();
  m[norm(foodName)] = unit;
  const keys = Object.keys(m);
  if (keys.length > 200) delete m[keys[0]];
  await AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {});
}

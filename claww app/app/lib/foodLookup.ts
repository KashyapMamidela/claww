// NG PHASE 4: pure food lookup. Search by name and alias, units for a food, nutrients for qty x unit.
// No I/O so Vitest can test it; lib/foodDb.ts loads the rows from Supabase and caches them.

export interface FoodUnit {
  unit: string;
  grams: number;
  isDefault: boolean;
}

export interface Food {
  id: number;
  name: string;
  aliases: string[];
  kind: 'ingredient' | 'dish';
  cuisine: string | null;
  diet: 'veg' | 'egg' | 'nonveg' | 'vegan' | null;
  jainOk: boolean;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fibre100g: number | null;
  ironMg100g: number | null;
  calciumMg100g: number | null;
  vitcMg100g: number | null;
  b12Ug100g: number | null;
  sodiumMg100g: number | null;
  sugar100g: number | null;
  costInr100g: number | null;
  units: FoodUnit[];
  /** True once the nutritionist has signed the row off. */
  reviewed: boolean;
}

export interface Nutrients {
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number | null;
  ironMg: number | null;
  calciumMg: number | null;
  vitcMg: number | null;
  b12Ug: number | null;
  sodiumMg: number | null;
  sugarG: number | null;
  costInr: number | null;
}

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "katoris" -> "katori", "glasses" -> "glass", "g" stays "g". */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses') || word.endsWith('shes') || word.endsWith('ches')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function parseNumber(token: string): number | null {
  if (FRACTIONS[token] !== undefined) return FRACTIONS[token];
  const mixed = token.match(/^(\d+)([½¼¾⅓⅔])$/);
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]];
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split('/').map(Number);
    return b > 0 ? a / b : null;
  }
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  return null;
}

export interface ParsedQuery {
  qty: number | null;
  /** A word right after the number that may be a unit ("katori" in "1 katori dal"); the caller checks it against the food's units. */
  unitWord: string | null;
  /** What is left to search for, normalised. */
  text: string;
}

/**
 * "2 roti" -> qty 2, unitWord "roti", text "roti" (roti is also the food, so the search uses the text and the
 * caller falls back to the default unit); "1 katori dal" -> qty 1, unitWord "katori", text "dal";
 * "200g paneer" -> qty 200, unitWord "g"; "chai" -> no quantity.
 */
export function parseQuery(input: string): ParsedQuery {
  const compact = input.trim().replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\b/, '$1 $2');
  const tokens = compact.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { qty: null, unitWord: null, text: '' };
  const qty = parseNumber(tokens[0]);
  if (qty === null) return { qty: null, unitWord: null, text: normalise(compact) };
  const rest = tokens.slice(1);
  if (rest.length === 0) return { qty, unitWord: null, text: '' };
  const unitWord = singular(normalise(rest[0]));
  const textTokens = rest.length > 1 ? rest.slice(1) : rest;
  return { qty, unitWord: unitWord || null, text: normalise(textTokens.join(' ')) };
}

/**
 * Rank a query against a food. 0 means no match. Exact name or alias beats a prefix, which beats whole
 * words, which beats a substring; ties go to the shorter name, and a dish beats an ingredient, since what
 * people log is mostly dishes.
 */
export function matchScore(food: Food, query: string): number {
  const q = normalise(query);
  if (!q) return 0;
  const name = normalise(food.name);
  const aliases = food.aliases.map(normalise);
  const words = q.split(' ');
  const wordsOf = (s: string) => s.split(' ');

  let best = 0;
  const consider = (s: string, exact: number, prefix: number, wordHit: number, sub: number) => {
    if (s === q) best = Math.max(best, exact);
    else if (s.startsWith(q)) best = Math.max(best, prefix);
    else if (words.every((w) => wordsOf(s).some((t) => t.startsWith(w)))) best = Math.max(best, wordHit);
    else if (s.includes(q)) best = Math.max(best, sub);
  };
  consider(name, 100, 70, 50, 30);
  for (const a of aliases) consider(a, 90, 60, 45, 25);
  if (best === 0) return 0;
  const lengthBonus = Math.max(0, 10 - Math.floor(name.length / 4)) / 10; // < 1, only breaks ties
  const kindBonus = food.kind === 'dish' ? 0.5 : 0;
  return best + lengthBonus + kindBonus;
}

export function searchFoods(foods: Food[], query: string, limit = 8, useCounts: Record<number, number> = {}): Food[] {
  const { text } = parseQuery(query);
  const q = text || normalise(query);
  return foods
    .map((f) => ({ f, s: matchScore(f, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (useCounts[b.f.id] ?? 0) - (useCounts[a.f.id] ?? 0) || a.f.name.localeCompare(b.f.name))
    .slice(0, limit)
    .map((x) => x.f);
}

export function defaultUnit(food: Food): FoodUnit {
  return food.units.find((u) => u.isDefault) ?? food.units[0] ?? { unit: 'g', grams: 100, isDefault: true };
}

/** Units a food can be measured in, default first, always ending with grams. */
export function unitsFor(food: Food): FoodUnit[] {
  const def = defaultUnit(food);
  const rest = food.units.filter((u) => u.unit !== def.unit && u.unit !== 'g');
  return [def, ...rest, { unit: 'g', grams: 1, isDefault: false }].filter((u, i, all) => all.findIndex((x) => x.unit === u.unit) === i);
}

/** Grams for `qty` of `unitWord` (or the default unit when the word is not one of the food's units). */
export function gramsFor(food: Food, qty: number, unitWord?: string | null): number {
  const word = unitWord ? singular(normalise(unitWord)) : null;
  if (word === 'g' || word === 'gm' || word === 'gram' || word === 'gms') return qty;
  const unit = word ? food.units.find((u) => singular(normalise(u.unit)) === word) : undefined;
  return qty * (unit ?? defaultUnit(food)).grams;
}

const scale = (v: number | null, grams: number, digits: number): number | null => {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round(((v * grams) / 100) * f) / f;
};

export function nutrientsFor(food: Food, grams: number): Nutrients {
  return {
    grams: Math.round(grams * 10) / 10,
    kcal: scale(food.kcal100g, grams, 0) ?? 0,
    proteinG: scale(food.protein100g, grams, 1) ?? 0,
    carbsG: scale(food.carbs100g, grams, 1) ?? 0,
    fatG: scale(food.fat100g, grams, 1) ?? 0,
    fibreG: scale(food.fibre100g, grams, 1),
    ironMg: scale(food.ironMg100g, grams, 2),
    calciumMg: scale(food.calciumMg100g, grams, 0),
    vitcMg: scale(food.vitcMg100g, grams, 1),
    b12Ug: scale(food.b12Ug100g, grams, 2),
    sodiumMg: scale(food.sodiumMg100g, grams, 0),
    sugarG: scale(food.sugar100g, grams, 1),
    costInr: scale(food.costInr100g, grams, 1),
  };
}

export interface Resolved {
  food: Food;
  qty: number;
  unit: string;
  nutrients: Nutrients;
}

/** "2 roti" or "1 katori dal" -> the best matching food with quantity, unit and nutrients; null when nothing matches. */
export function resolveFood(foods: Food[], input: string, useCounts: Record<number, number> = {}): Resolved | null {
  const parsed = parseQuery(input);
  const food = searchFoods(foods, input, 1, useCounts)[0];
  if (!food) return null;
  const qty = parsed.qty ?? 1;
  const word = parsed.unitWord;
  const matchesUnit = word && (word === 'g' || food.units.some((u) => singular(normalise(u.unit)) === word));
  const unit = matchesUnit ? (word === 'g' ? 'g' : (food.units.find((u) => singular(normalise(u.unit)) === word)?.unit ?? 'g')) : defaultUnit(food).unit;
  const grams = gramsFor(food, qty, matchesUnit ? word : null);
  return { food, qty, unit, nutrients: nutrientsFor(food, grams) };
}

/** The foods to keep on the phone: the most used first, then the rest in name order, up to `max`. */
export function pickCacheSet(foods: Food[], useCounts: Record<number, number>, max = 200): Food[] {
  return [...foods]
    .sort((a, b) => (useCounts[b.id] ?? 0) - (useCounts[a.id] ?? 0) || a.name.localeCompare(b.name))
    .slice(0, max);
}

// NG PHASE 9: the numbers behind the scanner. The model only names the items, guesses a household quantity and says
// how sure it is; everything else here is arithmetic on the food database: matching names to foods, converting
// household quantities to grams, adding the hidden oil, scaling the portion, totalling. Dependency-free so the Edge
// Function, the app and Vitest run the same file.

export interface ScanUnit {
  unit: string;
  grams: number;
  isDefault: boolean;
}

/** The food fields the scanner needs, a subset of the app's Food. */
export interface ScanFood {
  id: number;
  name: string;
  aliases: string[];
  kind: 'ingredient' | 'dish';
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
  units: ScanUnit[];
}

export type Place = 'home' | 'mess' | 'restaurant' | 'street';
export type Oil = 'light' | 'normal' | 'heavy';
export type Portion = 'small' | 'regular' | 'large' | 'shared';

export interface ScanContext {
  place: Place;
  oil: Oil;
  portion: Portion;
}

export const DEFAULT_CONTEXT: ScanContext = { place: 'home', oil: 'normal', portion: 'regular' };

export const PORTION_FACTOR: Record<Portion, number> = { small: 0.75, regular: 1, large: 1.35, shared: 0.5 };
/** Teaspoons of oil added for a whole plate, before the portion factor. */
export const OIL_TSP: Record<Oil, number> = { light: 1, normal: 2, heavy: 3 };
export const OIL_FOOD = 'Oil, sunflower';

// ─── What the model returns ───────────────────────────────────────────────────────────────────────────────────

export interface ModelItem {
  name: string;
  /** A household quantity: 1.5, 6, 2. */
  quantity: number;
  /** katori, piece, tsp, glass, plate, roti, idli, egg ... or "g". */
  unit: string;
  /** The model's own estimate of what is visible, in grams. Used only where the food has no household unit to convert with. */
  grams?: number;
}

export interface ModelOutput {
  isFood: boolean;
  isAppropriate: boolean;
  /** What the plate looks like: "Chicken fried rice". */
  dish: string;
  items: ModelItem[];
  /** 0 to 1. */
  confidence: number;
  /** Up to four other dishes it might be. */
  candidates: string[];
}

/** Validates the model's JSON without a schema library; returns null when it does not fit. */
export function parseModelOutput(raw: unknown): ModelOutput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.isFood !== 'boolean' || typeof r.isAppropriate !== 'boolean' || typeof r.dish !== 'string') return null;
  const confidence = typeof r.confidence === 'number' ? Math.min(1, Math.max(0, r.confidence)) : NaN;
  if (Number.isNaN(confidence)) return null;
  const items: ModelItem[] = [];
  if (!Array.isArray(r.items)) return null;
  for (const it of r.items) {
    const o = it as Record<string, unknown>;
    if (typeof o?.name !== 'string' || !o.name.trim()) continue;
    const quantity = Number(o.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 50) continue;
    const g = Number(o.grams);
    items.push({
      name: o.name.trim().slice(0, 60),
      quantity,
      unit: typeof o.unit === 'string' && o.unit.trim() ? o.unit.trim().toLowerCase().slice(0, 20) : 'piece',
      ...(Number.isFinite(g) && g > 0 && g <= 2000 ? { grams: Math.round(g) } : {}),
    });
  }
  const candidates = Array.isArray(r.candidates) ? r.candidates.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim().slice(0, 60)).slice(0, 4) : [];
  if (r.isFood && r.isAppropriate && items.length === 0) return null;
  return { isFood: r.isFood, isAppropriate: r.isAppropriate, dish: r.dish.trim().slice(0, 80), items: items.slice(0, 12), confidence, candidates };
}

// ─── Matching names to foods ──────────────────────────────────────────────────────────────────────────────────

export function normalise(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses') || word.endsWith('shes') || word.endsWith('ches')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

const stem = (text: string) => normalise(text).split(' ').map(singular).join(' ');

/** How well a model name matches a food, 0 to 100. Exact name or alias beats all words, which beats some words. */
export function matchScore(name: string, food: Pick<ScanFood, 'name' | 'aliases' | 'kind'>): number {
  const q = stem(name);
  if (!q) return 0;
  const words = q.split(' ');
  let best = 0;
  for (const candidate of [food.name, ...food.aliases]) {
    const c = stem(candidate);
    if (!c) continue;
    if (c === q) best = Math.max(best, 100);
    else if (c.startsWith(q) || q.startsWith(c)) best = Math.max(best, 80 - Math.abs(c.length - q.length) * 0.5);
    else if (words.every((w) => c.split(' ').includes(w))) best = Math.max(best, 70);
    else if (words.some((w) => w.length > 3 && c.split(' ').includes(w))) best = Math.max(best, 45 * (words.filter((w) => c.split(' ').includes(w)).length / words.length));
  }
  return best + (food.kind === 'dish' ? 0.5 : 0);
}

export const MATCH_THRESHOLD = 40;

/** Words that describe how a food looks or is cut, not what it is: "shredded purple cabbage" is cabbage. */
const DESCRIPTORS = new Set([
  'red', 'yellow', 'green', 'orange', 'purple', 'white', 'black', 'fresh', 'raw', 'ripe', 'small', 'large', 'big', 'baby',
  'shredded', 'chopped', 'sliced', 'diced', 'cubed', 'grated', 'crushed', 'mashed', 'whole', 'halved', 'julienned', 'mixed',
  'steamed', 'boiled', 'grilled', 'roasted', 'fried', 'sauteed', 'cooked', 'toasted', 'garnish', 'topping', 'some', 'a', 'of', 'with',
  'cherry', 'grape', 'roma', 'baby', 'mini', 'heirloom',
]);

/** What the model says when it means a food the database holds under another name. */
const NAME_SYNONYMS: Record<string, string> = {
  'purple cabbage': 'red cabbage',
  'red cabbage': 'red cabbage',
  'mixed greens': 'salad greens',
  'leafy greens': 'salad greens',
  'mixed salad': 'salad greens',
  'salad leaves': 'salad greens',
  'lettuce leaves': 'lettuce',
  'bell pepper': 'capsicum',
  'bell peppers': 'capsicum',
  'sweet pepper': 'capsicum',
  'garbanzo beans': 'chickpeas',
  'garbanzo': 'chickpeas',
  'sesame': 'sesame seeds',
  'cherry tomato': 'tomato',
  'cherry tomatoes': 'tomato',
  'grape tomato': 'tomato',
};

/** The model's name with the looks-and-cuts words dropped, or null when nothing would change. */
export function coreName(name: string): string | null {
  const words = normalise(name).split(' ').filter(Boolean);
  const kept = words.filter((w) => !DESCRIPTORS.has(w));
  if (kept.length === 0 || kept.length === words.length) return null;
  return kept.join(' ');
}

function bestMatch(name: string, foods: ScanFood[]): { food: ScanFood; score: number } | null {
  let best: { food: ScanFood; score: number } | null = null;
  for (const f of foods) {
    const score = matchScore(name, f);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { food: f, score };
  }
  return best;
}

/**
 * Matches the model's name to a food. The name is tried as given first (so "red bell pepper" finds a red capsicum row
 * when there is one); then with its synonym ("purple cabbage" is red cabbage), then without the words that only say how
 * it looks or is cut ("shredded purple cabbage" is cabbage).
 */
export function matchFood(name: string, foods: ScanFood[]): { food: ScanFood; score: number } | null {
  const tries: string[] = [name];
  const norm = normalise(name);
  for (const [from, to] of Object.entries(NAME_SYNONYMS)) if (norm.includes(from)) tries.push(norm.replace(from, to));
  const core = coreName(name);
  if (core) {
    tries.push(core);
    const coreNorm = normalise(core);
    for (const [from, to] of Object.entries(NAME_SYNONYMS)) if (coreNorm.includes(from)) tries.push(coreNorm.replace(from, to));
  }
  let best: { food: ScanFood; score: number } | null = null;
  for (let i = 0; i < tries.length; i++) {
    const m = bestMatch(tries[i], foods);
    // A later, looser try only wins when the earlier ones found nothing: the exact name always gets first say.
    if (m && !best) best = m;
    if (best && best.score >= 70) break;
  }
  return best;
}

/** Words the model uses for the units a food has: a bowl is a katori, a cup of tea is a cup. */
const UNIT_SYNONYMS: Record<string, string> = { bowl: 'katori', bowls: 'katori', katoris: 'katori', pieces: 'piece', pcs: 'piece', pc: 'piece', slices: 'slice', rotis: 'roti', chapati: 'roti', chapatis: 'roti', teaspoon: 'tsp', teaspoons: 'tsp', tablespoon: 'tbsp', tablespoons: 'tbsp', glasses: 'glass', plates: 'plate', grams: 'g', gram: 'g', gm: 'g' };

export function defaultUnit(food: ScanFood): ScanUnit {
  return food.units.find((u) => u.isDefault) ?? food.units[0] ?? { unit: 'g', grams: 100, isDefault: true };
}

/**
 * Typical grams for a household unit, used only when a food is measured in grams alone: "1 handful of avocado" must not
 * become 1 gram. Rough on purpose; the user corrects it with - and + on the check screen.
 */
export const HOUSEHOLD_GRAMS: Record<string, number> = { handful: 30, piece: 50, slice: 25, tsp: 5, tbsp: 15, katori: 150, cup: 200, glass: 250, plate: 250 };

/** Grams for a household quantity of a food; a unit the food does not have falls back to its default unit. */
export function gramsFor(food: ScanFood, quantity: number, unit: string): { grams: number; unit: string } {
  const u = (UNIT_SYNONYMS[unit] ?? unit).toLowerCase();
  if (u === 'g') return { grams: quantity, unit: 'g' };
  const hit = food.units.find((x) => x.unit.toLowerCase() === u);
  if (hit) return { grams: quantity * hit.grams, unit: hit.unit };
  const d = defaultUnit(food);
  // The food only has grams: use a typical weight for the unit the model named instead of reading "1" as 1 gram.
  if (d.grams === 1 && HOUSEHOLD_GRAMS[u]) return { grams: quantity * HOUSEHOLD_GRAMS[u], unit: 'g' };
  if (u === 'piece') return { grams: quantity * d.grams, unit: d.unit };
  return { grams: quantity * d.grams, unit: d.unit };
}

// ─── Items and totals ─────────────────────────────────────────────────────────────────────────────────────────

export interface ScanItem {
  key: string;
  /** What the model called it ("fried rice"). */
  heard: string;
  /** The matched food, or null when nothing in the database matched (the user picks one). */
  food: ScanFood | null;
  qty: number;
  unit: string;
  grams: number;
  /** True for the oil line the scanner adds from "how oily?". */
  hidden?: boolean;
}

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibreG: number | null;
  ironMg: number | null;
  calciumMg: number | null;
  vitcMg: number | null;
  b12Ug: number | null;
  sodiumMg: number | null;
}

const per = (v: number | null, grams: number) => (v === null ? null : (v * grams) / 100);

export function itemNutrients(item: ScanItem): Nutrients {
  const f = item.food;
  if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fibreG: null, ironMg: null, calciumMg: null, vitcMg: null, b12Ug: null, sodiumMg: null };
  return {
    kcal: (f.kcal100g * item.grams) / 100,
    protein: (f.protein100g * item.grams) / 100,
    carbs: (f.carbs100g * item.grams) / 100,
    fat: (f.fat100g * item.grams) / 100,
    fibreG: per(f.fibre100g, item.grams),
    ironMg: per(f.ironMg100g, item.grams),
    calciumMg: per(f.calciumMg100g, item.grams),
    vitcMg: per(f.vitcMg100g, item.grams),
    b12Ug: per(f.b12Ug100g, item.grams),
    sodiumMg: per(f.sodiumMg100g, item.grams),
  };
}

export function totalsOf(items: ScanItem[]): Nutrients {
  const t: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibreG: null, ironMg: null, calciumMg: null, vitcMg: null, b12Ug: null, sodiumMg: null };
  for (const i of items) {
    const n = itemNutrients(i);
    t.kcal += n.kcal;
    t.protein += n.protein;
    t.carbs += n.carbs;
    t.fat += n.fat;
    for (const k of ['fibreG', 'ironMg', 'calciumMg', 'vitcMg', 'b12Ug', 'sodiumMg'] as const) if (n[k] !== null) t[k] = (t[k] ?? 0) + (n[k] as number);
  }
  return t;
}

/** The smallest sensible step for a unit: half a katori, one roti, one tsp. */
export function stepFor(unit: string): number {
  return ['katori', 'bowl', 'plate', 'glass'].includes(unit) ? 0.5 : 1;
}

/** The units a food can be measured in: its own household units, then grams (always). */
export function unitChoices(food: ScanFood): string[] {
  const own = food.units.map((u) => u.unit).filter((u, i, a) => u.toLowerCase() !== 'g' && a.indexOf(u) === i);
  return [...own, 'g'];
}

/**
 * Polish step 6b: the user measures an item in the unit they know. The amount is kept in grams, so switching the unit
 * never changes the calories; the quantity shown is the same amount in the new unit, rounded to that unit's step
 * (half a katori or bowl, one piece or spoon). Switching to grams rounds to 25 g.
 */
export function switchUnit(item: ScanItem, unit: string): ScanItem {
  if (!item.food || item.unit === unit) return item;
  const grams = item.grams;
  if (unit === 'g') {
    const g = Math.max(25, Math.round(grams / 25) * 25);
    return { ...item, unit: 'g', qty: g, grams: g };
  }
  const hit = item.food.units.find((u) => u.unit.toLowerCase() === unit.toLowerCase());
  if (!hit || !(hit.grams > 0)) return item;
  const step = stepFor(hit.unit);
  const qty = Math.max(step, Math.round(grams / hit.grams / step) * step);
  return { ...item, unit: hit.unit, qty, grams };
}

/** The model's items matched to foods, in household units. Oil the model mentions is dropped: oil comes from "how oily?". */
export function resolveItems(items: ModelItem[], foods: ScanFood[]): ScanItem[] {
  const out: ScanItem[] = [];
  items.forEach((it, i) => {
    if (/\b(oil|ghee|butter)\b/i.test(it.name) && it.quantity <= 6 && ['tsp', 'teaspoon', 'tbsp', 'tablespoon'].includes(it.unit)) return;
    const m = matchFood(it.name, foods);
    if (!m) {
      out.push({ key: `i${i}`, heard: it.name, food: null, qty: it.quantity, unit: it.unit, grams: 0 });
      return;
    }
    // A food measured in grams only has no household unit to read "1 handful" with: take the model's own gram estimate.
    const u = (UNIT_SYNONYMS[it.unit] ?? it.unit).toLowerCase();
    if (it.grams && u !== 'g' && defaultUnit(m.food).grams === 1 && !m.food.units.some((x) => x.unit.toLowerCase() === u)) {
      out.push({ key: `i${i}`, heard: it.name, food: m.food, qty: it.grams, unit: 'g', grams: it.grams });
      return;
    }
    const g = gramsFor(m.food, it.quantity, it.unit);
    const qty = g.unit === 'g' ? Math.round(g.grams) : it.quantity;
    out.push({ key: `i${i}`, heard: it.name, food: m.food, qty, unit: g.unit, grams: Math.round(g.grams) });
  });
  return out;
}

/** Rounds a quantity to its household step, never below one step. */
export function roundQty(qty: number, unit: string): number {
  if (unit === 'g') return Math.max(10, Math.round(qty / 5) * 5);
  const step = stepFor(unit);
  return Math.max(step, Math.round(qty / step) * step);
}

export function setQuantity(item: ScanItem, qty: number): ScanItem {
  if (!item.food) return { ...item, qty };
  const g = gramsFor(item.food, qty, item.unit);
  return { ...item, qty, grams: Math.round(g.grams) };
}

/**
 * Applies the context to what the photo showed: the portion scales every item (in household steps), and the oil the
 * photo cannot see is added as its own line (1, 2 or 3 tsp a plate, scaled by the portion). Returns new items; the
 * model's items are never changed in place.
 */
export function applyContext(base: ScanItem[], ctx: ScanContext, oilFood: ScanFood | null): ScanItem[] {
  const factor = PORTION_FACTOR[ctx.portion];
  const scaled = base.map((i) => (factor === 1 || !i.food ? i : setQuantity(i, roundQty(i.qty * factor, i.unit))));
  if (!oilFood) return scaled;
  const tsp = Math.max(1, Math.round(OIL_TSP[ctx.oil] * factor));
  return [...scaled, { key: 'oil', heard: 'oil', food: oilFood, qty: tsp, unit: 'tsp', grams: Math.round(tsp * 5), hidden: true }];
}

// ─── Routing ──────────────────────────────────────────────────────────────────────────────────────────────────

export const CONFIDENCE_MIN = 0.5;

export type ScanRoute = 'ok' | 'not_sure' | 'blocked_not_food' | 'blocked_inappropriate';

/** Not food and not appropriate are refused; under 50 % confidence asks the user instead of guessing. */
export function routeScan(out: ModelOutput, matchedCount: number): ScanRoute {
  if (!out.isAppropriate) return 'blocked_inappropriate';
  if (!out.isFood) return 'blocked_not_food';
  if (out.confidence < CONFIDENCE_MIN || matchedCount === 0) return 'not_sure';
  return 'ok';
}

/** Up to four dishes to offer on the "Not sure" screen: the model's own guesses, then its dish name, de-duplicated. */
export function candidateChips(out: ModelOutput): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const c of [...out.candidates, out.dish]) {
    const key = normalise(c);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(c);
  }
  return list.slice(0, 4);
}

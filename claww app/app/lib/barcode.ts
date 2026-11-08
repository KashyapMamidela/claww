// Premium F9: packaged food by barcode. Looks the code up in Open Food Facts (a free public database, no key; only the
// barcode leaves the phone) and turns its per-100 g numbers into a meal. Pure parsing here, the fetch in `lookupBarcode`.

export interface BarcodeProduct {
  code: string;
  name: string;
  brand: string | null;
  /** Per 100 g. */
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  /** Grams in one serving when the label says so. */
  servingG: number | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Open Food Facts' product JSON to our shape, or null when the product has no usable nutrition. */
export function parseOffProduct(code: string, json: any): BarcodeProduct | null {
  const p = json?.product;
  if (json?.status === 0 || !p) return null;
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== null ? Math.round((num(n['energy_100g']) as number) / 4.184) : null);
  if (kcal === null) return null;
  const name = String(p.product_name || p.generic_name || '').trim();
  if (!name) return null;
  const serving = num(p.serving_quantity);
  return {
    code,
    name,
    brand: p.brands ? String(p.brands).split(',')[0].trim() || null : null,
    per100: { kcal: Math.round(kcal), protein: num(n.proteins_100g) ?? 0, carbs: num(n.carbohydrates_100g) ?? 0, fat: num(n.fat_100g) ?? 0 },
    servingG: serving && serving > 0 ? Math.round(serving) : null,
  };
}

/** The numbers for `grams` of the product, rounded for a meal log. */
export function portion(p: BarcodeProduct, grams: number) {
  const f = grams / 100;
  return {
    calories: Math.round(p.per100.kcal * f),
    protein_g: Math.round(p.per100.protein * f * 10) / 10,
    carbs_g: Math.round(p.per100.carbs * f * 10) / 10,
    fats_g: Math.round(p.per100.fat * f * 10) / 10,
  };
}

const cache = new Map<string, BarcodeProduct | null>();

export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  if (cache.has(code)) return cache.get(code) ?? null;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,generic_name,brands,nutriments,serving_quantity`);
    if (!res.ok) return null;
    const out = parseOffProduct(code, await res.json());
    cache.set(code, out);
    return out;
  } catch {
    return null;
  }
}

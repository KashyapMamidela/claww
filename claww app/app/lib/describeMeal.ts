// Premium: a meal described in words goes through the same check as a photographed plate. "2 roti, 1 katori dal and
// a boiled egg" is split into parts and each part is matched to the food database with its quantity and unit, so the
// numbers come from the reviewed data, not from a model's guess. A part that matches nothing stays on the list
// ("not in the database, pick a food") instead of being dropped or invented.

import { resolveFoodDb } from './foodDb';
import { scanGramsFor, type ScanItem } from './engine';
import { scaleItems, splitDescription } from './describeText';

export async function describeToItems(text: string, factor = 1): Promise<ScanItem[]> {
  const parts = splitDescription(text);
  const items: ScanItem[] = [];
  for (let n = 0; n < parts.length; n++) {
    const r = await resolveFoodDb(parts[n]);
    if (r) {
      const g = scanGramsFor(r.food, r.qty, r.unit);
      items.push({ key: `d${n}`, heard: parts[n], food: r.food, qty: r.qty, unit: g.unit, grams: Math.round(g.grams) });
    } else {
      items.push({ key: `d${n}`, heard: parts[n], food: null, qty: 1, unit: 'g', grams: 0 });
    }
  }
  return scaleItems(items, factor);
}

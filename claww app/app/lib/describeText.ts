// Pure helpers for describing a meal in words (kept apart from the database code so Vitest can run them).

import { setQuantity, scanStepFor, type ScanItem } from './engine';

/** "2 roti, 1 katori dal and chai" -> ["2 roti", "1 katori dal", "chai"]. */
export function splitDescription(text: string): string[] {
  return text
    .split(/[,;+&\n]|\band\b|\bwith\b/i)
    .map((p) => p.trim().replace(/^(a|an|some|the)\s+/i, ''))
    .filter((p) => p.length > 0);
}

/** Scale the quantity of every matched item by a portion factor, in household steps (never below one step). */
export function scaleItems(items: ScanItem[], factor: number): ScanItem[] {
  if (factor === 1) return items;
  return items.map((i) => {
    if (!i.food) return i;
    const step = i.unit === 'g' ? 25 : scanStepFor(i.unit);
    const q = Math.max(step, Math.round((i.qty * factor) / step) * step);
    return setQuantity(i, Math.round(q * 100) / 100);
  });
}


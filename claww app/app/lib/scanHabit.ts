// NG PHASE 9: the scanner starts from habit. "Last time with this dish: Restaurant, heavy oil, regular" is one tap;
// otherwise the answers you give most often. Pure.

import type { Oil, Place, Portion, ScanContext } from './engine';
import { DEFAULT_CONTEXT } from './engine';

export interface PastScan {
  description: string;
  context: Partial<ScanContext> | null;
  logged_at: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const PLACES: Place[] = ['home', 'mess', 'restaurant', 'street'];
const OILS: Oil[] = ['none', 'light', 'normal', 'heavy'];
const PORTIONS: Portion[] = ['small', 'regular', 'large', 'shared'];

const valid = (c: Partial<ScanContext> | null): c is ScanContext => !!c && PLACES.includes(c.place as Place) && OILS.includes(c.oil as Oil) && PORTIONS.includes(c.portion as Portion);

function mostCommon<T extends string>(values: T[], fallback: T): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

/** The answers given most often over the last scans: where you usually eat, how oily, what size. */
export function habitContext(past: PastScan[]): ScanContext {
  const usable = past.filter((p) => valid(p.context)).slice(0, 12);
  if (usable.length === 0) return DEFAULT_CONTEXT;
  return {
    place: mostCommon(usable.map((p) => p.context!.place as Place), DEFAULT_CONTEXT.place),
    // Scans with no oil (salads, fruit) say nothing about how oily your cooked food is, so they do not count here.
    oil: mostCommon(usable.map((p) => p.context!.oil as Oil).filter((o) => o !== 'none'), DEFAULT_CONTEXT.oil),
    portion: mostCommon(usable.map((p) => p.context!.portion as Portion), DEFAULT_CONTEXT.portion),
  };
}

/** The most recent earlier scan of the same dish (by name), for "Last time: ... Use". Null with none. */
export function lastTimeFor(dish: string, past: PastScan[]): { context: ScanContext; when: string } | null {
  const key = norm(dish);
  if (!key) return null;
  const hit = [...past]
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    .find((p) => valid(p.context) && (norm(p.description) === key || norm(p.description).includes(key) || key.includes(norm(p.description))));
  return hit && valid(hit.context) ? { context: hit.context, when: hit.logged_at } : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Restaurant · heavy oil · regular" */
export function contextText(c: ScanContext): string {
  return `${cap(c.place)} · ${c.oil === 'none' ? 'no oil' : `${c.oil} oil`} · ${c.portion}`;
}

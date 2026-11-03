// NG PHASE 3.3: live plate math and warm-up sets for barbell lifts (screen 07's "Bar 20 + 20 a side").
// Pure and dependency-free so Vitest can test it.

/** Plates a gym has, heaviest first (kg). */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

/** Plate colours, as on competition plates; used by the player's little bar drawing. */
export const PLATE_COLORS: Record<number, string> = {
  25: '#EF4444',
  20: '#3B82F6',
  15: '#FACC15',
  10: '#22C55E',
  5: '#E5E7EB',
  2.5: '#F97316',
  1.25: '#A1A1AA',
};

export interface PlateLoad {
  /** Bar weight used. */
  barKg: number;
  /** Plates on ONE side, heaviest first (greedy: 25, 20, 15, 10, 5, 2.5, 1.25). */
  perSide: number[];
  /** What the bar and plates add up to; at or below the target. */
  loadedKg: number;
  /** Set when the target can't be loaded exactly (below the bar or not a multiple of 2.5): the weight was rounded down. */
  note: string | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Plates for a barbell at `targetKg`. Greedy per side. A target that isn't reachable with
 * these plates rounds down and says so ("Loads 60 kg"); a target at or below the bar is just the bar.
 */
export function plateLoad(targetKg: number, barKg = 20): PlateLoad | null {
  if (!Number.isFinite(targetKg) || !Number.isFinite(barKg) || barKg <= 0 || targetKg <= 0) return null;
  const bar = r2(barKg);
  if (targetKg <= bar) {
    return { barKg: bar, perSide: [], loadedKg: bar, note: targetKg < bar ? `Lighter than the ${bar} kg bar` : null };
  }
  let remaining = r2((targetKg - bar) / 2);
  const perSide: number[] = [];
  for (const p of PLATES_KG) {
    while (remaining + 1e-9 >= p) {
      perSide.push(p);
      remaining = r2(remaining - p);
    }
  }
  const loaded = r2(bar + 2 * perSide.reduce((s, p) => s + p, 0));
  return { barKg: bar, perSide, loadedKg: loaded, note: loaded < r2(targetKg) ? `Loads ${loaded} kg` : null };
}

/** "20 + 20 a side"-style text for the bar line; "Empty bar" when nothing is added. */
export function plateText(load: PlateLoad): string {
  if (load.perSide.length === 0) return `Bar ${load.barKg}`;
  return `Bar ${load.barKg} + ${load.perSide.join(' + ')} a side`;
}

export interface WarmupSet {
  weight: number;
  reps: number;
  /** Share of the first work set's weight. */
  pct: number;
}

/** Round to the nearest 2.5 kg, never below the bar and never above the work weight. */
function warmupWeight(workKg: number, pct: number, barKg: number): number {
  const w = Math.round((workKg * pct) / 2.5) * 2.5;
  return Math.min(workKg, Math.max(barKg, w));
}

/**
 * Two warm-up sets before a main lift: 50 % x 8 and 75 % x 3 of the first work set, rounded to
 * 2.5 kg and never below the bar. Nothing when the lift isn't loaded or the work weight is within 5 kg
 * of the bar (nothing meaningful to warm up to); the second set is dropped when it wouldn't be a real step up.
 */
export function warmupSets(workKg: number | null, barKg = 20): WarmupSet[] {
  if (!workKg || workKg <= 0 || workKg <= barKg + 5) return [];
  const a = warmupWeight(workKg, 0.5, barKg);
  const b = warmupWeight(workKg, 0.75, barKg);
  const out: WarmupSet[] = [{ weight: a, reps: 8, pct: 50 }];
  // a second warm-up only when it is a real step up (5 kg or more) and still under the work weight
  if (b >= a + 5 && b < workKg) out.push({ weight: b, reps: 3, pct: 75 });
  return a < workKg ? out : [];
}

// The catalog has no barbell flag (equipment is gym / home / none), so barbell lifts are named here,
// checked against the live catalog on 2026-11-03. Anything with a "Barbell" in its name counts too.
const BARBELL_LIFTS = new Set(['bench press', 'incline bench press', 'bent-over row', 'deadlift', 'overhead press', 'romanian deadlift']);

/** True for lifts loaded with a barbell and plates: plate math and warm-ups apply, dumbbells and machines don't. */
export function isBarbellLift(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (/dumbbell|cable|machine|smith/.test(n)) return false;
  return n.includes('barbell') || BARBELL_LIFTS.has(n);
}

/** True when today's prescribed weight differs from the plan's, so the target card draws a pen mark. */
export function targetDiffers(planKg: number | null, todayKg: number | null): boolean {
  return planKg !== null && todayKg !== null && planKg > 0 && todayKg > 0 && Math.abs(planKg - todayKg) >= 0.01;
}

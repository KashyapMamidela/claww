// NG PHASE 12: the numbers on the session-complete card (screen 10): volume against last time, a new best, and
// the pen note that previews what "How did that feel?" will do. Pure.

export type Feel = 'too_easy' | 'just_right' | 'too_hard';

export interface DoneSet {
  name: string;
  weightKg: number;
  reps: number;
}

export function totalVolume(sets: DoneSet[]): number {
  return Math.round(sets.reduce((sum, s) => sum + (s.weightKg > 0 ? s.weightKg * s.reps : 0), 0));
}

/** "+4%" against the last session of the same day; null when there is nothing to compare. */
export function volumeDelta(current: number, previous: number | null): { pct: number; text: string } | null {
  if (!previous || previous <= 0 || current <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct, text: `${pct >= 0 ? '+' : '−'}${Math.abs(pct)}%` };
}

export interface BestRecord {
  name: string;
  maxWeightKg: number;
  /** Most reps done at that weight. */
  repsAtMax: number;
}

export interface NewBest {
  name: string;
  weightKg: number;
  reps: number;
  /** Sets at that weight and at least that many reps. */
  sets: number;
}

/**
 * The exercise with the biggest new best this session: a heavier top weight than ever before, or the same weight
 * for more reps. A first-ever exercise has no history and is not a "best". Heavier-by-more wins; ties by name.
 */
export function newBest(done: DoneSet[], history: BestRecord[]): NewBest | null {
  const prior = new Map(history.map((h) => [h.name.trim().toLowerCase(), h]));
  const byName = new Map<string, DoneSet[]>();
  for (const s of done) {
    if (s.weightKg <= 0) continue;
    const key = s.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), s]);
  }
  let best: { score: number; value: NewBest } | null = null;
  for (const [key, sets] of byName) {
    const before = prior.get(key);
    if (!before) continue;
    const top = Math.max(...sets.map((s) => s.weightKg));
    const repsAtTop = Math.max(...sets.filter((s) => s.weightKg === top).map((s) => s.reps));
    const heavier = top > before.maxWeightKg;
    const moreReps = top === before.maxWeightKg && repsAtTop > before.repsAtMax;
    if (!heavier && !moreReps) continue;
    const score = heavier ? 1000 + (top - before.maxWeightKg) : repsAtTop - before.repsAtMax;
    const count = sets.filter((s) => s.weightKg === top && s.reps >= repsAtTop).length;
    if (!best || score > best.score) best = { score, value: { name: sets[0].name, weightKg: top, reps: repsAtTop, sets: count } };
  }
  return best?.value ?? null;
}

const kg = (n: number) => `${Math.round(n * 100) / 100}`;

export function newBestText(b: NewBest): string {
  return `${kg(b.weightKg)} kg × ${b.reps} on ${b.sets === 1 ? '1 set' : `${b.sets} sets`}`;
}

/** The pen note under "How did that feel?": says what the choice will do, and only what the engine really does. */
export function feelNote(feel: Feel): string {
  switch (feel) {
    case 'too_easy':
      return 'noted, the weights go up sooner once you hit the top reps';
    case 'too_hard':
      return 'noted, next session holds the weights';
    default:
      return 'perfect, next session climbs as planned';
  }
}

export const FEEL_OPTIONS: { value: Feel; label: string }[] = [
  { value: 'too_easy', label: 'Too easy' },
  { value: 'just_right', label: 'Just right' },
  { value: 'too_hard', label: 'Too hard' },
];

/** "Strong session" above 90 % of planned sets done, "Good session" above half, else "Session saved" (a short session is not "done"). */
export function sessionTitle(setsDone: number, setsPlanned: number): string {
  if (setsPlanned <= 0) return 'Session done';
  const pct = setsDone / setsPlanned;
  return pct >= 0.9 ? 'Strong session' : pct >= 0.5 ? 'Good session' : 'Session saved';
}

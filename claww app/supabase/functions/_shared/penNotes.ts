// NG PHASE 11.3: the words on a mark. Template notes from the numbers come first (40 characters or fewer, lower case,
// handwritten); a model may re-word one, but only through validateReworded, and any failure falls back to the template.
// Never mentions AI. Pure.

import type { Finding } from './trendReader.ts';

export const NOTE_MAX = 40;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export interface Words {
  note: string;
  reason: string;
}

export function wordsFor(f: Finding): Words {
  switch (f.type) {
    case 'stalled_lift':
      return { note: 'no gain in 3 sessions', reason: `${cap(f.name)} has not gone above its best estimated max of ${f.e1rm} kg in 3 sessions, so keep the weight steady while form catches up.` };
    case 'progress_streak':
      return { note: `${plural(f.count, 'session')} in a row, up`, reason: `${cap(f.name)} estimated max went from ${f.fromE1rm} to ${f.toE1rm} kg over 3 sessions.` };
    case 'protein_miss':
      return { note: `${f.slot} protein low ${f.days} days`, reason: `${cap(f.slot)} protein averaged ${f.avgG} g on ${f.days} days against about ${f.targetG} g for that meal.` };
    case 'short_sleep':
      return { note: 'short sleep, hold this week', reason: `You slept ${f.avgHours} hours on average the last 2 nights, so heavier weights wait.` };
    case 'skipped_meals':
      return { note: `${f.slot} skipped ${f.count} times`, reason: `${cap(f.slot)} had no meal logged on ${f.count} days this week, so a lighter, quicker one is planned.` };
    case 'missed_days': {
      const n = f.dates.length;
      // Full weekday names: "missed 2 Fris" read like an abbreviation table.
      return { note: n === 1 ? `missed last ${f.weekday}` : `missed ${plural(n, f.weekday)}`, reason: `${plural(n, 'planned ' + f.weekday)} in the last 2 weeks had no session, so the session moves to a day that works.` };
    }
    case 'flat_weight':
      return { note: `weight flat for ${f.weeks} weeks`, reason: `Your weight has stayed near ${f.kg} kg for ${f.weeks} weeks (change ${f.deltaKg} kg), so calories move a little.` };
  }
}

const MEDICAL = /\b(diagnos|disease|disorder|syndrome|injur|pain|cure|treat|medic|doctor|illness|condition)\w*/i;
const AI = /\b(ai|a\.i\.|artificial|model|algorithm|machine)\b/i;

export const numbersIn = (text: string): string[] => (text.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n)));

/** Every number in a finding, so a re-worded note can be checked against it. */
export function factsOf(f: Finding): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'number') out.push(String(Number(v.toFixed(2))));
    else if (typeof v === 'string') out.push(...numbersIn(v));
    else if (Array.isArray(v)) v.forEach(walk);
  };
  Object.values(f).forEach(walk);
  return out;
}

export type RewordCheck = { ok: true; note: string } | { ok: false; why: 'empty' | 'too_long' | 'changed_number' | 'medical' | 'mentions_ai' };

/** A model's re-worded note is used only if it is short, keeps every number from the finding, and makes no medical or AI claims. */
export function validateReworded(candidate: string, template: Words, finding: Finding): RewordCheck {
  const note = candidate.trim();
  if (!note) return { ok: false, why: 'empty' };
  if (note.length > NOTE_MAX) return { ok: false, why: 'too_long' };
  const allowed = new Set([...numbersIn(template.note), ...factsOf(finding)]);
  if (numbersIn(note).some((n) => !allowed.has(n))) return { ok: false, why: 'changed_number' };
  if (MEDICAL.test(note)) return { ok: false, why: 'medical' };
  if (AI.test(note)) return { ok: false, why: 'mentions_ai' };
  return { ok: true, note };
}

/** The note to show: the re-worded one if it passes, else the template. */
export function chooseNote(finding: Finding, reworded: string | null | undefined): Words {
  const t = wordsFor(finding);
  if (!reworded) return t;
  const v = validateReworded(reworded, t, finding);
  return v.ok ? { note: v.note, reason: t.reason } : t;
}

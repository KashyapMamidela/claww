// NG PHASE 11.2: maps each trend finding to exactly one allowed change, or to nothing. The allowed changes are:
// change a number within limits (calories, at most 5 %, never under 1,200), swap a meal within 10 % calories, add a
// food from the user's available foods, move a day within the week, or hold. The adaptive engine's own prescription
// always wins: a rule never raises a lift the engine is lowering, and never holds one the engine is raising. Pure.

import type { Finding } from './trendReader.ts';
import { wordsFor } from './penNotes.ts';
import type { NewMark } from './penMarks.ts';

export const CALORIE_FLOOR = 1200;
export const CALORIE_MAX_CHANGE = 0.05;
export const CALORIE_STEP = 100;
export const CALORIE_COOLDOWN_DAYS = 14;
export const SWAP_KCAL_TOLERANCE = 0.1;

export interface SwapChoice {
  fromId: string;
  fromName: string;
  fromKcal: number;
  toId: string;
  toName: string;
  toKcal: number;
  /** The scale factor of each, so undo and apply put the same portions back. */
  fromFactor?: number;
  toFactor?: number;
}

export interface RuleContext {
  today: string;
  tomorrow: string;
  calorieTarget: number | null;
  /** Date of the last calorie change made by a mark (kept or active), if any. */
  lastCalorieMarkDate: string | null;
  /** Lower-case names of exercises the engine is raising for the next session. */
  enginePushing: ReadonlySet<string>;
  /** Lower-case names of exercises the engine is lowering or holding because of recovery. */
  engineLowering: ReadonlySet<string>;
  /** The cheapest protein fix from foods the user can get, or null. `food` is the key of an available food. */
  proteinFix: { food: string; text: string; proteinG: number; kcal: number } | null;
  availableFoods: ReadonlySet<string>;
  /** A lighter or quicker meal for a slot within 10 % calories, from the user's own templates, or null. */
  swapFor: (slot: 'breakfast' | 'lunch' | 'dinner') => SwapChoice | null;
  /** A free weekday to move a missed session to, or null. */
  freeWeekday: (missedWeekday: string) => string | null;
}

export type PenCandidate = NewMark & { finding: Finding['type'] };

const lower = (s: string) => s.toLowerCase();
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);

export function calorieStep(current: number): number {
  const cap = Math.floor((current * CALORIE_MAX_CHANGE) / 50) * 50;
  return Math.max(0, Math.min(CALORIE_STEP, cap));
}

export function applyRules(findings: Finding[], ctx: RuleContext): PenCandidate[] {
  const out: PenCandidate[] = [];
  for (const f of findings) {
    const w = wordsFor(f);
    const base = { note: w.note, reason: w.reason, evidence: f as unknown as Record<string, unknown>, finding: f.type } as const;

    if (f.type === 'stalled_lift') {
      const n = lower(f.name);
      if (ctx.enginePushing.has(n)) continue; // the engine wants more weight: never hold against it
      out.push({ ...base, area: 'workout', kind: 'hold', target: { key: `ex:${n}`, field: 'weight', exercise: f.name }, oldValue: null, newValue: 'Hold' });
    } else if (f.type === 'short_sleep') {
      if (ctx.enginePushing.size > 0) continue;
      out.push({ ...base, area: 'workout', kind: 'hold', target: { key: 'week:weights', field: 'weight' }, oldValue: null, newValue: 'Hold weights' });
    } else if (f.type === 'protein_miss') {
      const fix = ctx.proteinFix;
      if (!fix || !ctx.availableFoods.has(fix.food)) continue;
      out.push({
        ...base,
        area: 'nutrition',
        kind: 'add_item',
        target: { key: `meal:${ctx.tomorrow}:${f.slot}`, field: 'meal', planDate: ctx.tomorrow, meal: f.slot, restore: { food: fix.food } },
        oldValue: null,
        newValue: fix.text,
        evidence: { ...(f as unknown as Record<string, unknown>), proteinG: fix.proteinG, kcal: fix.kcal },
      });
    } else if (f.type === 'skipped_meals') {
      const s = ctx.swapFor(f.slot);
      if (!s || s.fromKcal <= 0 || Math.abs(s.toKcal - s.fromKcal) / s.fromKcal > SWAP_KCAL_TOLERANCE) continue;
      out.push({
        ...base,
        area: 'nutrition',
        kind: 'swap_item',
        target: { key: `meal:${ctx.tomorrow}:${f.slot}`, field: 'meal', planDate: ctx.tomorrow, meal: f.slot, restore: { templateId: s.fromId, factor: s.fromFactor ?? 1, toTemplateId: s.toId, toFactor: s.toFactor ?? 1 } },
        oldValue: s.fromName,
        newValue: s.toName,
      });
    } else if (f.type === 'missed_days') {
      const to = ctx.freeWeekday(f.weekday);
      if (!to || to === f.weekday) continue;
      out.push({ ...base, area: 'workout', kind: 'move_day', target: { key: `day:${f.weekday}`, field: 'day', restore: { weekday: f.weekday } }, oldValue: f.weekday, newValue: to });
    } else if (f.type === 'flat_weight') {
      const cur = ctx.calorieTarget;
      if (!cur) continue;
      if (ctx.lastCalorieMarkDate && daysBetween(ctx.lastCalorieMarkDate, ctx.today) < CALORIE_COOLDOWN_DAYS) continue;
      const step = calorieStep(cur);
      // Flat weight against the goal: fat loss eats a little less, muscle gain a little more.
      const dir = f.goal === 'fat_loss' ? -1 : 1;
      const next = cur + dir * step;
      if (step === 0 || next < CALORIE_FLOOR) continue;
      out.push({ ...base, area: 'nutrition', kind: 'change_number', target: { key: 'calories', field: 'calories', restore: { calories: cur } }, oldValue: String(cur), newValue: String(next) });
    }
  }
  return out;
}

/** The invariant the property test checks: every candidate is one of the allowed changes, within its limits. */
export function isAllowed(c: PenCandidate, ctx: RuleContext): boolean {
  if (c.note.length > 40) return false;
  switch (c.kind) {
    case 'hold':
      return c.area === 'workout' && c.oldValue === null && !(c.target.exercise && ctx.enginePushing.has(lower(c.target.exercise))) && !(c.target.key === 'week:weights' && ctx.enginePushing.size > 0);
    case 'change_number': {
      const o = Number(c.oldValue);
      const n = Number(c.newValue);
      return c.target.key === 'calories' && o > 0 && n >= CALORIE_FLOOR && Math.abs(n - o) / o <= CALORIE_MAX_CHANGE + 1e-9;
    }
    case 'swap_item':
      return c.area === 'nutrition' && !!c.oldValue && c.oldValue !== c.newValue;
    case 'add_item': {
      const food = c.target.restore?.food;
      return c.area === 'nutrition' && typeof food === 'string' && ctx.availableFoods.has(food);
    }
    case 'move_day':
      return c.area === 'workout' && !!c.oldValue && c.oldValue !== c.newValue;
  }
}

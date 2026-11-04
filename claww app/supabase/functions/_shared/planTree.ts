// NG PHASE 5.2 and 5.3: the plan tree. Picks a reviewed blueprint by rules, fills each slot from the exercise
// catalog, checks the result, and fits it to the session length. No model is involved; the same user and the
// same inputs always give the same plan. Dependency-free (type imports only) so Vitest, the Edge Function and
// the app's setup screen run this one file.

import type { Blueprint, BlueprintGoal, BlueprintPlace, BlueprintSlot } from './blueprints/schema.ts';
import { avoidsImpact, contraindicatedPatterns, isExerciseAllowed, type Injury } from './injuryRules.ts';

// ─── Picking ──────────────────────────────────────────────────────────────

export interface PlanProfile {
  /** profiles.goal (muscle_gain, fat_loss, strength, maintenance, endurance, flexibility). */
  goal: string | null;
  /** profiles.equipment (none, home, gym). */
  equipment: string | null;
  daysPerWeek: number;
  trainingMonths: number | null;
  sessionMinutes: number | null;
  injuries: Injury[];
}

export function goalToBlueprintGoal(goal: string | null | undefined): BlueprintGoal {
  switch (goal) {
    case 'muscle_gain': case 'muscle': return 'muscle';
    case 'fat_loss': return 'fat_loss';
    case 'strength': return 'strength';
    default: return 'general';
  }
}

export function equipmentToPlace(equipment: string | null | undefined): BlueprintPlace {
  return equipment === 'none' ? 'none' : equipment === 'home' ? 'home' : 'gym';
}

const PLACE_CHAIN: Record<BlueprintPlace, BlueprintPlace[]> = { gym: ['gym', 'home', 'none'], home: ['home', 'none'], none: ['none'] };

export interface PickResult {
  blueprint: Blueprint;
  /** true when goal, place and days all match exactly. */
  exact: boolean;
  /** Plain words for the setup card: what was matched and what was nearest. */
  note: string;
}

/**
 * Goal first, then where the user trains, then the number of days, then experience (minMonths).
 * Always returns one blueprint: with nothing close it falls back to the nearest general plan for the place.
 */
export function pickBlueprint(profile: PlanProfile, blueprints: Blueprint[]): PickResult {
  if (blueprints.length === 0) throw new Error('No blueprints available');
  const goal = goalToBlueprintGoal(profile.goal);
  const place = equipmentToPlace(profile.equipment);
  const chain = PLACE_CHAIN[place];
  const months = profile.trainingMonths ?? 0;

  const score = (b: Blueprint): number => {
    const placeRank = chain.indexOf(b.place);
    if (placeRank < 0) return Number.POSITIVE_INFINITY;
    const goalCost = b.goal === goal ? 0 : b.goal === 'general' ? 100 : 200;
    const dayDiff = Math.abs(b.daysPerWeek - profile.daysPerWeek);
    const tooMany = b.daysPerWeek > profile.daysPerWeek ? 1 : 0; // on a tie, fewer days than asked beats more
    const experiencePenalty = b.minMonths > months ? 1000 : 0;
    return experiencePenalty + goalCost + placeRank * 400 + dayDiff * 10 + tooMany;
  };

  const ranked = [...blueprints].map((b) => ({ b, s: score(b) })).filter((x) => Number.isFinite(x.s)).sort((a, b) => a.s - b.s || a.b.id.localeCompare(b.b.id));
  const best = (ranked[0] ?? { b: blueprints[0] }).b;
  const exact = best.goal === goal && best.place === place && best.daysPerWeek === profile.daysPerWeek && best.minMonths <= months;
  let note = 'Matches your goal, place and days.';
  if (!exact) {
    const parts: string[] = [];
    if (best.daysPerWeek !== profile.daysPerWeek) parts.push(`${best.daysPerWeek} days (nearest to ${profile.daysPerWeek})`);
    if (best.place !== place) parts.push(`a ${best.place === 'none' ? 'no-equipment' : best.place} version`);
    if (best.goal !== goal) parts.push(`a ${best.goal.replace('_', ' ')} plan`);
    note = parts.length > 0 ? `Nearest reviewed plan: ${parts.join(', ')}.` : 'Nearest reviewed plan for your experience.';
  }
  return { blueprint: best, exact, note };
}

// ─── Filling ──────────────────────────────────────────────────────────────

export interface CatalogRow {
  id?: string;
  name: string;
  modality: string;
  equipment: string;
  primary_muscle?: string | null;
  movement_pattern?: string | null;
  role?: string | null;
  stimulus_type?: string | null;
}

export interface FilledSlot extends BlueprintSlot {
  exercise: CatalogRow;
}

export interface FilledDay {
  name: string;
  slots: FilledSlot[];
}

export interface DroppedSlot {
  day: string;
  pattern: string;
  reason: 'injury' | 'no_exercise' | 'time' | 'volume';
}

export interface FilledPlan {
  blueprintId: string;
  blueprintVersion: number;
  days: FilledDay[];
  dropped: DroppedSlot[];
  /** What was changed to make the plan pass the checks. */
  adjustments: string[];
}

export interface FillOptions {
  /** Stable per user, e.g. the user id. */
  seed: string;
  /** Equipment tiers the user can use, e.g. ['none','home']. */
  allowedEquipment: string[];
  injuries: Injury[];
  blockNumber?: number;
  /** Exercise names the user never wants. */
  dislikes?: string[];
  /** Changes the choice of accessories for "different split / exercises" regenerations. */
  variant?: number;
}

/** FNV-1a, 32 bit. Stable across runtimes, which is all this needs. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Fallback patterns when a slot has nothing to choose from, tried in order. */
const SUBSTITUTES: Record<string, string[]> = {
  squat: ['lunge'],
  lunge: ['squat'],
  hinge: ['knee_flexion'],
  vertical_pull: ['horizontal_pull'],
  vertical_push: ['horizontal_push'],
  horizontal_pull: ['vertical_pull'],
  horizontal_push: ['vertical_push'],
  knee_flexion: ['hinge'],
  knee_extension: ['lunge'],
};

export function fillBlueprint(blueprint: Blueprint, catalog: CatalogRow[], opts: FillOptions): FilledPlan {
  const dislikes = new Set((opts.dislikes ?? []).map((d) => d.trim().toLowerCase()));
  const block = opts.blockNumber ?? 1;
  const variant = opts.variant ?? 0;
  const pool = catalog.filter(
    (e) => e.modality === 'strength' && opts.allowedEquipment.includes(e.equipment) && !!e.movement_pattern && !dislikes.has(e.name.trim().toLowerCase())
  );
  const banned = contraindicatedPatterns(opts.injuries);
  const dropped: DroppedSlot[] = [];
  const weekUsed = new Set<string>();
  const mainByPattern = new Map<string, CatalogRow>();

  const days: FilledDay[] = blueprint.days.map((day, di) => {
    const dayUsed = new Set<string>();
    const slots: FilledSlot[] = [];
    day.slots.forEach((slot, si) => {
      const patterns = [slot.pattern, ...(SUBSTITUTES[slot.pattern] ?? [])];
      let chosen: CatalogRow | null = null;
      let sawInjury = false;
      for (const pattern of patterns) {
        if (banned.has(pattern)) { sawInjury = true; continue; }
        const cands = pool.filter((e) => e.movement_pattern === pattern && isExerciseAllowed(e, opts.injuries) && !dayUsed.has(e.name));
        if (cands.length === 0) continue;
        if (slot.role === 'main' && pattern === slot.pattern && mainByPattern.has(pattern) && cands.some((e) => e.name === mainByPattern.get(pattern)!.name)) {
          chosen = mainByPattern.get(pattern)!;
          break;
        }
        const wantMain = slot.role === 'main';
        const keyBase = slot.role === 'main' ? `${opts.seed}|${pattern}|main` : `${opts.seed}|b${block}|v${variant}|${di}|${si}|${pattern}`;
        cands.sort((a, b) => {
          const ra = (a.role === 'main') === wantMain ? 0 : 1;
          const rb = (b.role === 'main') === wantMain ? 0 : 1;
          if (ra !== rb) return ra - rb;
          const ua = slot.role !== 'main' && weekUsed.has(a.name) ? 1 : 0;
          const ub = slot.role !== 'main' && weekUsed.has(b.name) ? 1 : 0;
          if (ua !== ub) return ua - ub;
          return hash(`${keyBase}|${a.name}`) - hash(`${keyBase}|${b.name}`) || a.name.localeCompare(b.name);
        });
        chosen = cands[0];
        if (slot.role === 'main' && pattern === slot.pattern) mainByPattern.set(pattern, chosen);
        break;
      }
      if (chosen) {
        dayUsed.add(chosen.name);
        weekUsed.add(chosen.name);
        slots.push({ ...slot, exercise: chosen });
      } else {
        dropped.push({ day: day.name, pattern: slot.pattern, reason: sawInjury ? 'injury' : 'no_exercise' });
      }
    });
    return { name: day.name, slots };
  });

  // A session whose every slot was ruled out (for example a pull day with a severe elbow) is removed, not shown empty.
  const kept = days.filter((d) => d.slots.length > 0);
  const adjustments = days.filter((d) => d.slots.length === 0).map((d) => `${d.name} removed: nothing in it is safe for your injuries`);
  return { blueprintId: blueprint.id, blueprintVersion: blueprint.version, days: kept, dropped, adjustments };
}

// ─── Checking ─────────────────────────────────────────────────────────────

/** Muscles credited by each pattern: the primary gets a full set, the others half a set. */
export const PATTERN_MUSCLES: Record<string, { primary: string; secondary: string[] }> = {
  squat: { primary: 'quads', secondary: ['glutes'] },
  lunge: { primary: 'quads', secondary: ['glutes'] },
  hinge: { primary: 'hamstrings', secondary: ['glutes'] },
  knee_extension: { primary: 'quads', secondary: [] },
  knee_flexion: { primary: 'hamstrings', secondary: [] },
  calf_raise: { primary: 'calves', secondary: [] },
  horizontal_push: { primary: 'chest', secondary: ['triceps', 'shoulders'] },
  vertical_push: { primary: 'shoulders', secondary: ['triceps'] },
  horizontal_pull: { primary: 'back', secondary: ['biceps'] },
  vertical_pull: { primary: 'back', secondary: ['biceps'] },
  elbow_flexion: { primary: 'biceps', secondary: [] },
  elbow_extension: { primary: 'triceps', secondary: [] },
  back_extension: { primary: 'back', secondary: ['glutes'] },
  core_anti_extension: { primary: 'core', secondary: [] },
  core_anti_lateral: { primary: 'core', secondary: [] },
  core_anti_rotation: { primary: 'core', secondary: [] },
  core_flexion: { primary: 'core', secondary: [] },
};

/** Muscles that must be trained at least twice a week (unless an injury rules out every way to train them). */
export const TWICE_A_WEEK = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];

const WORK_SECONDS_PER_SET = 40;
const WARMUP_MINUTES = 5;

/** Weekly hard-set bounds per muscle for the big muscles, by blueprint goal. */
export const WEEKLY_SETS: Record<BlueprintGoal, { min: number; max: number }> = {
  muscle: { min: 6, max: 22 },
  fat_loss: { min: 5, max: 20 },
  strength: { min: 5, max: 20 },
  general: { min: 4, max: 20 },
};

export function sessionMinutes(day: FilledDay): number {
  const seconds = day.slots.reduce((sum, s) => sum + s.sets * (WORK_SECONDS_PER_SET + s.restSec), 0);
  return Math.round(seconds / 60 + WARMUP_MINUTES);
}

export function weeklyMuscleSets(plan: FilledPlan): Record<string, { sets: number; days: number }> {
  const out: Record<string, { sets: number; days: number }> = {};
  for (const day of plan.days) {
    const touched = new Set<string>();
    for (const s of day.slots) {
      const m = PATTERN_MUSCLES[s.exercise.movement_pattern ?? s.pattern];
      if (!m) continue;
      out[m.primary] = out[m.primary] ?? { sets: 0, days: 0 };
      out[m.primary].sets += s.sets;
      touched.add(m.primary);
      for (const sec of m.secondary) {
        out[sec] = out[sec] ?? { sets: 0, days: 0 };
        out[sec].sets += s.sets * 0.5;
        touched.add(sec);
      }
    }
    for (const m of touched) out[m].days += 1;
  }
  return out;
}

/**
 * Muscles an injury touches: a muscle is not required by the checks when a banned pattern is one of its main
 * ways of being trained (a severe knee removes squats and lunges, so quads and glutes are excused). Back
 * extensions don't count, since the back is trained by the pulls.
 */
export function excusedMuscles(injuries: Injury[]): Set<string> {
  const excused = new Set<string>();
  for (const pattern of contraindicatedPatterns(injuries)) {
    if (pattern === 'back_extension') continue;
    const m = PATTERN_MUSCLES[pattern];
    if (!m) continue;
    if (TWICE_A_WEEK.includes(m.primary)) excused.add(m.primary);
    for (const sec of m.secondary) if (sec === 'glutes') excused.add(sec);
  }
  return excused;
}

export interface CheckResult {
  ok: boolean;
  problems: string[];
}

export function checkPlan(plan: FilledPlan, profile: Pick<PlanProfile, 'sessionMinutes' | 'injuries'>, goal: BlueprintGoal): CheckResult {
  const problems: string[] = [];
  if (plan.days.length === 0 || plan.days.some((d) => d.slots.length === 0)) problems.push('A session has no exercises.');
  for (const d of plan.days) {
    const firstNonMain = d.slots.findIndex((s) => s.role !== 'main');
    if (firstNonMain >= 0 && d.slots.slice(firstNonMain).some((s) => s.role === 'main')) problems.push(`${d.name}: a main lift comes after an accessory.`);
    if (profile.sessionMinutes && sessionMinutes(d) > profile.sessionMinutes) problems.push(`${d.name}: ${sessionMinutes(d)} min is over ${profile.sessionMinutes}.`);
  }
  const weekly = weeklyMuscleSets(plan);
  const excused = excusedMuscles(profile.injuries);
  const bounds = WEEKLY_SETS[goal];
  for (const m of TWICE_A_WEEK) {
    if (excused.has(m)) continue;
    const w = weekly[m] ?? { sets: 0, days: 0 };
    if (plan.days.length >= 2 && w.days < 2) problems.push(`${m} is trained ${w.days} time(s) a week, needs 2.`);
    if (w.sets < bounds.min) problems.push(`${m} has ${w.sets} weekly sets, needs at least ${bounds.min}.`);
    if (w.sets > bounds.max) problems.push(`${m} has ${w.sets} weekly sets, over ${bounds.max}.`);
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Adjusts a filled plan by rules until it passes the checks or nothing more can change:
 * 1. over the session length: drop optional slots from the end of the session, then trim accessory and
 *    isolation sets down to 2, then drop isolation slots, trim main lifts to 3 sets, drop remaining
 *    accessories (keeping 3 exercises) and last trim main lifts to 2 sets;
 * 2. over the weekly set ceiling for a muscle: trim that muscle's accessory sets.
 * Never removes a main lift's only slot for a muscle that must be trained twice.
 */
export function fitPlan(plan: FilledPlan, profile: Pick<PlanProfile, 'sessionMinutes' | 'injuries'>, goal: BlueprintGoal): { plan: FilledPlan; check: CheckResult } {
  const days = plan.days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s })) }));
  const dropped = [...plan.dropped];
  const adjustments = [...plan.adjustments];
  const limit = profile.sessionMinutes;

  if (limit) {
    for (const d of days) {
      const note = (m: string) => adjustments.push(`${d.name}: ${m}`);
      for (let i = d.slots.length - 1; i >= 0 && sessionMinutes(d) > limit; i--) {
        if (d.slots[i].optional) {
          dropped.push({ day: d.name, pattern: d.slots[i].pattern, reason: 'time' });
          note(`dropped optional ${d.slots[i].pattern}`);
          d.slots.splice(i, 1);
        }
      }
      for (let guard = 0; guard < 40 && sessionMinutes(d) > limit; guard++) {
        const trim = [...d.slots].reverse().find((s) => s.role !== 'main' && s.sets > 2);
        if (!trim) break;
        trim.sets -= 1;
        note(`trimmed ${trim.exercise.name} to ${trim.sets} sets`);
      }
      for (let guard = 0; guard < 20 && sessionMinutes(d) > limit; guard++) {
        const idx = [...d.slots].map((s, i) => ({ s, i })).reverse().find((x) => x.s.role === 'isolation');
        if (!idx || d.slots.length <= 3) break;
        dropped.push({ day: d.name, pattern: idx.s.pattern, reason: 'time' });
        note(`dropped ${idx.s.exercise.name}`);
        d.slots.splice(idx.i, 1);
      }
      for (let guard = 0; guard < 20 && sessionMinutes(d) > limit; guard++) {
        const trim = d.slots.find((s) => s.role === 'main' && s.sets > 3);
        if (!trim) break;
        trim.sets -= 1;
        note(`trimmed ${trim.exercise.name} to ${trim.sets} sets`);
      }
      for (let guard = 0; guard < 20 && sessionMinutes(d) > limit; guard++) {
        const idx = [...d.slots].map((s, i) => ({ s, i })).reverse().find((x) => x.s.role !== 'main');
        if (!idx || d.slots.length <= 3) break;
        dropped.push({ day: d.name, pattern: idx.s.pattern, reason: 'time' });
        note(`dropped ${idx.s.exercise.name}`);
        d.slots.splice(idx.i, 1);
      }
      for (let guard = 0; guard < 20 && sessionMinutes(d) > limit; guard++) {
        const trim = d.slots.find((s) => s.role === 'main' && s.sets > 2);
        if (!trim) break;
        trim.sets -= 1;
        note(`trimmed ${trim.exercise.name} to ${trim.sets} sets`);
      }
    }
  }

  let fitted: FilledPlan = { ...plan, days, dropped, adjustments };
  const bounds = WEEKLY_SETS[goal];
  for (let guard = 0; guard < 60; guard++) {
    const weekly = weeklyMuscleSets(fitted);
    const over = Object.entries(weekly).find(([m, w]) => TWICE_A_WEEK.includes(m) && w.sets > bounds.max);
    if (!over) break;
    const target = [...fitted.days].reverse().flatMap((d) => [...d.slots].reverse()).find((s) => {
      const m = PATTERN_MUSCLES[s.exercise.movement_pattern ?? s.pattern];
      return s.role !== 'main' && s.sets > 2 && m && (m.primary === over[0] || m.secondary.includes(over[0]));
    });
    if (!target) break;
    target.sets -= 1;
    adjustments.push(`trimmed ${target.exercise.name} to ${target.sets} sets (${over[0]} volume)`);
    fitted = { ...fitted, adjustments };
  }

  return { plan: fitted, check: checkPlan(fitted, profile, goal) };
}

// ─── Blocks ───────────────────────────────────────────────────────────────

export const BLOCK_WEEKS = 6;

export interface BlockState {
  blockNumber: number;
  blockWeek: number;
}

/**
 * Where the user is in the 6-week cycle. The previous plan stores its block and week; whole weeks since it was
 * created move the week on, and week 7 starts the next block at week 1.
 */
export function nextBlockState(previous: (BlockState & { createdAtMs: number }) | null, nowMs: number): BlockState {
  if (!previous) return { blockNumber: 1, blockWeek: 1 };
  const weeks = Math.max(0, Math.floor((nowMs - previous.createdAtMs) / (7 * 24 * 60 * 60 * 1000)));
  const index = (previous.blockNumber - 1) * BLOCK_WEEKS + (previous.blockWeek - 1) + weeks;
  return { blockNumber: Math.floor(index / BLOCK_WEEKS) + 1, blockWeek: (index % BLOCK_WEEKS) + 1 };
}

/** Week 6 is lighter: one set fewer on every slot (never below 1). */
export function applyBlockWeek(plan: FilledPlan, blockWeek: number): FilledPlan {
  if (blockWeek < BLOCK_WEEKS) return plan;
  return { ...plan, days: plan.days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s, sets: Math.max(1, s.sets - 1) })) })), adjustments: [...plan.adjustments, 'Week 6: one set fewer per exercise'] };
}

/** "Too hard" takes a set off each accessory (never below 2); "too easy" adds one to each main lift (up to 5). */
export function applyRegenerationReason(plan: FilledPlan, reason: string | null): FilledPlan {
  if (reason !== 'too_hard' && reason !== 'too_easy') return plan;
  const days = plan.days.map((d) => ({
    ...d,
    slots: d.slots.map((s) => {
      if (reason === 'too_hard' && s.role !== 'main') return { ...s, sets: Math.max(2, s.sets - 1) };
      if (reason === 'too_easy' && s.role === 'main') return { ...s, sets: Math.min(5, s.sets + 1) };
      return s;
    }),
  }));
  return { ...plan, days, adjustments: [...plan.adjustments, reason === 'too_hard' ? 'Accessories: one set fewer' : 'Main lifts: one set more'] };
}

// ─── Output ───────────────────────────────────────────────────────────────

export interface PlanExerciseOut {
  exerciseId?: string;
  name: string;
  sets: number;
  reps: number;
  repMin: number;
  repMax: number;
  role: string;
  restSec: number;
  rir: number;
}

export interface PlanOut {
  days: { day: string; focus: string; exercises: PlanExerciseOut[] }[];
  notes?: string;
}

/** The shape generate-plan has always returned, plus the slot details the player can use. */
export function toPlan(plan: FilledPlan, weekdayNames?: string[] | null): PlanOut {
  return {
    days: plan.days.map((d, i) => ({
      day: weekdayNames?.[i] ?? `Day ${i + 1}`,
      focus: d.name,
      exercises: d.slots.map((s) => ({
        exerciseId: s.exercise.id,
        name: s.exercise.name,
        sets: s.sets,
        reps: Math.floor((s.repRange[0] + s.repRange[1]) / 2),
        repMin: s.repRange[0],
        repMax: s.repRange[1],
        role: s.role,
        restSec: s.restSec,
        rir: s.rir,
      })),
    })),
    notes: plan.adjustments.length > 0 ? plan.adjustments.join('. ') + '.' : undefined,
  };
}

/** True when an injury rules out jumping and impact work (used by the fill and the app's card text). */
export function plansAroundImpact(injuries: Injury[]): boolean {
  return avoidsImpact(injuries);
}

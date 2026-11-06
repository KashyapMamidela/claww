// Polish step 3: a week built from the ways the user likes to train (gym, calisthenics, home, yoga, mobility).
// Deterministic, like planTree.ts: the same user and inputs always give the same plan, and no model is involved.
//
//  - The first style picked is the main one and gets most of the days; the others fill the rest.
//  - Gym, home and calisthenics sessions come from the reviewed strength blueprints (home = dumbbells, calisthenics =
//    bodyweight only, filled with progressions first).
//  - Yoga and mobility sessions are timed blocks built from the catalog's yoga and mobility rows, sized to the time
//    the user has. The player already runs these as timed blocks.
// Every blueprint is still `reviewed: false` until the trainer approves it; yoga and mobility have no blueprint file yet,
// their rules live here and are in the trainer's review list.

import type { Blueprint, BlueprintPlace } from './blueprints/schema.ts';
import {
  applyBlockWeek, applyRegenerationReason, fillBlueprint, fitPlan, hash, pickBlueprint, toPlan,
  type CatalogRow, type PlanExerciseOut, type PlanOut, type PlanProfile,
} from './planTree.ts';
import { isExerciseAllowed, type Injury } from './injuryRules.ts';

export type TrainStyle = 'gym' | 'calisthenics' | 'home' | 'yoga' | 'mobility';
export const TRAIN_STYLES: TrainStyle[] = ['gym', 'calisthenics', 'home', 'yoga', 'mobility'];
export const STRENGTH_STYLES: TrainStyle[] = ['gym', 'home', 'calisthenics'];
export const FLOW_STYLES: TrainStyle[] = ['yoga', 'mobility'];

/** Styles in the order picked, unknown ids and repeats dropped. */
export function cleanStyles(styles: unknown): TrainStyle[] {
  if (!Array.isArray(styles)) return [];
  const out: TrainStyle[] = [];
  for (const s of styles) if (TRAIN_STYLES.includes(s as TrainStyle) && !out.includes(s as TrainStyle)) out.push(s as TrainStyle);
  return out;
}

/** True when the plan needs the style-aware builder; a plain gym or home user keeps the original path. */
export function needsStyledPlan(styles: TrainStyle[]): boolean {
  return styles.length > 1 || styles.some((s) => s === 'calisthenics' || FLOW_STYLES.includes(s));
}

/**
 * The style of each session of the week, in order. One style fills every day. With more, the others take about a third
 * of the days (at least one) shared round-robin and spaced out between the main style's days.
 */
export function distributeStyleDays(styles: TrainStyle[], days: number): TrainStyle[] {
  const clean = cleanStyles(styles);
  const n = Math.max(1, Math.round(days));
  if (clean.length === 0) return Array(n).fill('gym');
  if (clean.length === 1 || n === 1) return Array(n).fill(clean[0]);
  const [main, ...rest] = clean;
  const others = Math.min(n - 1, Math.max(1, Math.round(n * 0.35)));
  const out: TrainStyle[] = Array(n).fill(main);
  const taken = new Set<number>();
  for (let k = 0; k < others; k++) {
    let pos = Math.min(n - 1, Math.floor(((k + 0.5) * n) / others));
    while (taken.has(pos)) pos = (pos + 1) % n;
    taken.add(pos);
    out[pos] = rest[k % rest.length];
  }
  return out;
}

const PLACE_OF: Record<string, BlueprintPlace> = { gym: 'gym', home: 'home', calisthenics: 'none' };
const TIERS: Record<string, string[]> = { gym: ['none', 'home', 'gym'], home: ['none', 'home'], none: ['none'] };

/** Calisthenics sessions reach for these first when a slot has several fits. */
export const CALISTHENICS_PREFERRED = new Set([
  'Pull-Up', 'Chin-Up', 'Negative Pull-Up', 'Inverted Row', 'Push-Up', 'Decline Push-Up', 'Diamond Push-Up', 'Archer Push-Up',
  'Pseudo Planche Push-Up', 'Pike Push-Up', 'Wall Handstand Hold', 'Bodyweight Dip', 'Pistol Squat', 'Shrimp Squat', 'Cossack Squat',
  'Bulgarian Split Squat', 'Nordic Curl Negative', 'Hollow Body Hold', 'L-Sit Hold', 'Hanging Knee Raise', 'Hanging Leg Raise', 'Single-Leg Glute Bridge',
]);

export interface StyledInput {
  profile: PlanProfile;
  styles: TrainStyle[];
  catalog: CatalogRow[];
  blueprints: Blueprint[];
  seed: string;
  blockNumber: number;
  blockWeek: number;
  dislikes?: string[];
  reason?: string | null;
  variant?: number;
}

export interface StyledResult {
  plan: PlanOut;
  /** The blueprint of the main strength style, for the workouts.blueprint_id column; null for a flow-only week. */
  blueprintId: string | null;
  /** Plain words for the setup card. */
  summary: string;
}

const lower = (s: string) => s.toLowerCase();
const STYLE_LABEL: Record<TrainStyle, string> = { gym: 'gym', calisthenics: 'calisthenics', home: 'home', yoga: 'yoga', mobility: 'mobility' };

function flowMinutes(style: 'yoga' | 'mobility', sessionMinutes: number | null): number {
  const asked = sessionMinutes && sessionMinutes > 0 ? sessionMinutes : style === 'yoga' ? 30 : 20;
  return style === 'yoga' ? Math.min(60, Math.max(15, asked)) : Math.min(30, Math.max(10, Math.round(asked / 2)));
}

const AREAS: { name: string; muscles: string[] }[] = [
  { name: 'lower body', muscles: ['glutes', 'quads', 'hamstrings', 'calves'] },
  { name: 'upper body', muscles: ['shoulders', 'chest', 'back', 'biceps', 'triceps'] },
  { name: 'whole body', muscles: ['core', 'glutes', 'back', 'shoulders', 'quads', 'hamstrings'] },
];

function block(row: CatalogRow, minutes: number): PlanExerciseOut {
  return { exerciseId: row.id, name: row.name, sets: 1, reps: minutes, repMin: minutes, repMax: minutes, role: 'accessory', restSec: 0, rir: 0 };
}

/** One yoga or mobility session as timed blocks. Returns null when the catalog has nothing for it. */
export function buildFlowDay(
  style: 'yoga' | 'mobility',
  index: number,
  catalog: CatalogRow[],
  opts: { seed: string; blockNumber: number; sessionMinutes: number | null; injuries: Injury[]; dislikes: Set<string>; used: Set<string> }
): { name: string; focus: string; exercises: PlanExerciseOut[] } | null {
  const total = flowMinutes(style, opts.sessionMinutes);
  const pool = catalog.filter((e) => e.modality === style && !opts.dislikes.has(lower(e.name)) && isExerciseAllowed(e, opts.injuries));
  if (pool.length === 0) return null;
  const area = AREAS[index % AREAS.length];
  const blocks = style === 'yoga' ? Math.min(5, Math.max(2, Math.round(total / 10))) : Math.min(6, Math.max(3, Math.round(total / 5)));
  // The player reads a one-set slot's reps as minutes only from 5 to 90, so a block is never shorter than 5.
  const per = Math.max(5, Math.round(total / blocks / 5) * 5);
  const key = `${opts.seed}|b${opts.blockNumber}|${style}|${index}`;
  const rank = (e: CatalogRow) => {
    const flowFirst = style === 'yoga' && /flow|sequence|salutation/i.test(e.name) ? 0 : 1;
    const areaFit = style === 'mobility' && e.primary_muscle && area.muscles.includes(e.primary_muscle) ? 0 : 1;
    const fresh = opts.used.has(e.name) ? 1 : 0;
    return [fresh, areaFit, flowFirst, hash(`${key}|${e.name}`)];
  };
  const sorted = [...pool].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return a.name.localeCompare(b.name);
  });
  const chosen = sorted.slice(0, Math.min(blocks, sorted.length));
  for (const c of chosen) opts.used.add(c.name);
  const letter = String.fromCharCode(65 + index);
  return {
    name: style === 'yoga' ? `Yoga flow ${letter}` : `Mobility, ${area.name}`,
    focus: style === 'yoga' ? `Yoga flow ${letter}` : `Mobility, ${area.name}`,
    exercises: chosen.map((c) => block(c, per)),
  };
}

export function buildStyledPlan(input: StyledInput): StyledResult {
  const { profile, catalog, blueprints } = input;
  const styles = cleanStyles(input.styles);
  const order = distributeStyleDays(styles.length > 0 ? styles : ['gym'], profile.daysPerWeek);
  const dislikes = new Set((input.dislikes ?? []).map(lower));

  // Strength-family groups, filled once per style and consumed in session order.
  const groupDays = new Map<string, PlanOut['days']>();
  let blueprintId: string | null = null;
  for (const style of STRENGTH_STYLES) {
    const count = order.filter((s) => s === style).length;
    if (count === 0) continue;
    const place = PLACE_OF[style];
    const groupProfile: PlanProfile = { ...profile, equipment: place, daysPerWeek: Math.max(2, count) };
    const picked = pickBlueprint(groupProfile, blueprints);
    const filled = fillBlueprint(picked.blueprint, catalog, {
      seed: `${input.seed}|${style}`,
      allowedEquipment: TIERS[place],
      injuries: profile.injuries,
      blockNumber: input.blockNumber,
      dislikes: input.dislikes,
      variant: input.variant ?? 0,
      prefer: style === 'calisthenics' ? CALISTHENICS_PREFERRED : undefined,
    });
    const fitted = fitPlan(filled, groupProfile, picked.blueprint.goal);
    const adjusted = applyBlockWeek(applyRegenerationReason(fitted.plan, input.reason ?? null), input.blockWeek);
    // A blueprint can have fewer sessions than the week needs (no 4-day maintenance plan, say): its days then repeat.
    const built = toPlan(adjusted).days;
    const out = built.length === 0 ? [] : Array.from({ length: count }, (_, i) => built[i % built.length]);
    if (style === styles.find((s) => STRENGTH_STYLES.includes(s))) blueprintId = picked.blueprint.id;
    groupDays.set(style, out);
  }

  const used = new Set<string>();
  const counters: Record<string, number> = {};
  const days: PlanOut['days'] = [];
  const notes: string[] = [];
  for (const style of order) {
    const i = (counters[style] = (counters[style] ?? -1) + 1);
    if (STRENGTH_STYLES.includes(style)) {
      const d = groupDays.get(style)?.[i];
      if (d) days.push({ day: `Day ${days.length + 1}`, focus: style === 'calisthenics' ? `Calisthenics, ${d.focus.toLowerCase()}` : d.focus, exercises: d.exercises });
    } else {
      const flow = buildFlowDay(style as 'yoga' | 'mobility', i, catalog, {
        seed: input.seed, blockNumber: input.blockNumber, sessionMinutes: profile.sessionMinutes, injuries: profile.injuries, dislikes, used,
      });
      if (flow) days.push({ day: `Day ${days.length + 1}`, focus: flow.focus, exercises: flow.exercises });
      else notes.push(`${STYLE_LABEL[style]} could not be built from the exercise list.`);
    }
  }

  const counts = (['gym', 'home', 'calisthenics', 'yoga', 'mobility'] as TrainStyle[])
    .map((s) => [s, order.filter((x) => x === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${n === 1 ? 'day' : 'days'} ${STYLE_LABEL[s]}`);
  const summary = counts.join(' + ');
  if (summary) notes.unshift(`Your week: ${summary}.`);
  return { plan: { days, notes: notes.length > 0 ? notes.join(' ') : undefined }, blueprintId, summary };
}

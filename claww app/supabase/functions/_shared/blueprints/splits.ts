// Training styles ("splits"): the same week written for every goal and place, so the user can choose how the week is
// cut up (full body, upper / lower, push / pull / legs, or one body part a day) instead of being given whatever fits
// their number of days. Dependency-free and deterministic, like the JSON blueprints beside it: the sets, reps, reps in
// reserve and rest per role come from the same numbers the reviewed JSON files use for each goal.
//
// These are generated at load time rather than written out as files because there are 12 per day-count (4 goals x 3
// places) and they differ only by those numbers. They are `reviewed: false`, like every blueprint, and the trainer
// reviews the templates below (SPLITS) plus GOAL_PARAMS once, not 80 files.

import type { Blueprint, BlueprintDay, BlueprintGoal, BlueprintPlace, BlueprintSlot, SlotRole } from './schema.ts';

export type Split = 'FB' | 'UL' | 'PPL' | 'BRO';
export const SPLIT_IDS: Split[] = ['FB', 'UL', 'PPL', 'BRO'];

export const SPLIT_LABELS: Record<Split, string> = {
  FB: 'Full body',
  UL: 'Upper / Lower',
  PPL: 'Push / Pull / Legs',
  BRO: 'Body-part split',
};

/** One line the user can read under each choice. */
export const SPLIT_BLURBS: Record<Split, string> = {
  FB: 'Every session trains your whole body. Easiest to fit around a busy week.',
  UL: 'Upper body one day, lower body the next. Each muscle twice a week.',
  PPL: 'Push, pull and legs days. More sessions, shorter ones.',
  BRO: 'One or two muscles a day: chest, back, shoulders, legs, arms.',
};

/** The days per week each style is written for. */
export const SPLIT_DAYS: Record<Split, number[]> = {
  FB: [2, 3, 4],
  UL: [4, 6],
  PPL: [3, 6],
  BRO: [4, 5],
};

/** Muscles trained once a week by these plans (the twice-a-week check is not applied to them). */
export function trainsOnceAWeek(split: string, daysPerWeek: number): boolean {
  return split === 'BRO' || (split === 'PPL' && daysPerWeek <= 3);
}

interface RoleParams {
  sets: number;
  repRange: [number, number];
  rir: number;
  restSec: number;
}

/** Sets, reps, reps in reserve and rest per role, as in the reviewed JSON blueprints for each goal. */
const GOAL_PARAMS: Record<BlueprintGoal, Record<SlotRole, RoleParams>> = {
  muscle: {
    main: { sets: 4, repRange: [6, 10], rir: 2, restSec: 150 },
    accessory: { sets: 3, repRange: [8, 12], rir: 2, restSec: 90 },
    isolation: { sets: 3, repRange: [10, 15], rir: 1, restSec: 60 },
  },
  strength: {
    main: { sets: 4, repRange: [3, 6], rir: 2, restSec: 180 },
    accessory: { sets: 3, repRange: [6, 10], rir: 2, restSec: 105 },
    isolation: { sets: 2, repRange: [10, 15], rir: 1, restSec: 60 },
  },
  fat_loss: {
    main: { sets: 3, repRange: [8, 12], rir: 2, restSec: 120 },
    accessory: { sets: 3, repRange: [12, 15], rir: 2, restSec: 75 },
    isolation: { sets: 2, repRange: [15, 20], rir: 1, restSec: 45 },
  },
  general: {
    main: { sets: 3, repRange: [8, 12], rir: 2, restSec: 120 },
    accessory: { sets: 3, repRange: [10, 15], rir: 2, restSec: 90 },
    isolation: { sets: 2, repRange: [12, 15], rir: 1, restSec: 60 },
  },
};

/** [pattern, role, optional?, sets override?] */
type Spec = [string, SlotRole, boolean?, number?];
interface DaySpec {
  name: string;
  slots: Spec[];
}

const M: SlotRole = 'main';
const A: SlotRole = 'accessory';
const I: SlotRole = 'isolation';

/** The weeks. Main lifts first in every day (the validator requires it). */
const SPLITS: Record<Split, Record<number, DaySpec[]>> = {
  FB: {
    2: [
      { name: 'Full body A', slots: [['squat', M], ['horizontal_push', M], ['horizontal_pull', M], ['hinge', A], ['core_anti_extension', I]] },
      { name: 'Full body B', slots: [['hinge', M], ['vertical_push', M], ['vertical_pull', M], ['lunge', A], ['horizontal_push', A], ['core_anti_rotation', I, true]] },
    ],
    3: [
      { name: 'Full body A', slots: [['squat', M], ['horizontal_push', M], ['horizontal_pull', M], ['hinge', A], ['core_anti_extension', I]] },
      { name: 'Full body B', slots: [['hinge', M], ['vertical_push', M], ['vertical_pull', M], ['lunge', A], ['horizontal_push', A, true], ['core_anti_rotation', I, true]] },
      { name: 'Full body C', slots: [['squat', M], ['horizontal_pull', M], ['horizontal_push', M], ['hinge', A], ['vertical_pull', A, true], ['core_anti_lateral', I, true]] },
    ],
    4: [
      { name: 'Full body A', slots: [['squat', M], ['horizontal_push', M], ['horizontal_pull', M], ['hinge', A], ['core_anti_extension', I, true]] },
      { name: 'Full body B', slots: [['hinge', M], ['vertical_push', M], ['vertical_pull', M], ['lunge', A], ['elbow_flexion', I, true]] },
      { name: 'Full body C', slots: [['squat', M], ['horizontal_pull', M], ['horizontal_push', A], ['vertical_push', A, true], ['elbow_extension', I, true]] },
      { name: 'Full body D', slots: [['hinge', M], ['vertical_pull', M], ['horizontal_push', M], ['lunge', A], ['calf_raise', I, true]] },
    ],
  },
  UL: {
    4: [
      { name: 'Upper A', slots: [['horizontal_push', M], ['horizontal_pull', M], ['vertical_push', A], ['vertical_pull', A], ['elbow_flexion', I], ['elbow_extension', I]] },
      { name: 'Lower A', slots: [['squat', M], ['hinge', A], ['lunge', A], ['knee_flexion', I, true], ['calf_raise', I], ['core_anti_extension', I]] },
      { name: 'Upper B', slots: [['vertical_push', M], ['vertical_pull', M], ['horizontal_push', A], ['horizontal_pull', A], ['elbow_flexion', I, true], ['elbow_extension', I, true]] },
      { name: 'Lower B', slots: [['hinge', M], ['squat', A], ['lunge', A, true], ['knee_flexion', I, true], ['calf_raise', I, true], ['core_anti_rotation', I, true]] },
    ],
    6: [
      { name: 'Upper A', slots: [['horizontal_push', M], ['horizontal_pull', M], ['vertical_push', A], ['vertical_pull', A], ['elbow_flexion', I], ['elbow_extension', I]] },
      { name: 'Lower A', slots: [['squat', M], ['hinge', A], ['lunge', A, true], ['knee_flexion', I, true], ['calf_raise', I], ['core_anti_extension', I, true]] },
      { name: 'Upper B', slots: [['vertical_push', M], ['vertical_pull', M], ['horizontal_push', A], ['horizontal_pull', A], ['elbow_flexion', I, true], ['elbow_extension', I, true]] },
      { name: 'Lower B', slots: [['hinge', M], ['squat', A], ['lunge', A], ['knee_flexion', I, true], ['calf_raise', I, true], ['core_anti_rotation', I, true]] },
      { name: 'Upper C', slots: [['horizontal_push', M], ['vertical_pull', M], ['vertical_push', A], ['elbow_flexion', I, true], ['elbow_extension', I, true]] },
      { name: 'Lower C', slots: [['squat', M], ['hinge', A], ['knee_extension', I, true], ['calf_raise', I, true], ['core_flexion', I, true]] },
    ],
  },
  PPL: {
    3: [
      { name: 'Push', slots: [['horizontal_push', M], ['vertical_push', M], ['horizontal_push', A], ['vertical_push', A], ['elbow_extension', I]] },
      { name: 'Pull', slots: [['vertical_pull', M], ['horizontal_pull', M], ['horizontal_pull', A], ['vertical_pull', A, true], ['elbow_flexion', I]] },
      { name: 'Legs', slots: [['squat', M], ['hinge', M], ['lunge', A, false, 4], ['knee_flexion', I], ['calf_raise', I], ['core_anti_extension', I, true]] },
    ],
    6: [
      { name: 'Push', slots: [['horizontal_push', M], ['vertical_push', M], ['horizontal_push', A], ['elbow_extension', I], ['core_anti_extension', I, true]] },
      { name: 'Pull', slots: [['vertical_pull', M], ['horizontal_pull', M], ['horizontal_pull', A], ['elbow_flexion', I]] },
      { name: 'Legs', slots: [['squat', M], ['hinge', M], ['lunge', A], ['knee_flexion', I, true], ['calf_raise', I], ['core_anti_extension', I, true]] },
      { name: 'Push (2)', slots: [['horizontal_push', M], ['vertical_push', M], ['horizontal_push', A, false, 2], ['elbow_extension', I, false, 2], ['core_anti_extension', I, true, 2]] },
      { name: 'Pull (2)', slots: [['vertical_pull', M], ['horizontal_pull', M], ['horizontal_pull', A, false, 2], ['elbow_flexion', I, false, 2]] },
      { name: 'Legs (2)', slots: [['squat', M], ['hinge', M], ['lunge', A, false, 2], ['knee_flexion', I, true, 2], ['calf_raise', I, false, 2], ['core_anti_extension', I, true, 2]] },
    ],
  },
  BRO: {
    4: [
      { name: 'Chest and triceps', slots: [['horizontal_push', M], ['horizontal_push', A], ['vertical_push', A], ['elbow_extension', I], ['core_anti_extension', I, true]] },
      { name: 'Back and biceps', slots: [['vertical_pull', M], ['horizontal_pull', M], ['horizontal_pull', A], ['elbow_flexion', I]] },
      { name: 'Legs', slots: [['squat', M], ['hinge', M], ['lunge', A], ['knee_flexion', I], ['calf_raise', I]] },
      { name: 'Shoulders and arms', slots: [['vertical_push', M], ['vertical_push', A], ['horizontal_pull', A], ['elbow_flexion', I], ['elbow_extension', I]] },
    ],
    5: [
      { name: 'Chest', slots: [['horizontal_push', M], ['horizontal_push', A], ['horizontal_push', A], ['core_anti_extension', I, true]] },
      { name: 'Back', slots: [['vertical_pull', M], ['horizontal_pull', M], ['horizontal_pull', A], ['vertical_pull', A], ['back_extension', I, true]] },
      { name: 'Shoulders', slots: [['vertical_push', M], ['vertical_push', A], ['horizontal_pull', A], ['core_anti_lateral', I, true]] },
      { name: 'Legs', slots: [['squat', M], ['hinge', M], ['lunge', A], ['knee_flexion', I], ['calf_raise', I]] },
      { name: 'Arms and core', slots: [['elbow_extension', M], ['elbow_flexion', A], ['elbow_extension', A], ['elbow_flexion', I], ['vertical_push', A], ['core_flexion', I], ['core_anti_lateral', I]] },
    ],
  },
};

const BLUEPRINT_PLACES_ALL: BlueprintPlace[] = ['gym', 'home', 'none'];
const GOALS_ALL: BlueprintGoal[] = ['muscle', 'fat_loss', 'strength', 'general'];

function slotFor(goal: BlueprintGoal, spec: Spec): BlueprintSlot {
  const [pattern, role, optional, sets] = spec;
  const p = GOAL_PARAMS[goal][role];
  const slot: BlueprintSlot = { pattern, role, sets: sets ?? p.sets, repRange: [...p.repRange] as [number, number], rir: p.rir, restSec: p.restSec };
  if (optional) slot.optional = true;
  return slot;
}

export function splitBlueprint(split: Split, days: number, goal: BlueprintGoal, place: BlueprintPlace): Blueprint | null {
  const template = SPLITS[split]?.[days];
  if (!template) return null;
  const outDays: BlueprintDay[] = template.map((d) => ({ name: d.name, slots: d.slots.map((s) => slotFor(goal, s)) }));
  const placeTitle = place === 'gym' ? 'gym' : place === 'home' ? 'home' : 'no equipment';
  return {
    id: `${goal}-${place}-${split.toLowerCase()}-${days}d`,
    version: 1,
    reviewed: false,
    title: `${SPLIT_LABELS[split]}, ${days} days, ${placeTitle}`,
    goal,
    place,
    daysPerWeek: days,
    minMonths: 0,
    split,
    rationale:
      split === 'BRO' || (split === 'PPL' && days <= 3)
        ? 'Each muscle gets one focused session a week with plenty of hard sets, main lifts first, close to failure on the last sets.'
        : 'Each muscle is trained about twice a week, main lifts first, close to failure on the last sets.',
    days: outDays,
  };
}

/** Every style x day count x goal x place. Ids never clash with the reviewed JSON blueprints (they carry the split). */
export function splitBlueprints(): Blueprint[] {
  const out: Blueprint[] = [];
  for (const split of SPLIT_IDS) {
    for (const days of SPLIT_DAYS[split]) {
      for (const goal of GOALS_ALL) {
        for (const place of BLUEPRINT_PLACES_ALL) {
          const b = splitBlueprint(split, days, goal, place);
          if (b) out.push(b);
        }
      }
    }
  }
  return out;
}

export const SPLIT_BLUEPRINTS: Blueprint[] = splitBlueprints();

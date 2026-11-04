// NG PHASE 5.1: the blueprint format. A blueprint is a reviewed weekly template: days of slots, each slot a
// movement pattern with a role, sets, a rep range, reps in reserve and rest. The model never writes one.
// Dependency-free on purpose (like the rest of _shared/ that Vitest runs under Node), so validation is a plain
// function instead of Zod; it returns every problem it finds.

export type BlueprintGoal = 'muscle' | 'fat_loss' | 'strength' | 'general';
export type BlueprintPlace = 'gym' | 'home' | 'none';
export type SlotRole = 'main' | 'accessory' | 'isolation';

export interface BlueprintSlot {
  pattern: string;
  role: SlotRole;
  sets: number;
  repRange: [number, number];
  rir: number;
  restSec: number;
  optional?: boolean;
}

export interface BlueprintDay {
  name: string;
  slots: BlueprintSlot[];
}

export interface Blueprint {
  id: string;
  version: number;
  /** false until a trainer has read it; shown in blueprints/README.md's review table. */
  reviewed: boolean;
  title: string;
  goal: BlueprintGoal;
  place: BlueprintPlace;
  daysPerWeek: number;
  /** Months of training needed before this blueprint is picked. */
  minMonths: number;
  split: string;
  rationale: string;
  days: BlueprintDay[];
}

export const BLUEPRINT_GOALS: BlueprintGoal[] = ['muscle', 'fat_loss', 'strength', 'general'];
export const BLUEPRINT_PLACES: BlueprintPlace[] = ['gym', 'home', 'none'];
export const SLOT_ROLES: SlotRole[] = ['main', 'accessory', 'isolation'];

export const KNOWN_PATTERNS = [
  'squat', 'hinge', 'lunge', 'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
  'knee_extension', 'knee_flexion', 'calf_raise', 'elbow_flexion', 'elbow_extension', 'back_extension',
  'core_anti_extension', 'core_anti_lateral', 'core_anti_rotation', 'core_flexion',
];

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export function validateBlueprint(bp: unknown): string[] {
  const errors: string[] = [];
  const b = bp as Partial<Blueprint> | null;
  if (!b || typeof b !== 'object') return ['not an object'];
  const id = typeof b.id === 'string' && b.id ? b.id : '(no id)';
  const err = (m: string) => errors.push(`${id}: ${m}`);
  if (!b.id) err('id is required');
  if (!isInt(b.version) || b.version < 1) err('version must be a positive integer');
  if (typeof b.reviewed !== 'boolean') err('reviewed must be true or false');
  if (!b.title) err('title is required');
  if (!BLUEPRINT_GOALS.includes(b.goal as BlueprintGoal)) err(`goal must be one of ${BLUEPRINT_GOALS.join(', ')}`);
  if (!BLUEPRINT_PLACES.includes(b.place as BlueprintPlace)) err(`place must be one of ${BLUEPRINT_PLACES.join(', ')}`);
  if (!isInt(b.daysPerWeek) || b.daysPerWeek < 2 || b.daysPerWeek > 6) err('daysPerWeek must be 2 to 6');
  if (!isInt(b.minMonths) || b.minMonths < 0) err('minMonths must be 0 or more');
  if (!Array.isArray(b.days) || b.days.length === 0) {
    err('days is required');
    return errors;
  }
  if (isInt(b.daysPerWeek) && b.days.length !== b.daysPerWeek) err(`has ${b.days.length} days but daysPerWeek is ${b.daysPerWeek}`);
  b.days.forEach((d, di) => {
    if (!d.name) err(`day ${di + 1} has no name`);
    if (!Array.isArray(d.slots) || d.slots.length === 0) return err(`day ${di + 1} has no slots`);
    if (d.slots[0].role !== 'main') err(`day ${di + 1} must start with a main lift`);
    let seenNonMain = false;
    d.slots.forEach((s, si) => {
      const w = `day ${di + 1} slot ${si + 1}`;
      if (!KNOWN_PATTERNS.includes(s.pattern)) err(`${w}: unknown pattern "${s.pattern}"`);
      if (!SLOT_ROLES.includes(s.role)) err(`${w}: role must be one of ${SLOT_ROLES.join(', ')}`);
      if (s.role !== 'main') seenNonMain = true;
      else if (seenNonMain) err(`${w}: main lifts must come before accessories`);
      if (!isInt(s.sets) || s.sets < 1 || s.sets > 6) err(`${w}: sets must be 1 to 6`);
      if (!Array.isArray(s.repRange) || s.repRange.length !== 2 || !isInt(s.repRange[0]) || !isInt(s.repRange[1]) || s.repRange[0] < 1 || s.repRange[0] > s.repRange[1]) {
        err(`${w}: repRange must be [min, max] with min <= max`);
      }
      if (!isInt(s.rir) || s.rir < 0 || s.rir > 4) err(`${w}: rir must be 0 to 4`);
      if (!isInt(s.restSec) || s.restSec < 15 || s.restSec > 300) err(`${w}: restSec must be 15 to 300`);
    });
  });
  return errors;
}

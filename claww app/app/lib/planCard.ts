// NG PHASE 5.5: the "Your plan" card on the setup screen. It runs the same pickBlueprint as generate-plan
// on the same inputs, so the card and the plan that gets generated always agree.

import { BLOCK_WEEKS, BLUEPRINTS, blueprintDayMinutes, pickBlueprint, type PickResult, type PlanProfile } from './engine';

export interface PlanCardInput {
  goal: string | null;
  equipment: string | null;
  daysPerWeek: number;
  trainingMonths: number | null;
  sessionMinutes: number | null;
  injuries: PlanProfile['injuries'];
}

export interface PlanCard {
  blueprintId: string;
  /** "Upper / Lower · gym" */
  title: string;
  /** Days in the plan actually picked (can differ from the days asked for when the nearest plan has another count). */
  days: number;
  weeks: number;
  minutes: number;
  /** "6-10 reps, progressive" */
  repStyle: string;
  /** Plain note when the plan is the nearest one, else null. */
  nearest: string | null;
}

const SPLIT_TITLES: Record<string, string> = {
  FB: 'Full body',
  UL: 'Upper / Lower',
  PPL: 'Push / Pull / Legs',
  PPLUL: 'Push / Pull / Legs + Upper / Lower',
};

const PLACE_TITLES: Record<string, string> = { gym: 'gym', home: 'home', none: 'no equipment' };

export function planCard(input: PlanCardInput): PlanCard {
  const profile: PlanProfile = { ...input };
  const pick: PickResult = pickBlueprint(profile, BLUEPRINTS);
  const bp = pick.blueprint;
  const longest = Math.max(...bp.days.map(blueprintDayMinutes));
  const minutes = input.sessionMinutes ? Math.min(longest, input.sessionMinutes) : longest;
  const mains = bp.days.flatMap((d) => d.slots.filter((s) => s.role === 'main'));
  const lo = Math.min(...mains.map((s) => s.repRange[0]));
  const hi = Math.max(...mains.map((s) => s.repRange[1]));
  return {
    blueprintId: bp.id,
    title: `${SPLIT_TITLES[bp.split] ?? bp.title} · ${PLACE_TITLES[bp.place] ?? bp.place}`,
    days: bp.daysPerWeek,
    weeks: BLOCK_WEEKS,
    minutes: Math.round(minutes / 5) * 5,
    repStyle: `${lo}–${hi} reps, progressive`,
    nearest: pick.exact ? null : pick.note,
  };
}

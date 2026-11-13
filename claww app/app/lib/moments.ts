// The finish moments (PhonePe-style confirmations, made for CLAWW): what the full-screen moment shows after a workout is
// saved, a meal is logged or an activity ends, and the daily goals it can announce. The emitter lets any screen or the
// data layer ask for a moment without importing the host. Pure apart from the emitter, so Vitest can test the goal logic.

export type MomentKind = 'workout' | 'meal' | 'activity';

export interface WorkoutMoment {
  kind: 'workout';
  userId: string;
  title: string;
  setsDone: number;
  setsPlanned: number;
  /** The big number: kg lifted, or reps done for a bodyweight session. */
  big: number;
  bigLabel: string;
  minutes: number;
  kcal: number;
  /** The coach's pen line for next time, when there is one. */
  line: string | null;
  /** A new best is announced by its own screen afterwards; this runs when the moment is gone. */
  onDone?: () => void;
}

export interface MealMoment {
  kind: 'meal';
  userId: string;
  mealType: string;
  kcal: number;
  proteinG: number;
}

export interface ActivityMoment {
  kind: 'activity';
  userId: string;
  name: string;
  minutes: number;
  kcal: number;
}

export type Moment = WorkoutMoment | MealMoment | ActivityMoment;

type Listener = (m: Moment) => void;
const listeners = new Set<Listener>();

export function onMoment(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function showMoment(m: Moment): void {
  listeners.forEach((fn) => fn(m));
}

// ---- Goals ----------------------------------------------------------------------------------------------------------

export interface DayTotals {
  kcal: number;
  proteinG: number;
  steps: number;
  waterMl: number;
}

export interface DayTargets {
  kcal: number | null;
  proteinG: number | null;
  steps: number | null;
  waterMl: number;
}

export type GoalKey = 'protein' | 'calories' | 'steps' | 'water' | 'sets';

export interface GoalHit {
  key: GoalKey;
  label: string;
}

const n = (v: number) => Math.round(v).toLocaleString('en-IN');

/** Every goal the totals have reached. */
export function goalsMet(totals: DayTotals, targets: DayTargets): GoalHit[] {
  const out: GoalHit[] = [];
  if (targets.proteinG && totals.proteinG >= targets.proteinG) out.push({ key: 'protein', label: `Protein ${n(targets.proteinG)} g` });
  if (targets.kcal && totals.kcal >= targets.kcal * 0.95 && totals.kcal <= targets.kcal * 1.1) out.push({ key: 'calories', label: `${n(targets.kcal)} kcal on target` });
  if (targets.steps && totals.steps >= targets.steps) out.push({ key: 'steps', label: `Steps ${n(targets.steps)}` });
  if (targets.waterMl && totals.waterMl >= targets.waterMl) out.push({ key: 'water', label: `Water ${(targets.waterMl / 1000).toFixed(targets.waterMl % 1000 === 0 ? 0 : 1)} L` });
  return out;
}

/** The goals this action pushed over the line: met after, not met before. */
export function goalsCrossed(before: DayTotals, after: DayTotals, targets: DayTargets): GoalHit[] {
  const was = new Set(goalsMet(before, targets).map((g) => g.key));
  return goalsMet(after, targets).filter((g) => !was.has(g.key));
}

/** What is left of the protein target, as the moment's quiet line ("84 g protein to go"). */
export function proteinToGo(totals: DayTotals, targets: DayTargets): string | null {
  if (!targets.proteinG) return null;
  const left = Math.round(targets.proteinG - totals.proteinG);
  return left > 0 ? `${left} g protein to go` : null;
}

/** The title of a meal moment: "Breakfast logged", or "Meal logged" when the type is empty. */
export function mealMomentTitle(mealType: string): string {
  const t = mealType.trim();
  return `${t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : 'Meal'} logged`;
}

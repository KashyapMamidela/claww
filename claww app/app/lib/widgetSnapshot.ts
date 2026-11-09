// Premium F2: what the Android home-screen widgets show. Home writes this snapshot whenever its numbers change; the
// widgets only read it, so they never need the network and open instantly.

export interface WidgetSnapshot {
  userId: string | null;
  kcal: number;
  kcalTarget: number | null;
  proteinLeft: number | null;
  /** "Push", or null on a rest day */
  session: string | null;
  sessionDone: boolean;
  streak: number;
  /** The three rings on Home, 0..100 */
  workoutPct: number;
  nutritionPct: number;
  recoveryPct: number;
  /** The Daily goal number in the middle of the rings */
  dailyPct: number;
  steps: number;
  stepsGoal: number;
  waterMl: number;
  waterGoalMl: number;
  updatedAt: number;
}

export const WIDGET_KEY = 'claww.widget.snapshot.v2';
export const GLASS_ML = 250;

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  userId: null,
  kcal: 0,
  kcalTarget: null,
  proteinLeft: null,
  session: null,
  sessionDone: false,
  streak: 0,
  workoutPct: 0,
  nutritionPct: 0,
  recoveryPct: 0,
  dailyPct: 0,
  steps: 0,
  stepsGoal: 8000,
  waterMl: 0,
  waterGoalMl: 2000,
  updatedAt: 0,
};

export interface WidgetLines {
  kcal: string;
  protein: string;
  steps: string;
  session: string;
  streak: string;
  daily: string;
  water: string;
  waterOf: string;
  glasses: string;
  waterPct: number;
}

const n = (v: number) => Math.round(v).toLocaleString('en-IN');
const litres = (ml: number) => {
  const l = ml / 1000;
  return `${ml % 1000 === 0 ? l : l.toFixed(2).replace(/0$/, '')}`;
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The words on the widgets, from a snapshot. Pure, so it is tested. */
export function widgetLines(s: WidgetSnapshot): WidgetLines {
  const hasTarget = s.kcalTarget !== null && s.kcalTarget > 0;
  return {
    kcal: hasTarget ? `${n(s.kcal)} / ${n(s.kcalTarget as number)} kcal` : `${n(s.kcal)} kcal`,
    protein: s.proteinLeft === null ? 'Set targets for protein' : s.proteinLeft <= 0 ? 'Protein done' : `${Math.round(s.proteinLeft)} g protein left`,
    steps: `${n(s.steps)} / ${n(s.stepsGoal)} steps`,
    session: s.session ? (s.sessionDone ? `${s.session} · done` : `${s.session} today`) : 'Rest day',
    streak: s.streak === 1 ? '1 day streak' : `${s.streak} day streak`,
    daily: `${Math.round(clamp01(s.dailyPct / 100) * 100)}%`,
    water: litres(s.waterMl),
    waterOf: `of ${litres(s.waterGoalMl)} L`,
    glasses: `${Math.floor(s.waterMl / GLASS_ML)} of ${Math.round(s.waterGoalMl / GLASS_ML)} glasses`,
    waterPct: s.waterGoalMl > 0 ? clamp01(s.waterMl / s.waterGoalMl) : 0,
  };
}

/** Round to what the widgets show, so an unchanged snapshot is not drawn again. */
export function sameSnapshot(a: WidgetSnapshot, b: WidgetSnapshot): boolean {
  const p = (v: number | null) => (v === null ? null : Math.round(v));
  return (
    p(a.kcal) === p(b.kcal) &&
    a.kcalTarget === b.kcalTarget &&
    p(a.proteinLeft) === p(b.proteinLeft) &&
    a.session === b.session &&
    a.sessionDone === b.sessionDone &&
    a.streak === b.streak &&
    p(a.workoutPct) === p(b.workoutPct) &&
    p(a.nutritionPct) === p(b.nutritionPct) &&
    p(a.recoveryPct) === p(b.recoveryPct) &&
    p(a.dailyPct) === p(b.dailyPct) &&
    p(a.steps) === p(b.steps) &&
    a.stepsGoal === b.stepsGoal &&
    p(a.waterMl) === p(b.waterMl) &&
    a.waterGoalMl === b.waterGoalMl &&
    a.userId === b.userId
  );
}

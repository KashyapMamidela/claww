// Premium F2, v3: what the Android home-screen widgets show. Home and the water row save this snapshot whenever their
// numbers change; the widgets only read it, so they draw instantly and never need the network. Everything here is pure
// (tested in widgetSnapshot.test.ts); the widgets in /widgets only lay out what these functions return.

export interface WidgetSnapshot {
  userId: string | null;
  /** Local date the numbers belong to, YYYY-MM-DD. A snapshot from an earlier day is shown as a fresh day. */
  day: string;
  kcal: number;
  kcalTarget: number | null;
  protein: number;
  proteinTarget: number | null;
  carbs: number;
  carbsTarget: number | null;
  fat: number;
  fatTarget: number | null;
  mealsLogged: number;
  /** The next meal still to eat today: "Lunch", "Soya chunks curry, 3 roti and rice" */
  nextMeal: { slot: string; name: string | null } | null;
  /** "Push", or null on a rest day */
  session: string | null;
  sessionDone: boolean;
  /** "6 pm" when the user has a usual training time */
  sessionTime: string | null;
  streak: number;
  /** The three rings on Home, 0..100 */
  workoutPct: number;
  nutritionPct: number;
  recoveryPct: number;
  recoveryScore: number | null;
  /** The Daily goal number in the middle of the rings */
  dailyPct: number;
  steps: number;
  stepsGoal: number;
  waterMl: number;
  waterGoalMl: number;
  updatedAt: number;
}

export const WIDGET_KEY = 'claww.widget.snapshot.v3';
export const GLASS_ML = 250;

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  userId: null,
  day: '',
  kcal: 0,
  kcalTarget: null,
  protein: 0,
  proteinTarget: null,
  carbs: 0,
  carbsTarget: null,
  fat: 0,
  fatTarget: null,
  mealsLogged: 0,
  nextMeal: null,
  session: null,
  sessionDone: false,
  sessionTime: null,
  streak: 0,
  workoutPct: 0,
  nutritionPct: 0,
  recoveryPct: 0,
  recoveryScore: null,
  dailyPct: 0,
  steps: 0,
  stepsGoal: 8000,
  waterMl: 0,
  waterGoalMl: 2000,
  updatedAt: 0,
};

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The snapshot as it should read now. After midnight yesterday's calories, water, steps and rings must not show as
 * today's: the day's counters go back to zero and the session is unknown until the app is opened. Targets, goals and
 * the streak carry over.
 */
export function forToday(s: WidgetSnapshot, now: Date): WidgetSnapshot {
  const today = dayKey(now);
  if (!s.day || s.day === today) return s;
  return {
    ...s,
    day: today,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealsLogged: 0,
    nextMeal: null,
    session: null,
    sessionDone: false,
    sessionTime: null,
    workoutPct: 0,
    nutritionPct: 0,
    recoveryPct: 0,
    recoveryScore: null,
    dailyPct: 0,
    steps: 0,
    waterMl: 0,
  };
}

/** Whether the numbers are old enough that the widget should say so (the app has not been opened for a while). */
export function staleLabel(s: WidgetSnapshot, now: Date): string | null {
  if (!s.updatedAt) return null;
  const hours = Math.floor((now.getTime() - s.updatedAt) / 3_600_000);
  if (hours < 3) return null;
  return hours >= 24 ? 'Open to refresh' : `${hours}h ago`;
}

// ─── Wording ──────────────────────────────────────────────────────────────────────────────────────────────────

const n = (v: number) => Math.round(v).toLocaleString('en-IN');
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const litres = (ml: number) => {
  const l = ml / 1000;
  return ml % 1000 === 0 ? String(l) : l.toFixed(2).replace(/0$/, '');
};

export type SizeClass = 'small' | 'medium' | 'large';

/** Android reports the widget's size in dp; layouts change with it rather than squeezing one layout. */
export function sizeClass(widthDp: number, heightDp: number): SizeClass {
  if (widthDp > 0 && widthDp < 230) return 'small';
  if (heightDp >= 250) return 'large';
  return 'medium';
}

export interface ActivityRow {
  key: 'workout' | 'food' | 'recovery';
  label: string;
  value: string;
  pct: number;
}

export interface ActivityView {
  daily: string;
  rows: ActivityRow[];
  steps: string;
  stepsGoal: string;
  stepsPct: number;
  streak: string;
  signedOut: boolean;
}

export function activityView(s: WidgetSnapshot): ActivityView {
  const workoutValue = s.sessionDone ? `${s.session ?? 'Session'} done` : s.session ? `${s.session}${s.sessionTime ? ` · ${s.sessionTime}` : ''}` : 'Rest day';
  const foodValue = s.kcalTarget ? `${n(s.kcal)} / ${n(s.kcalTarget)} kcal` : `${n(s.kcal)} kcal`;
  const recoveryValue = s.recoveryScore === null ? 'Log your sleep' : `${Math.round(s.recoveryScore)} / 100`;
  return {
    daily: `${Math.round(clamp01(s.dailyPct / 100) * 100)}%`,
    rows: [
      { key: 'workout', label: 'Workout', value: workoutValue, pct: s.workoutPct },
      { key: 'food', label: 'Food', value: foodValue, pct: s.nutritionPct },
      { key: 'recovery', label: 'Recovery', value: recoveryValue, pct: s.recoveryPct },
    ],
    steps: n(s.steps),
    stepsGoal: n(s.stepsGoal),
    stepsPct: s.stepsGoal > 0 ? clamp01(s.steps / s.stepsGoal) : 0,
    streak: s.streak > 0 ? `${s.streak}` : '0',
    signedOut: !s.userId,
  };
}

export interface MacroRow {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  value: string;
  pct: number;
}

export interface NutritionView {
  /** The big number in the ring */
  hero: string;
  heroLabel: string;
  over: boolean;
  ringPct: number;
  macros: MacroRow[];
  meals: string;
  next: string | null;
  hasTargets: boolean;
}

export function nutritionView(s: WidgetSnapshot): NutritionView {
  const hasTargets = !!s.kcalTarget && s.kcalTarget > 0;
  const left = hasTargets ? (s.kcalTarget as number) - s.kcal : 0;
  const macro = (key: MacroRow['key'], label: string, eaten: number, target: number | null): MacroRow => ({
    key,
    label,
    value: target ? `${Math.round(eaten)} / ${Math.round(target)} g` : `${Math.round(eaten)} g`,
    pct: target ? clamp01(eaten / target) : 0,
  });
  const next = s.nextMeal ? `${s.nextMeal.slot}${s.nextMeal.name ? ` · ${s.nextMeal.name}` : ''}` : null;
  return {
    hero: hasTargets ? n(Math.abs(left)) : n(s.kcal),
    heroLabel: !hasTargets ? 'kcal eaten' : left >= 0 ? 'kcal left' : 'kcal over',
    over: hasTargets && left < 0,
    ringPct: hasTargets ? clamp01(s.kcal / (s.kcalTarget as number)) : 0,
    macros: [macro('protein', 'Protein', s.protein, s.proteinTarget), macro('carbs', 'Carbs', s.carbs, s.carbsTarget), macro('fat', 'Fat', s.fat, s.fatTarget)],
    meals: s.mealsLogged === 1 ? '1 meal logged' : `${s.mealsLogged} meals logged`,
    next,
    hasTargets,
  };
}

export interface WaterView {
  amount: string;
  goal: string;
  pct: number;
  glassesDone: number;
  glassesGoal: number;
  line: string;
  done: boolean;
}

export function waterView(s: WidgetSnapshot): WaterView {
  const glassesGoal = Math.max(1, Math.round(s.waterGoalMl / GLASS_ML));
  const glassesDone = Math.min(glassesGoal, Math.floor(s.waterMl / GLASS_ML));
  const left = s.waterGoalMl - s.waterMl;
  return {
    amount: litres(s.waterMl),
    goal: `${litres(s.waterGoalMl)} L`,
    pct: s.waterGoalMl > 0 ? clamp01(s.waterMl / s.waterGoalMl) : 0,
    glassesDone,
    glassesGoal,
    line: left <= 0 ? 'Goal reached' : `${Math.ceil(left / GLASS_ML)} more ${Math.ceil(left / GLASS_ML) === 1 ? 'glass' : 'glasses'} to go`,
    done: left <= 0,
  };
}

/** Round to what the widgets show, so an unchanged snapshot is not drawn again. */
export function sameSnapshot(a: WidgetSnapshot, b: WidgetSnapshot): boolean {
  const strip = (s: WidgetSnapshot) => {
    const r = (v: number | null) => (v === null ? null : Math.round(v));
    return JSON.stringify({
      ...s,
      updatedAt: 0,
      kcal: r(s.kcal),
      protein: r(s.protein),
      carbs: r(s.carbs),
      fat: r(s.fat),
      workoutPct: r(s.workoutPct),
      nutritionPct: r(s.nutritionPct),
      recoveryPct: r(s.recoveryPct),
      recoveryScore: r(s.recoveryScore),
      dailyPct: r(s.dailyPct),
      steps: r(s.steps),
      waterMl: r(s.waterMl),
    });
  };
  return strip(a) === strip(b);
}

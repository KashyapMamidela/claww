// Polish step 2: the two onboarding questions, goal first, then how you train. Pure, so the mappings are tested.

import type { Equipment, Goal } from './data';
import { GOAL_COLORS, STYLE_COLORS } from './theme';
import { distributeStyleDays } from './engine';

export type GoalChoice = 'fat' | 'gain' | 'muscle' | 'strong' | 'fit';

export interface GoalOption {
  id: GoalChoice;
  title: string;
  line: string;
  note: string;
  color: string;
  icon: string;
  /** The profile goal this maps to (the existing four). */
  goal: Goal;
}

export const GOAL_OPTIONS: GoalOption[] = [
  { id: 'fat', title: 'Lose fat', line: 'Get leaner, keep your strength', note: 'lean and strong, no crash diets', color: GOAL_COLORS.fat, icon: 'flame', goal: 'fat_loss' },
  { id: 'gain', title: 'Gain weight', line: 'Eat enough and grow', note: 'we make sure you eat enough', color: GOAL_COLORS.gain, icon: 'trending-up', goal: 'muscle_gain' },
  { id: 'muscle', title: 'Build muscle', line: 'Look bigger and fuller', note: 'slow and steady builds it', color: GOAL_COLORS.muscle, icon: 'dumbbell', goal: 'muscle_gain' },
  { id: 'strong', title: 'Get stronger', line: 'Lift heavier, week by week', note: 'numbers that go up every week', color: GOAL_COLORS.strong, icon: 'trophy', goal: 'strength' },
  { id: 'fit', title: 'Stay fit and healthy', line: 'Feel good, sleep well, keep moving', note: 'a little every day adds up', color: GOAL_COLORS.fit, icon: 'heart', goal: 'maintenance' },
];

export const goalOption = (id: string | null | undefined): GoalOption | null => GOAL_OPTIONS.find((g) => g.id === id) ?? null;

/** Gain weight eats a larger surplus than Build muscle; both are the muscle_gain goal underneath. */
export const isGainWeight = (id: string | null | undefined) => id === 'gain';

/** Back from the stored profile goal to a choice when the app has no saved choice (older accounts). */
export function choiceFromGoal(goal: string | null | undefined): GoalChoice {
  return goal === 'fat_loss' ? 'fat' : goal === 'strength' ? 'strong' : goal === 'maintenance' ? 'fit' : 'muscle';
}

export type TrainStyle = 'gym' | 'calisthenics' | 'home' | 'yoga' | 'mobility';

export interface StyleOption {
  id: TrainStyle;
  title: string;
  line: string;
  color: string;
  icon: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'gym', title: 'Gym', line: 'Machines and free weights', color: STYLE_COLORS.gym, icon: 'dumbbell' },
  { id: 'calisthenics', title: 'Calisthenics', line: 'Pull-ups, dips, bodyweight', color: STYLE_COLORS.calisthenics, icon: 'activity' },
  { id: 'home', title: 'Home workout', line: 'A mat, maybe dumbbells', color: STYLE_COLORS.home, icon: 'home' },
  { id: 'yoga', title: 'Yoga', line: 'Flows, balance, breathing', color: STYLE_COLORS.yoga, icon: 'sparkles' },
  { id: 'mobility', title: 'Mobility', line: 'Stretch, loosen up, move better', color: STYLE_COLORS.mobility, icon: 'repeat' },
];

export const styleOption = (id: TrainStyle) => STYLE_OPTIONS.find((s) => s.id === id)!;

/** Where the strength sessions happen, from the styles picked: gym wins, then home (dumbbells), else no equipment. */
export function equipmentFromStyles(styles: TrainStyle[]): Equipment {
  if (styles.includes('gym')) return 'gym';
  if (styles.includes('home')) return 'home';
  return 'none';
}

/** Styles in the order they were picked; the first is the main one. Unknown ids are dropped, repeats removed. */
export function cleanStyles(styles: unknown): TrainStyle[] {
  if (!Array.isArray(styles)) return [];
  const out: TrainStyle[] = [];
  for (const s of styles) if (STYLE_OPTIONS.some((o) => o.id === s) && !out.includes(s as TrainStyle)) out.push(s as TrainStyle);
  return out;
}

export interface WeekPreview {
  text: string;
  note: string;
  /** Monday first: the style on each day, or null for a rest day. */
  days: (TrainStyle | null)[];
}

const lower = (s: TrainStyle) => styleOption(s).title.toLowerCase();

export const MIN_TRAIN_DAYS = 2;
export const MAX_TRAIN_DAYS = 6;

/** Weekday indexes (Monday 0) cleaned: unique, in calendar order, 0 to 6. */
export function cleanWeekdays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  return Array.from(new Set(days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
}

/** Toggles a weekday, keeping between 2 and 6 training days. Returns the same list when the change is not allowed. */
export function toggleWeekday(days: number[], day: number): number[] {
  const has = days.includes(day);
  if (has) return days.length <= MIN_TRAIN_DAYS ? days : days.filter((d) => d !== day);
  return days.length >= MAX_TRAIN_DAYS ? days : [...days, day].sort((a, b) => a - b);
}

/**
 * The live line under the picker. The user's weekdays are filled in order with the styles: one style gets every day;
 * with more, the first style picked (the main one) gets most days and the others share the rest.
 */
export function weekPreview(styles: TrainStyle[], weekdays: number[]): WeekPreview {
  const picked = cleanWeekdays(weekdays);
  const none: (TrainStyle | null)[] = [null, null, null, null, null, null, null];
  if (styles.length === 0 || picked.length === 0) {
    return { text: styles.length === 0 ? 'Pick at least one' : 'Pick the days you can train', note: 'pick what you enjoy, you will keep doing it', days: none };
  }
  const order = distributeStyleDays(styles, picked.length);
  const days = [...none];
  picked.forEach((d, i) => {
    days[d] = order[i] ?? order[order.length - 1];
  });
  const counts = styles
    .map((st) => [st, order.filter((x) => x === st).length] as const)
    .filter(([, n]) => n > 0)
    .map(([st, n]) => `${n} ${n === 1 ? 'day' : 'days'} ${lower(st)}`);
  return {
    text: counts.join(' + '),
    note: styles.length === 1 ? 'one style, done well' : 'the mix keeps you strong and loose',
    days,
  };
}

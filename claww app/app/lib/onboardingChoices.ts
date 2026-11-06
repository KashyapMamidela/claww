// Polish step 2: the two onboarding questions, goal first, then how you train. Pure, so the mappings are tested.

import type { Equipment, Goal } from './data';
import { GOAL_COLORS, STYLE_COLORS } from './theme';

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

/** The live line under the picker: one style gets 4 days; with more, the main style gets 3 and the others fill the rest. */
export function weekPreview(styles: TrainStyle[]): WeekPreview {
  if (styles.length === 0) return { text: 'Pick at least one', note: 'pick what you enjoy, you will keep doing it', days: [null, null, null, null, null, null, null] };
  const [main, ...rest] = styles;
  if (rest.length === 0) return { text: `4 days of ${lower(main)}`, note: 'one style, done well', days: [main, null, main, null, main, main, null] };
  return {
    text: `3 days ${lower(main)}, ${rest.map(lower).join(' and ')} on the others`,
    note: 'the mix keeps you strong and loose',
    days: [main, rest[0], main, null, main, rest[1 % rest.length], null],
  };
}

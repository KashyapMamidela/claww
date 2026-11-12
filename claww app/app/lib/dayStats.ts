// One definition of a day's numbers, so Home's tiles and the Tracker's cards can never disagree for the same day.
// Pure; the screens feed it the same inputs.

export interface BurnedInput {
  /** Active kilocalories from Health Connect for the day, when it is connected; null means "use the estimate". */
  healthConnectKcal: number | null;
  /** Steps counted for the day. */
  steps: number | null;
  /** Calories from logged sessions and activities that day (timed or set by set). */
  loggedKcal: number;
  weightKg: number | null;
}

export type BurnedSource = 'health-connect' | 'estimate' | 'none';

export interface Burned {
  kcal: number | null;
  source: BurnedSource;
}

/** Calories per step, the same 0.0005 x body weight as lib/steps (a rough walking figure). */
export function stepsKcal(steps: number, weightKg: number | null): number {
  return Math.round(steps * (weightKg ?? 70) * 0.0005);
}

/**
 * Burned today. With Health Connect the watch's own active energy is the answer and nothing is added (it already
 * includes the sessions it saw, and adding ours would count them twice). Without it: the walking estimate from steps
 * plus the calories of sessions and activities logged in CLAWW. Nothing at all gives null, not zero.
 */
export function burnedKcal(i: BurnedInput): Burned {
  // Health Connect often reports 0 active kcal when no watch wrote any (a phone alone records steps, not energy).
  // 0 next to thousands of steps reads as broken, so a 0 from it falls back to the estimate below.
  if (i.healthConnectKcal !== null && i.healthConnectKcal > 0) return { kcal: Math.round(i.healthConnectKcal), source: 'health-connect' };
  if (i.steps === null && i.loggedKcal <= 0) return { kcal: null, source: 'none' };
  return { kcal: (i.steps !== null ? stepsKcal(i.steps, i.weightKg) : 0) + Math.round(i.loggedKcal), source: 'estimate' };
}

export function stepsProgress(steps: number | null, goal: number): number {
  if (steps === null || goal <= 0) return 0;
  return Math.min(100, (steps / goal) * 100);
}

/** The line under the Steps card: where the number comes from, said once. */
export function stepsSourceLine(source: 'health-connect' | 'phone' | null): string {
  if (source === 'health-connect') return 'From your watch when you wear it, your phone otherwise';
  if (source === 'phone') return "Counted by your phone's motion sensor.";
  return 'Connect Health Connect to count steps.';
}

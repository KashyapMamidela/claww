// Polish step 5: logging from the notification itself (Android lock screen and shade). Pure: which buttons a reminder
// carries, and what a button press means. The actual writing goes through the offline write queue
// (lib/lockActionRunner.ts), so a press with no signal is saved on the phone and sent later.

export const CATEGORY_MEAL = 'claww-meal';
export const CATEGORY_WATER = 'claww-water';
export const CATEGORY_SLEEP = 'claww-sleep';

export const ACTION_ATE = 'claww-ate';
export const ACTION_ELSE = 'claww-else';
export const ACTION_WATER = 'claww-water-250';
export const ACTION_SLEEP_YES = 'claww-sleep-yes';

export const WATER_ACTION_ML = 250;

export type LockMealSlot = 'breakfast' | 'lunch' | 'dinner';

/** The notification data every action-bearing reminder carries. */
export interface LockData {
  type?: string;
  slot?: LockMealSlot;
  /** ISO times of the guessed night, for the sleep reminder. */
  sleepBed?: string;
  sleepWake?: string;
}

export type LockEffect =
  | { kind: 'meal_as_planned'; slot: LockMealSlot }
  | { kind: 'meal_else'; slot: LockMealSlot }
  | { kind: 'water'; ml: number }
  | { kind: 'sleep'; bedtime: Date; wake: Date; hours: number };

export function categoryFor(routeType: string, hasSleepGuess = false): string | null {
  if (routeType === 'meal') return CATEGORY_MEAL;
  if (routeType === 'water') return CATEGORY_WATER;
  if (routeType === 'sleep' && hasSleepGuess) return CATEGORY_SLEEP;
  return null;
}

/** The buttons of each category. "Something else" opens the app (it needs the sheet); the rest log without opening it. */
export const CATEGORY_ACTIONS: Record<string, { identifier: string; buttonTitle: string; opensApp: boolean }[]> = {
  [CATEGORY_MEAL]: [
    { identifier: ACTION_ATE, buttonTitle: 'Ate it', opensApp: false },
    { identifier: ACTION_ELSE, buttonTitle: 'Something else', opensApp: true },
  ],
  [CATEGORY_WATER]: [{ identifier: ACTION_WATER, buttonTitle: `+${WATER_ACTION_ML} ml`, opensApp: false }],
  [CATEGORY_SLEEP]: [{ identifier: ACTION_SLEEP_YES, buttonTitle: 'Yes', opensApp: false }],
};

const SLOTS: LockMealSlot[] = ['breakfast', 'lunch', 'dinner'];

/** What a button press means for a reminder's data; null for a press that carries nothing to log. */
export function lockEffect(actionId: string, data: LockData | null | undefined): LockEffect | null {
  const d = data ?? {};
  if (actionId === ACTION_ATE || actionId === ACTION_ELSE) {
    if (!d.slot || !SLOTS.includes(d.slot)) return null;
    return actionId === ACTION_ATE ? { kind: 'meal_as_planned', slot: d.slot } : { kind: 'meal_else', slot: d.slot };
  }
  if (actionId === ACTION_WATER) return { kind: 'water', ml: WATER_ACTION_ML };
  if (actionId === ACTION_SLEEP_YES) {
    if (!d.sleepBed || !d.sleepWake) return null;
    const bedtime = new Date(d.sleepBed);
    const wake = new Date(d.sleepWake);
    const hours = (wake.getTime() - bedtime.getTime()) / 3_600_000;
    if (!Number.isFinite(hours) || hours < 2 || hours > 14) return null;
    return { kind: 'sleep', bedtime, wake, hours: Math.round(hours * 10) / 10 };
  }
  return null;
}

export interface SleepGuess {
  bed: Date;
  wake: Date;
  /** "Slept 11:40 pm to 7:10 am?" */
  label: string;
  hours: number;
}

const clock = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};

/**
 * The morning question: the bed and wake times of the last logged night, put on last night and this morning. null when
 * there is no earlier night to copy from, or the copied night would be an implausible length.
 */
export function sleepGuess(lastBed: Date | null, lastWake: Date | null, now: Date): SleepGuess | null {
  if (!lastBed || !lastWake) return null;
  const wake = new Date(now.getFullYear(), now.getMonth(), now.getDate(), lastWake.getHours(), lastWake.getMinutes(), 0, 0);
  const bedDayOffset = lastBed.getHours() * 60 + lastBed.getMinutes() > lastWake.getHours() * 60 + lastWake.getMinutes() ? -1 : 0;
  const bed = new Date(now.getFullYear(), now.getMonth(), now.getDate() + bedDayOffset, lastBed.getHours(), lastBed.getMinutes(), 0, 0);
  const hours = (wake.getTime() - bed.getTime()) / 3_600_000;
  if (hours < 3 || hours > 13) return null;
  return { bed, wake, label: `Slept ${clock(bed)} to ${clock(wake)}?`, hours: Math.round(hours * 10) / 10 };
}

// NG PHASE 12: the "Played a sport or walked a lot?" card on Workouts. An activity is logged with a duration; it
// counts toward calories and recovery like any logged session and never as a missed or completed plan day.
// MET values are rounded figures from the Compendium of Physical Activities (general play, not competition): an
// estimate, shown as one. Pure.

export interface Activity {
  name: string;
  met: number;
}

export const ACTIVITIES: Activity[] = [
  { name: 'Cricket', met: 4.8 },
  { name: 'Football', met: 7 },
  { name: 'Badminton', met: 4.5 },
  { name: 'Long walk', met: 3.8 },
  { name: 'Yoga', met: 2.5 },
];

export const OTHER_ACTIVITY_MET = 4;

export const DEFAULT_ACTIVITY_MINUTES = 45;
export const ACTIVITY_MINUTES_STEP = 15;
export const ACTIVITY_MINUTES_MIN = 15;
export const ACTIVITY_MINUTES_MAX = 240;

export function activityMet(name: string): number | null {
  const hit = ACTIVITIES.find((a) => a.name.toLowerCase() === name.trim().toLowerCase());
  return hit ? hit.met : null;
}

/** Calories for a logged duration: MET x body weight (kg) x hours. */
export function activityKcal(met: number, minutes: number, weightKg: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

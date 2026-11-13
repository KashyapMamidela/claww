// NG PHASE 12: activities. An activity is a sport or a walk, logged live (a timer, started from the Activity card, Quick
// log or the Steps widget) or after the fact with a duration. It counts toward calories and recovery like any logged
// session and never as a missed or completed plan day.
// MET values are rounded figures from the Compendium of Physical Activities (general play, not competition): an
// estimate, shown as one. Pure.

export interface Activity {
  name: string;
  met: number;
  /** An Icon name, or one of the drawn logos in components/activity/ActivityLogo ('cricket', 'football', 'badminton'). */
  icon: string;
  /** A short line for the live player. */
  line: string;
}

export const ACTIVITIES: Activity[] = [
  { name: 'Cricket', met: 4.8, icon: 'cricket', line: 'Bat, bowl, repeat' },
  { name: 'Football', met: 7, icon: 'football', line: 'Keep moving' },
  { name: 'Badminton', met: 4.5, icon: 'badminton', line: 'Quick feet' },
  { name: 'Run', met: 8.3, icon: 'wind', line: 'Find your pace' },
  { name: 'Cycling', met: 6.8, icon: 'bike', line: 'Steady legs' },
  { name: 'Swimming', met: 6, icon: 'waves-ladder', line: 'Long, easy strokes' },
  { name: 'Long walk', met: 3.8, icon: 'footprints', line: 'One step at a time' },
  { name: 'Hiking', met: 6, icon: 'mountain', line: 'Up and over' },
  { name: 'Yoga', met: 2.5, icon: 'flower-2', line: 'Slow breath' },
];

export const OTHER_ACTIVITY_MET = 4;
export const OTHER_ACTIVITY_ICON = 'activity';

export const DEFAULT_ACTIVITY_MINUTES = 45;
export const ACTIVITY_MINUTES_STEP = 15;
export const ACTIVITY_MINUTES_MIN = 15;
export const ACTIVITY_MINUTES_MAX = 240;

function find(name: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.name.toLowerCase() === name.trim().toLowerCase());
}

export function activityMet(name: string): number | null {
  return find(name)?.met ?? null;
}

/** The logo's name for an activity; any name that isn't in the list (an "Other") gets the generic activity mark. */
export function activityIcon(name: string): string {
  return find(name)?.icon ?? OTHER_ACTIVITY_ICON;
}

export function activityLine(name: string): string {
  return find(name)?.line ?? 'Keep it going';
}

/** Calories for a logged duration: MET x body weight (kg) x hours. */
export function activityKcal(met: number, minutes: number, weightKg: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

/** Calories so far for a live activity, from the seconds it has run. */
export function liveActivityKcal(name: string, seconds: number, weightKg: number | null): number {
  const kg = weightKg && weightKg > 0 ? weightKg : 70;
  return activityKcal(activityMet(name) ?? OTHER_ACTIVITY_MET, seconds / 60, kg);
}

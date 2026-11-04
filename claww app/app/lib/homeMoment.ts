// NG PHASE 12: which hero Home shows. Morning: today's session with Start. Evening: the next meal with Log it
// (green hero). A session still waiting around its usual time keeps the session hero even in the evening. Pure.

export type HeroKind = 'session' | 'meal' | 'none';

export interface HeroInput {
  /** Local hour, 0 to 23, and minute. */
  hour: number;
  minute: number;
  sessionPlanned: boolean;
  sessionDone: boolean;
  /** Is there a meal left to log today? */
  mealLeft: boolean;
  /** Usual training time as minutes after midnight, when the user set one. */
  usualMinutes: number | null;
}

export const EVENING_FROM_HOUR = 17;
/** A session within this long before its usual time stays the hero in the evening, and for 3 hours after it. */
export const SESSION_WINDOW_MIN = 120;
export const SESSION_LATE_MIN = 180;

export function heroFor(i: HeroInput): HeroKind {
  const sessionWaiting = i.sessionPlanned && !i.sessionDone;
  const now = i.hour * 60 + i.minute;
  const evening = i.hour >= EVENING_FROM_HOUR;
  if (!evening) {
    if (sessionWaiting) return 'session';
    return i.mealLeft ? 'meal' : 'none';
  }
  if (sessionWaiting && i.usualMinutes !== null && now >= i.usualMinutes - SESSION_WINDOW_MIN && now <= i.usualMinutes + SESSION_LATE_MIN) return 'session';
  if (i.mealLeft) return 'meal';
  return sessionWaiting ? 'session' : 'none';
}

export function usualMinutesOf(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** "TODAY · 7:40 AM" */
export function clockLabel(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

export type MealName = 'Breakfast' | 'Lunch' | 'Dinner';

/**
 * The meal Home offers to log: the one for this time of day if it is not logged yet, else the next unlogged one
 * after it. Breakfast until 11:00, lunch until 16:00, dinner after. null when dinner is logged or nothing is left.
 */
export function nextMealFor(loggedTypes: string[], hour: number): MealName | null {
  const logged = new Set(loggedTypes.map((t) => t.toLowerCase()));
  const order: MealName[] = ['Breakfast', 'Lunch', 'Dinner'];
  const current = hour < 11 ? 0 : hour < 16 ? 1 : 2;
  for (let i = current; i < order.length; i++) if (!logged.has(order[i].toLowerCase())) return order[i];
  return null;
}

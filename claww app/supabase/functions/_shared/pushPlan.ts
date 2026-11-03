// Server push decisions for the send-reminders Edge Function (V2 PHASE 3.4).
// Dependency-free so Vitest can test it, like planning.ts and recovery.ts.
//
// The reminder settings shape and defaults are duplicated from
// app/lib/reminderPlan.ts — Deno Edge Functions and the RN bundle can't
// share an import (same reason as EQUIPMENT_TIERS and GENERATION_CAPS), so
// keep the two in sync by hand.

export type ReminderKind = 'workout' | 'meals' | 'sleep' | 'water';

export interface ReminderSetting {
  enabled: boolean;
  hour: number;
  minute: number;
}

export type ReminderSettings = Record<ReminderKind, ReminderSetting>;

const KINDS: ReminderKind[] = ['workout', 'meals', 'sleep', 'water'];

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  workout: { enabled: true, hour: 18, minute: 0 },
  meals: { enabled: true, hour: 13, minute: 30 },
  sleep: { enabled: true, hour: 8, minute: 30 },
  water: { enabled: false, hour: 16, minute: 0 },
};

export const MAX_NOTIFICATIONS_PER_DAY = 2;
/** Local hour the missed-workout nudge goes out. */
export const MORNING_HOUR = 9;
/** Local hour the streak nudge goes out. */
export const EVENING_HOUR = 20;

export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  const out = { ...DEFAULT_REMINDER_SETTINGS };
  if (!raw || typeof raw !== 'object') return out;
  for (const kind of KINDS) {
    const r = (raw as Record<string, Partial<ReminderSetting> | undefined>)[kind];
    if (!r) continue;
    const hour = Number.isInteger(r.hour) && (r.hour as number) >= 0 && (r.hour as number) <= 23 ? (r.hour as number) : out[kind].hour;
    const minute = Number.isInteger(r.minute) && (r.minute as number) >= 0 && (r.minute as number) <= 59 ? (r.minute as number) : out[kind].minute;
    out[kind] = { enabled: typeof r.enabled === 'boolean' ? r.enabled : out[kind].enabled, hour, minute };
  }
  return out;
}

/** The user's local wall-clock parts for an instant, from an IANA zone (falls back to UTC on a bad zone). */
export function localParts(timezone: string | null | undefined, now: Date): { date: string; hour: number; minutes: number } {
  const zone = timezone || 'UTC';
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour) % 24;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour, minutes: hour * 60 + Number(parts.minute) };
}

/** The UTC instant of local midnight for the day `dayOffset` days from today in `timezone` (0 = today, -1 = yesterday). */
export function localDayStartUtc(timezone: string | null | undefined, now: Date, dayOffset = 0): Date {
  const { date, minutes } = localParts(timezone, now);
  const [y, m, d] = date.split('-').map(Number);
  const nowMinuteUtc = Math.floor(now.getTime() / 60000) * 60000;
  const localAsUtc = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const offsetMs = localAsUtc - nowMinuteUtc; // local time minus UTC
  return new Date(Date.UTC(y, m - 1, d + dayOffset) - offsetMs);
}

/** "YYYY-MM-DD" minus `days`. */
export function previousDate(date: string, days = 1): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - days));
  return t.toISOString().slice(0, 10);
}

/** Consecutive active local days ending yesterday (today doesn't count yet — that's what the nudge is for). */
export function streakThroughYesterday(activeDates: Set<string>, today: string): number {
  let streak = 0;
  let cursor = previousDate(today);
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = previousDate(cursor);
  }
  return streak;
}

function mealForHour(hour: number): 'Breakfast' | 'Lunch' | 'Dinner' {
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  return 'Dinner';
}

/** Today's activity, as minutes since local midnight (null = didn't happen today). */
export interface TodayTimes {
  /** Earliest completed/skipped session event today. */
  sessionEventAt: number | null;
  /** Earliest log today per meal type. */
  mealLoggedAt: Partial<Record<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', number>>;
  /** Earliest sleep log today. */
  sleepLoggedAt: number | null;
  /** When today's water first reached the target. */
  waterTargetReachedAt: number | null;
}

/**
 * How many local reminders the phone has shown (or will show) today, under
 * app/lib/reminderPlan.ts's rules: an enabled reminder fires unless the thing
 * it's about was already done before its time. Capped like the app's plan.
 */
export function localRemindersToday(settings: ReminderSettings, times: TodayTimes): number {
  let count = 0;
  for (const kind of KINDS) {
    const s = settings[kind];
    if (!s.enabled) continue;
    const at = s.hour * 60 + s.minute;
    const doneBefore = (t: number | null | undefined) => t !== null && t !== undefined && t < at;
    if (kind === 'workout' && doneBefore(times.sessionEventAt)) continue;
    if (kind === 'meals' && doneBefore(times.mealLoggedAt[mealForHour(s.hour)])) continue;
    if (kind === 'sleep' && doneBefore(times.sleepLoggedAt)) continue;
    if (kind === 'water' && doneBefore(times.waterTargetReachedAt)) continue;
    count += 1;
  }
  return Math.min(MAX_NOTIFICATIONS_PER_DAY, count);
}

export type PushKind = 'missed_workout' | 'streak';

export interface PushUserState {
  notificationsEnabled: boolean;
  settings: ReminderSettings;
  localHour: number;
  hasPlan: boolean;
  /** Any set logged or session completed yesterday (local). */
  trainedYesterday: boolean;
  /** The user tapped Skip on a plan day yesterday — a choice, not a miss. */
  skippedYesterday: boolean;
  /** Any training in the 7 days before yesterday — only engaged users get nudged. */
  trainedInPriorWeek: boolean;
  /** Activity streak ending yesterday (same rule as getActivityStreak). */
  streakThroughYesterday: number;
  /** Any sleep, meal or set logged today. */
  loggedAnythingToday: boolean;
  localRemindersToday: number;
  /** Push kinds already sent today. */
  sentToday: PushKind[];
}

export interface PushMessage {
  kind: PushKind;
  title: string;
  body: string;
  routeType: 'workout' | 'sleep';
}

/**
 * The (at most one) push to send this user right now. Only at the morning
 * or evening hour, only if the matching switch allows it, never the same
 * kind twice a day, and never past the 2-a-day cap counting local reminders.
 */
export function decidePush(u: PushUserState): PushMessage | null {
  if (!u.notificationsEnabled) return null;
  if (u.localRemindersToday + u.sentToday.length >= MAX_NOTIFICATIONS_PER_DAY) return null;

  if (u.localHour === MORNING_HOUR) {
    if (!u.settings.workout.enabled || u.sentToday.includes('missed_workout')) return null;
    if (!u.hasPlan || u.trainedYesterday || u.skippedYesterday || !u.trainedInPriorWeek) return null;
    return {
      kind: 'missed_workout',
      title: 'Missed yesterday?',
      body: "No problem. Today's session is ready whenever you are.",
      routeType: 'workout',
    };
  }

  if (u.localHour === EVENING_HOUR) {
    const anyOn = KINDS.some((k) => u.settings[k].enabled);
    if (!anyOn || u.sentToday.includes('streak')) return null;
    if (u.streakThroughYesterday < 2 || u.loggedAnythingToday) return null;
    return {
      kind: 'streak',
      title: `Your ${u.streakThroughYesterday}-day streak ends tonight`,
      body: 'Log a meal, water or a set to keep it going.',
      routeType: 'sleep',
    };
  }

  return null;
}

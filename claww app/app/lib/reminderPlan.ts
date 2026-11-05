import { NIGHT_CLOSE_FROM, nightCloseText } from './dayMoments';

// Smart local reminders (V2 PHASE 3.3). Pure: given the user's reminder
// settings, today's state and "now", decide exactly which notifications to
// schedule. lib/reminderSync.ts gathers the state and schedules the result.

export type ReminderKind = 'workout' | 'meals' | 'sleep' | 'water';

export interface ReminderSetting {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export type ReminderSettings = Record<ReminderKind, ReminderSetting>;

export const REMINDER_KINDS: ReminderKind[] = ['workout', 'meals', 'sleep', 'water'];

/** Highest priority first — what survives the daily cap. */
const PRIORITY: ReminderKind[] = ['workout', 'meals', 'sleep', 'water'];

export const MAX_REMINDERS_PER_DAY = 2;
export const WEEK_REVIEW_HOUR = 18;
const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;
export const REMINDER_DAYS_AHEAD = 7;
export const REMINDER_ID_PREFIX = 'claww-r-';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  workout: { enabled: true, hour: 18, minute: 0 },
  // The meals reminder is the morning one (breakfast time) since NG PHASE 10; the evening one is the night close.
  meals: { enabled: true, hour: 8, minute: 30 },
  sleep: { enabled: true, hour: 8, minute: 30 },
  water: { enabled: false, hour: 16, minute: 0 },
};

/** Fills gaps in a stored (possibly partial or older) settings object with the defaults. */
export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  const out = { ...DEFAULT_REMINDER_SETTINGS };
  if (!raw || typeof raw !== 'object') return out;
  for (const kind of REMINDER_KINDS) {
    const r = (raw as Record<string, Partial<ReminderSetting> | undefined>)[kind];
    if (!r) continue;
    const hour = Number.isInteger(r.hour) && (r.hour as number) >= 0 && (r.hour as number) <= 23 ? (r.hour as number) : out[kind].hour;
    const minute = Number.isInteger(r.minute) && (r.minute as number) >= 0 && (r.minute as number) <= 59 ? (r.minute as number) : out[kind].minute;
    out[kind] = { enabled: typeof r.enabled === 'boolean' ? r.enabled : out[kind].enabled, hour, minute };
  }
  return out;
}

export interface TodayState {
  /** Any plan day completed or skipped today (local); cancels today's workout reminder. */
  sessionDoneOrSkippedToday: boolean;
  /** Weekdays the plan trains on (Monday 0 ... Sunday 6), or null for a "Day 1, Day 2" plan, where the workout reminder runs every day. */
  trainingWeekdays?: number[] | null;
  /** Session focus by weekday (Monday 0), so later days can name their session too. */
  focusByWeekday?: Record<number, string>;
  /** Focus of today's suggested plan day, e.g. "Push", or null without a plan. */
  todaysSession: string | null;
  loggedMealTypes: string[];
  sleepLoggedToday: boolean;
  waterMlToday: number;
  waterTargetMl: number;
  /** Meals with no answer today (not logged, not skipped); drives the 21:30 night close. Omitted means unknown: no night close. */
  unansweredMeals?: number;
  /** Schedule the Sunday 18:00 weekly review reminder (default true); it follows the workout reminder's switch. */
  weekReview?: boolean;
}

export interface PlannedReminder {
  id: string;
  kind: ReminderKind;
  /** Notification tap routing type (see REMINDER_ROUTES in app/_layout.tsx). */
  routeType: 'workout' | 'meal' | 'sleep' | 'water' | 'catchup' | 'review';
  date: Date;
  title: string;
  body: string;
}

/** Which meal a meal reminder at this hour is about. */
export function mealForHour(hour: number): 'Breakfast' | 'Lunch' | 'Dinner' {
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  return 'Dinner';
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatLitres(ml: number): string {
  return `${Math.round(ml / 100) / 10} L`;
}

/**
 * Today plus the next days, at most MAX_REMINDERS_PER_DAY per day by
 * priority. Today's reminders reflect today's state and are dropped once
 * their time has passed; later days get generic wording.
 */
export function planReminders(settings: ReminderSettings, today: TodayState, now: Date, days = REMINDER_DAYS_AHEAD): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (let offset = 0; offset < days; offset++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const isToday = offset === 0;
    const candidates: PlannedReminder[] = [];

    // NG PHASE 10: one "close your day" notification at 21:30 when meals are unanswered, kept ahead of the others by the cap.
    if (isToday && today.unansweredMeals) {
      const text = nightCloseText(today.unansweredMeals);
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(NIGHT_CLOSE_FROM / 60), NIGHT_CLOSE_FROM % 60, 0, 0);
      if (text && at.getTime() > now.getTime()) candidates.push({ id: `${REMINDER_ID_PREFIX}close-${dayKey(at)}`, kind: 'meals', routeType: 'catchup', date: at, ...text });
    }

    for (const kind of PRIORITY) {
      const s = settings[kind];
      if (!s.enabled) continue;
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), s.hour, s.minute, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      const id = `${REMINDER_ID_PREFIX}${kind}-${dayKey(date)}`;

      if (kind === 'workout' && weekdayOf(base) === 6 && today.weekReview !== false) {
        // NG PHASE 11.5: Sunday 18:00, "Your week, marked up". It counts toward the same daily cap.
        const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), WEEK_REVIEW_HOUR, 0, 0, 0);
        if (at.getTime() > now.getTime()) candidates.push({ id: `${REMINDER_ID_PREFIX}review-${dayKey(at)}`, kind: 'workout', routeType: 'review', date: at, title: 'Your week, marked up', body: 'See what changed on your plan this week and keep or undo each mark.' });
      }

      if (kind === 'workout') {
        const weekday = (base.getDay() + 6) % 7;
        if (today.trainingWeekdays && !today.trainingWeekdays.includes(weekday)) continue;
        if (isToday && today.sessionDoneOrSkippedToday) continue;
        const session = isToday ? today.todaysSession : today.focusByWeekday?.[weekday] ?? null;
        candidates.push({
          id,
          kind,
          routeType: 'workout',
          date,
          title: session ? `${session} day` : 'Time to train',
          body: session ? `Today's session: ${session}. Even a short one keeps the streak going.` : 'Your next session is ready.',
        });
      } else if (kind === 'meals') {
        const meal = mealForHour(s.hour);
        if (isToday && today.loggedMealTypes.includes(meal)) continue;
        candidates.push({ id, kind, routeType: 'meal', date, title: `${meal} not logged yet`, body: 'Log it in a few seconds to keep your targets honest.' });
      } else if (kind === 'sleep') {
        if (isToday && today.sleepLoggedToday) continue;
        candidates.push({ id, kind, routeType: 'sleep', date, title: 'How did you sleep?', body: "Log last night's sleep to unlock today's recovery score." });
      } else if (kind === 'water') {
        if (isToday && today.waterMlToday >= today.waterTargetMl) continue;
        candidates.push({
          id,
          kind,
          routeType: 'water',
          date,
          title: 'Time for water',
          body: isToday ? `${formatLitres(today.waterMlToday)} of ${formatLitres(today.waterTargetMl)} so far today.` : 'A glass now keeps you on track.',
        });
      }
    }

    out.push(...candidates.slice(0, MAX_REMINDERS_PER_DAY).sort((a, b) => a.date.getTime() - b.date.getTime()));
  }
  return out;
}

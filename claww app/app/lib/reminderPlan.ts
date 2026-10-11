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
export const REMINDER_DAYS_AHEAD = 7;
export const REMINDER_ID_PREFIX = 'claww-r-';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  workout: { enabled: true, hour: 18, minute: 0 },
  meals: { enabled: true, hour: 13, minute: 30 },
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
  /** Any plan day completed or skipped today (local). Until real weekdays exist (V2 PHASE 6) the workout reminder runs every day and this cancels today's. */
  sessionDoneOrSkippedToday: boolean;
  /** Focus of today's suggested plan day, e.g. "Push", or null without a plan. */
  todaysSession: string | null;
  loggedMealTypes: string[];
  sleepLoggedToday: boolean;
  waterMlToday: number;
  waterTargetMl: number;
}

export interface PlannedReminder {
  id: string;
  kind: ReminderKind;
  /** Notification tap routing type (see REMINDER_ROUTES in app/_layout.tsx). */
  routeType: 'workout' | 'meal' | 'sleep' | 'water';
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

    for (const kind of PRIORITY) {
      const s = settings[kind];
      if (!s.enabled) continue;
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), s.hour, s.minute, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      const id = `${REMINDER_ID_PREFIX}${kind}-${dayKey(date)}`;

      if (kind === 'workout') {
        if (isToday && today.sessionDoneOrSkippedToday) continue;
        const session = isToday ? today.todaysSession : null;
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

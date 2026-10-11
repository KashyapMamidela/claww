import {
  getLatestWorkout,
  getProfile,
  getSuggestedDayIndex,
  getTodaysMealLogs,
  getTodaysSleepLog,
  getTodaysWaterMl,
  getWorkoutDayEvents,
} from './data';
import { cancelAllReminders, ensureNotificationChannels, hasNotificationPermission, notificationsSupported, scheduleReminderPlan } from './notifications';
import { normalizeReminderSettings, planReminders, type TodayState } from './reminderPlan';
import { registerPushToken } from './pushTokens';

/** Matches WaterWidget's target. */
const WATER_TARGET_ML = 2000;

let running: Promise<void> | null = null;
let again = false;

async function buildTodayState(userId: string): Promise<TodayState> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [workout, meals, sleep, waterMl] = await Promise.all([
    getLatestWorkout(userId),
    getTodaysMealLogs(userId),
    getTodaysSleepLog(userId),
    getTodaysWaterMl(userId),
  ]);
  let todaysSession: string | null = null;
  let sessionDoneOrSkippedToday = false;
  if (workout) {
    const events = await getWorkoutDayEvents(userId, workout.id);
    todaysSession = workout.plan.days[getSuggestedDayIndex(workout.plan, events)]?.focus ?? null;
    sessionDoneOrSkippedToday = events.some((e) => new Date(e.createdAt).getTime() >= startOfToday.getTime());
  }
  return {
    sessionDoneOrSkippedToday,
    todaysSession,
    loggedMealTypes: meals.map((m) => m.meal_type).filter((t): t is NonNullable<typeof t> => !!t),
    sleepLoggedToday: !!sleep,
    waterMlToday: waterMl,
    waterTargetMl: WATER_TARGET_ML,
  };
}

async function run(userId: string): Promise<void> {
  await ensureNotificationChannels();
  const profile = await getProfile(userId);
  if (!profile?.notifications_enabled || !(await hasNotificationPermission())) {
    await cancelAllReminders();
    return;
  }
  const settings = normalizeReminderSettings(profile.personalization_profile?.reminders);
  const today = await buildTodayState(userId);
  await scheduleReminderPlan(planReminders(settings, today, new Date()));
  // Same moment is right for server push: permission granted, reminders on.
  await registerPushToken(userId);
}

/**
 * The one entry point for (re)scheduling a user's local reminders (V2 PHASE
 * 3.1/3.3). Called on every signed-in app start, after anything that
 * changes what they should say (a meal, sleep, water, a session completed
 * or skipped) and when reminder settings change. Safe to call any number of
 * times: overlapping calls coalesce into one extra run.
 */
export function refreshReminders(userId: string): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await run(userId);
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

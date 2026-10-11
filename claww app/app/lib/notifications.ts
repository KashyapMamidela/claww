import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { REMINDER_ID_PREFIX, type PlannedReminder } from './reminderPlan';

// Local reminders. Since V2 PHASE 3.3 they're "smart": lib/reminderPlan.ts
// decides what to schedule from the user's per-type settings and today's
// state (only training days' workout, only unlogged meals, at most 2 a day),
// and lib/reminderSync.ts rebuilds the schedule on every app start and after
// every log. This file is the thin expo-notifications layer underneath.
// Server push (things the phone can't know) is lib/pushTokens.ts + the
// send-reminders Edge Function (V2 PHASE 3.4).

/** Tap routing types — see REMINDER_ROUTES in app/_layout.tsx. */
export type ReminderType = 'workout' | 'sleep' | 'meal' | 'water';

/** The fixed daily repeats scheduled by builds before V2 PHASE 3.3 — still cancelled so updated users don't get duplicates. */
const LEGACY_REMINDER_IDS = ['claww-reminder-workout', 'claww-reminder-sleep', 'claww-reminder-meal'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const REMINDER_CHANNEL_ID = 'reminders';

let channelsReady: Promise<void> | null = null;

/**
 * V2 PHASE 3.1 — Android shows no permission prompt and no notification at
 * all without a channel, and on Android 13+ the POST_NOTIFICATIONS prompt
 * only appears once a channel exists. Nothing created one before, which is
 * the most likely reason reminders never arrived. Idempotent.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelsReady) {
    channelsReady = Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Reminders',
      description: 'Training, meal, sleep and water reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
      .then(() => undefined)
      .catch(() => {
        channelsReady = null;
      });
  }
  return channelsReady;
}

/**
 * Requests OS notification permission. On Android 13+ this is the real
 * runtime POST_NOTIFICATIONS prompt (handled by the expo-notifications
 * config plugin — see app.json); a prior denial resolves 'denied' rather
 * than re-prompting, which callers must handle gracefully, not by nagging.
 * The channel is created first, or Android shows no prompt at all.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationChannels();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied' && !existing.canAskAgain) return false;

  const result = await Notifications.requestPermissionsAsync();
  return result.status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const existing = await Notifications.getPermissionsAsync();
  return existing.status === 'granted';
}

/** Dev/preview-build tool: fires a test reminder `minutes` from now, for the manual test in the V2 PHASE 3 PR. */
export async function scheduleTestReminder(minutes = 2): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: 'claww-reminder-test',
    content: { title: 'CLAWW test reminder', body: `Scheduled ${minutes} minutes ago. If you can read this, reminders work.`, data: { type: 'workout' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: REMINDER_CHANNEL_ID },
  });
  return true;
}

/** Cancels every reminder this app scheduled (current and legacy), leaving other notifications (e.g. the rest timer) alone. */
export async function cancelAllReminders(): Promise<void> {
  if (!notificationsSupported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const ids = new Set<string>(LEGACY_REMINDER_IDS);
  for (const n of scheduled) {
    if (n.identifier.startsWith(REMINDER_ID_PREFIX)) ids.add(n.identifier);
  }
  await Promise.all([...ids].map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/** Replaces the whole reminder schedule with `plan` (one-off date triggers). */
export async function scheduleReminderPlan(plan: PlannedReminder[]): Promise<void> {
  if (!notificationsSupported) return;
  await ensureNotificationChannels();
  await cancelAllReminders();
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { type: r.routeType } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: REMINDER_CHANNEL_ID },
    });
  }
}

/** Web has no local notification scheduling — every call here is a deliberate no-op there, not a silent failure. */
export const notificationsSupported = Platform.OS !== 'web';

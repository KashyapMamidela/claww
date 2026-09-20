import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// SHIP PHASE 8.3 — three real, local, scheduled reminders, requested
// contextually (never on cold start — see the soft-ask card on
// workout-complete.tsx, shown once after a user's first completed
// workout). These are local notifications, not server-triggered push: CLAWW
// has no backend infra to send push at arbitrary events yet (that's a much
// bigger project — token storage, a trigger source). What's real here is the
// permission flow, the scheduling, and tap-to-deep-link, not "live" pushes.
//
// Times are fixed defaults, not derived from a real per-user training
// schedule — the app doesn't model specific training weekdays today (only a
// days-per-week count), so "remind me on my actual training days" isn't
// buildable without that model existing first. A daily reminder is the
// honest scope for what's actually here.

export type ReminderType = 'workout' | 'sleep' | 'meal';

const REMINDER_IDENTIFIERS: Record<ReminderType, string> = {
  workout: 'claww-reminder-workout',
  sleep: 'claww-reminder-sleep',
  meal: 'claww-reminder-meal',
};

const REMINDERS: { type: ReminderType; hour: number; minute: number; title: string; body: string }[] = [
  { type: 'workout', hour: 18, minute: 0, title: 'Time to train', body: "Your plan's waiting — even a short session keeps the streak alive." },
  { type: 'meal', hour: 13, minute: 0, title: 'Log lunch', body: 'A quick log now keeps your nutrition targets honest.' },
  { type: 'sleep', hour: 22, minute: 0, title: "How'd today go?", body: 'Log tonight\'s sleep to unlock tomorrow\'s recovery score.' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests OS notification permission. On Android 13+ this is the real
 * runtime POST_NOTIFICATIONS prompt (handled by the expo-notifications
 * config plugin — see app.json); a prior denial resolves 'denied' rather
 * than re-prompting, which callers must handle gracefully, not by nagging.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied' && !existing.canAskAgain) return false;

  const result = await Notifications.requestPermissionsAsync();
  return result.status === 'granted';
}

/** Schedules all three default reminders. Cancels any existing ones first so this is safe to call repeatedly (e.g. re-enabling from Settings). */
export async function scheduleDefaultReminders(): Promise<void> {
  await cancelAllReminders();
  for (const r of REMINDERS) {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIERS[r.type],
      content: { title: r.title, body: r.body, data: { type: r.type } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: r.hour,
        minute: r.minute,
        repeats: true,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Promise.all(Object.values(REMINDER_IDENTIFIERS).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/** Web has no local notification scheduling — every call here is a deliberate no-op there, not a silent failure. */
export const notificationsSupported = Platform.OS !== 'web';

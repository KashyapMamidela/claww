import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { restAlertAction } from './restAlertPlan';

const REST_NOTIFICATION_ID = 'claww-rest-end';
const REST_CHANNEL_ID = 'rest-timer';

let channelReady: Promise<void> | null = null;

/** Android needs a channel with high importance for the alert to buzz and peek on the lock screen. */
function ensureRestChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
      .then(() => undefined)
      .catch(() => {
        channelReady = null;
      });
  }
  return channelReady;
}

async function scheduleRestEnd(endsAt: number, nextLabel: string | null): Promise<void> {
  // Never prompts here — permission is asked elsewhere (V2 PHASE 3). Without it, this is a no-op.
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return;
  await ensureRestChannel();
  await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REST_NOTIFICATION_ID,
    content: {
      title: 'Rest is over',
      body: nextLabel ? `Next: ${nextLabel}` : 'Time for your next set.',
      data: { type: 'rest' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt), channelId: REST_CHANNEL_ID },
  });
}

function cancelRestEnd(): void {
  Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID).catch(() => {});
}

/**
 * Keeps one scheduled "rest is over" notification in sync with the rest
 * timer: scheduled when the app leaves the foreground mid-rest (so the
 * phone buzzes with the screen locked or the app closed), cancelled on
 * return to the foreground, skip, pause, or when the rest ends.
 */
export function useRestEndNotification(resting: boolean, paused: boolean, restEndsAt: number | null, nextLabel: string | null): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const apply = (appState: string) => {
      const action = restAlertAction({ appState, resting, paused, restEndsAt, now: Date.now() });
      if (action === 'schedule' && restEndsAt !== null) scheduleRestEnd(restEndsAt, nextLabel).catch(() => {});
      else cancelRestEnd();
    };
    apply(AppState.currentState);
    const sub = AppState.addEventListener('change', apply);
    return () => {
      sub.remove();
      cancelRestEnd();
    };
  }, [resting, paused, restEndsAt, nextLabel]);
}

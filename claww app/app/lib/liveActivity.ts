import { Platform } from 'react-native';
import { LIVE_ACTIVITY_ENABLED } from './flags';
import type { LockScreenContent } from './lockScreen';

// NG PHASE 3.5: the iOS Live Activity for a running workout (screen 09), through expo-live-activity
// (software-mansion-labs, 0.4.2, released June 2026). NOT device-tested: it needs a real iPhone and an
// Apple Developer account, and the config plugin below. Off by default (LIVE_ACTIVITY_ENABLED).
//
// Limit of the library: a Live Activity here shows a title, a subtitle and a countdown timer. Screen 09's
// tappable -15 s / Skip / Set done buttons need iOS 17 App Intents in a custom Swift widget extension,
// which expo-live-activity does not provide. So on iOS the lock screen shows the session, the set or
// rest, and the countdown, read-only; the buttons stay Android-only until that widget is written.
//
// To turn it on (when an iPhone and an Apple Developer account exist):
//   1. add "expo-live-activity" to the plugins in app.json (it builds the widget extension target),
//   2. put 4 KB-or-smaller images in assets/liveActivity if wanted,
//   3. build for iOS with EAS, set LIVE_ACTIVITY_ENABLED = true in lib/flags.ts.

type Module = typeof import('expo-live-activity');

const COLORS = {
  backgroundColor: '#0B0B0C',
  titleColor: '#FFFFFF',
  subtitleColor: '#A1A1AA',
  progressViewTint: '#3B82F6',
  progressViewLabelColor: '#FFFFFF',
} as const;

let activityId: string | undefined;

function load(): Module | null {
  if (Platform.OS !== 'ios' || !LIVE_ACTIVITY_ENABLED) return null;
  try {
    // Required lazily so the Android and web bundles never touch the iOS-only module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-live-activity') as Module;
  } catch {
    return null;
  }
}

/** Starts the Live Activity, or updates it when one is already running. A no-op unless enabled on iOS. */
export function syncLiveActivity(c: LockScreenContent): void {
  const LiveActivity = load();
  if (!LiveActivity) return;
  const state = {
    title: c.title,
    subtitle: c.text,
    ...(c.chronometerAtMs !== null ? { progressBar: { date: c.chronometerAtMs } } : {}),
  };
  try {
    if (activityId) LiveActivity.updateActivity(activityId, state);
    else {
      const id = LiveActivity.startActivity(state, { ...COLORS, timerType: 'circular', padding: { horizontal: 20, vertical: 16 } });
      activityId = typeof id === 'string' ? id : undefined;
    }
  } catch {
    // a lock-screen extra must never break the workout
  }
}

/** Ends the Live Activity when the session ends. */
export function endLiveActivity(): void {
  const LiveActivity = load();
  if (!LiveActivity || !activityId) return;
  try {
    LiveActivity.stopActivity(activityId, { title: 'Workout finished' });
  } catch {
    // see above
  }
  activityId = undefined;
}

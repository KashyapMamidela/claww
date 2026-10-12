// When the rest-end notification should exist (V2 PHASE 2.4). Pure, so it
// can be tested without expo-notifications.

export interface RestAlertInput {
  /** AppState: 'active' | 'background' | 'inactive' | 'unknown' | 'extension'. */
  appState: string;
  resting: boolean;
  paused: boolean;
  restEndsAt: number | null;
  now: number;
}

/**
 * Schedule only while the app is NOT in the foreground and a running rest
 * still has time left — in the foreground the in-app timer and haptic
 * already cover it. Everything else (foreground, skipped, paused, over, no
 * session) means any scheduled notification should be cancelled.
 */
export function restAlertAction(input: RestAlertInput): 'schedule' | 'cancel' {
  const { appState, resting, paused, restEndsAt, now } = input;
  if (appState === 'active') return 'cancel';
  if (!resting || paused || restEndsAt === null) return 'cancel';
  if (restEndsAt <= now) return 'cancel';
  return 'schedule';
}

import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// NG PHASE 3.5: JavaScript side of the Android ongoing notification (see
// android/.../ClawwSessionNotificationModule.kt). Optional on purpose: on iOS, on web, in
// a build made before this module existed, or if the module fails to load, every call is a no-op.

export type SessionNotificationAction = 'done' | 'skip' | 'minus15';

interface NativeModule {
  show(title: string, text: string, chronometerAtMs: number | null, countDown: boolean, actions: SessionNotificationAction[]): void;
  hide(): void;
  addListener(event: 'onAction', cb: (e: { action: SessionNotificationAction }) => void): { remove(): void };
}

const native: NativeModule | null = Platform.OS === 'android' ? requireOptionalNativeModule<NativeModule>('ClawwSessionNotification') : null;

export const sessionNotificationAvailable = native !== null;

export function showSessionNotification(
  title: string,
  text: string,
  chronometerAtMs: number | null,
  countDown: boolean,
  actions: SessionNotificationAction[]
): void {
  try {
    native?.show(title, text, chronometerAtMs, countDown, actions);
  } catch {
    // a notification is a convenience; never let it break the workout
  }
}

export function hideSessionNotification(): void {
  try {
    native?.hide();
  } catch {
    // see above
  }
}

export function onSessionNotificationAction(cb: (action: SessionNotificationAction) => void): { remove(): void } {
  if (!native) return { remove() {} };
  try {
    return native.addListener('onAction', (e) => cb(e.action));
  } catch {
    return { remove() {} };
  }
}

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { nativeHaptics } from '../modules/claww-haptics';

// NG PHASE 1: the only haptics the app uses (build plan section 5.5). One per user action,
// fired on the same frame as the visual, never as the only feedback.
//   setDone   light impact: a set logged, "Ate as planned", a usual logged
//   success   success notification: a personal record, closing the day
// Everything else stays silent. Failures are ignored: many Android phones have no motor.

export function setDone(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Premium D3: a light selection tick for tab changes, segmented controls and steppers. */
export function tick(): void {
  Haptics.selectionAsync().catch(() => {});
}

/** Premium D3: a warning buzz when something can be undone or is about to be lost. */
export function warning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** A stamp landing (the finish moments): one heavy hit, then a light echo. One per moment. */
export function stamp(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 110);
}

let lastDial = 0;
/**
 * A dial detent, like the camera zoom wheel. What the platforms do (Android's haptics guide, iOS's selection feedback):
 *  - Phones with a real haptic engine (Pixel, iPhone, most flagships): the system's own tick, SEGMENT_TICK on
 *    Android 14+ ("points on a slider"), a selection tick on iOS, firmer on labelled marks.
 *  - Phones with a basic motor (this test phone reports no supported effects, so every system tick plays as a 50 ms
 *    buzz at 12 % strength, which can't be felt): a 12 ms full-strength pulse, 22 ms on labelled marks. Short is the
 *    point: Android's guidance is a 10 to 20 ms click, since a long one rings.
 * Rate-limited so a fast slide is a run of ticks, not a flood.
 */
export function dialTick(major: boolean): void {
  const now = Date.now();
  if (now - lastDial < 24) return;
  lastDial = now;
  if (nativeHaptics) {
    // Our own module picks the best tier this phone has (primitives, tuned effects, or a short pulse).
    try {
      nativeHaptics.play(major ? 'major' : 'tick', 0.5);
      return;
    } catch {
      // fall through to the older path
    }
  }
  if (Platform.OS === 'android') {
    Vibration.vibrate(major ? 22 : 12);
    return;
  }
  if (major) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
}

/** The dial was picked up: one soft beat, like the camera's zoom wheel catching. */
export function dialGrab(): void {
  if (nativeHaptics) {
    try {
      nativeHaptics.play('grab', 0.5);
      return;
    } catch {
      // fall through
    }
  }
  if (Platform.OS === 'android') Vibration.vibrate(8);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

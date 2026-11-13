import * as Haptics from 'expo-haptics';

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

import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

// Real step counting via the phone's own motion coprocessor (iOS Core
// Motion / Android step-counter sensor) — no wearable needed. This is what
// the "Steps · needs phone sensors" placeholder on Home was already built
// for; it just never got wired up. Distinct from SHIP PHASE 11.1 (Health
// Connect / Apple Health, still deferred to post-launch) — that's syncing
// from a wearable's own store, this reads the phone's built-in pedometer
// directly.

export const stepsSupported = Platform.OS !== 'web';

export interface StepsResult {
  steps: number;
  available: boolean;
}

/**
 * Today's step count so far (midnight to now), read directly from the
 * device pedometer. Returns { available: false } rather than throwing when
 * the sensor doesn't exist (web, some emulators, permission denied) — the
 * caller renders the existing "no data yet" empty state in that case,
 * exactly as it already does today.
 */
export async function getTodaySteps(): Promise<StepsResult> {
  if (!stepsSupported) return { steps: 0, available: false };

  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return { steps: 0, available: false };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { steps } = await Pedometer.getStepCountAsync(startOfDay, new Date());
    return { steps, available: true };
  } catch {
    // Permission denied, or the OS-level call failed for any reason — same
    // "nothing to show yet" outcome as genuinely unavailable, not a crash.
    return { steps: 0, available: false };
  }
}

/**
 * Very rough calories-from-steps estimate: ~0.0005 kcal per step per kg of
 * bodyweight, the same order-of-magnitude figure most step-tracking apps
 * use (a 70kg person burns roughly 0.035 kcal/step). Deterministic math,
 * not a claim of precision — same "estimate, not AI" posture as the
 * nutrition formulas in lib/nutrition.ts.
 */
export function estimateCaloriesFromSteps(steps: number, weightKg: number | null): number {
  const weight = weightKg ?? 70; // population-average fallback when no profile weight is set yet
  return Math.round(steps * weight * 0.0005);
}

import { Linking, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as HealthConnect from 'react-native-health-connect';

// Health Connect's own Play Store package — distinct from CLAWW's. Most
// Android versions below 14 don't ship it preinstalled, so "the permission
// prompt never appeared" almost always means this, not a denied
// permission: getSdkStatus() returns SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED,
// there's no provider to request permissions from yet, and the earlier
// version of this file silently gave up right there with no way for the
// user to tell "not installed" apart from "permission denied."
const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

export function openHealthConnectInstall(): void {
  Linking.openURL(`market://details?id=${HEALTH_CONNECT_PACKAGE}`).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`).catch(() => {})
  );
}

// Steps + active-calorie data for Home's "Steps"/"Burned" stats.
//
// iOS: expo-sensors' Pedometer.getStepCountAsync genuinely supports a
// date-range query (Core Motion backs it directly) — this path works as
// originally written, just now also requests permission first instead of
// assuming it's already granted.
//
// Android: expo-sensors' Pedometer CANNOT answer "steps since midnight" at
// all — confirmed directly in its own native source
// (PedometerModule.kt's getStepCountAsync throws
// "Getting step count for date range is not supported on Android yet"
// unconditionally). Sensor.TYPE_STEP_COUNTER only exposes deltas from
// whenever a listener subscribes, with no queryable history, so there is
// no way to reconstruct a real "today" total from it without a
// continuously-running background listener. Health Connect is the correct
// Android mechanism for this (SHIP PHASE 11.1's own vision for it) — used
// here scoped to just Steps + ActiveCaloriesBurned, not the fuller
// sleep-replacement/workout-writing scope, which is a separate decision.

export const stepsSupported = Platform.OS !== 'web';

export interface StepsResult {
  steps: number;
  available: boolean;
  /** Real active-calorie total from Health Connect, when granted — null
   * means "use the weight-based estimate instead," not "burned zero." */
  caloriesBurned: number | null;
  /** Android only: Health Connect itself isn't installed/updated (distinct
   * from "installed but permission denied") — the UI should offer
   * openHealthConnectInstall() rather than just showing "no data yet." */
  needsHealthConnectInstall?: boolean;
}

const UNAVAILABLE: StepsResult = { steps: 0, available: false, caloriesBurned: null };
const NEEDS_INSTALL: StepsResult = { steps: 0, available: false, caloriesBurned: null, needsHealthConnectInstall: true };

let healthConnectReady: boolean | null = null;

async function ensureHealthConnectReady(): Promise<'ready' | 'needs-install' | 'unavailable'> {
  if (healthConnectReady === true) return 'ready';
  try {
    const status = await HealthConnect.getSdkStatus();
    if (status === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return 'needs-install';
    }
    if (status !== HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
      healthConnectReady = false;
      return 'unavailable';
    }
    healthConnectReady = await HealthConnect.initialize();
    return healthConnectReady ? 'ready' : 'unavailable';
  } catch {
    healthConnectReady = false;
    return 'unavailable';
  }
}

async function getStepsAndCaloriesAndroid(): Promise<StepsResult> {
  const readiness = await ensureHealthConnectReady();
  if (readiness === 'needs-install') return NEEDS_INSTALL;
  if (readiness !== 'ready') return UNAVAILABLE;

  try {
    // Idempotent: if both are already granted, this returns immediately
    // with no system prompt. A user can grant one and deny the other —
    // handled independently below, not all-or-nothing.
    const granted = await HealthConnect.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    ]);
    const hasSteps = granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
    if (!hasSteps) return UNAVAILABLE;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: startOfDay.toISOString(),
      endTime: new Date().toISOString(),
    };

    const stepsResult = await HealthConnect.aggregateRecord({ recordType: 'Steps', timeRangeFilter });

    let caloriesBurned: number | null = null;
    const hasCalories = granted.some((p) => 'recordType' in p && p.recordType === 'ActiveCaloriesBurned');
    if (hasCalories) {
      try {
        const calResult = await HealthConnect.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter });
        caloriesBurned = Math.round(calResult.ACTIVE_CALORIES_TOTAL.inKilocalories);
      } catch {
        // Steps still valid even if the calories aggregate call itself fails.
      }
    }

    return { steps: stepsResult.COUNT_TOTAL ?? 0, available: true, caloriesBurned };
  } catch {
    return UNAVAILABLE;
  }
}

async function getStepsIOS(): Promise<StepsResult> {
  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return UNAVAILABLE;

    const permission = await Pedometer.getPermissionsAsync();
    if (!permission.granted) {
      const requested = await Pedometer.requestPermissionsAsync();
      if (!requested.granted) return UNAVAILABLE;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { steps } = await Pedometer.getStepCountAsync(startOfDay, new Date());
    return { steps, available: true, caloriesBurned: null };
  } catch {
    return UNAVAILABLE;
  }
}

/** Today's step count so far (midnight to now) — see module comment for
 * why iOS and Android take genuinely different code paths here. */
export async function getTodaySteps(): Promise<StepsResult> {
  if (!stepsSupported) return UNAVAILABLE;
  if (Platform.OS === 'android') return getStepsAndCaloriesAndroid();
  if (Platform.OS === 'ios') return getStepsIOS();
  return UNAVAILABLE;
}

/**
 * Very rough calories-from-steps estimate: ~0.0005 kcal per step per kg of
 * bodyweight, the same order-of-magnitude figure most step-tracking apps
 * use (a 70kg person burns roughly 0.035 kcal/step). Deterministic math,
 * not a claim of precision — same "estimate, not AI" posture as the
 * nutrition formulas in lib/nutrition.ts. Only used as a fallback when a
 * real caloriesBurned figure isn't available (iOS, or Android without
 * Health Connect permission).
 */
export function estimateCaloriesFromSteps(steps: number, weightKg: number | null): number {
  const weight = weightKg ?? 70; // population-average fallback when no profile weight is set yet
  return Math.round(steps * weight * 0.0005);
}

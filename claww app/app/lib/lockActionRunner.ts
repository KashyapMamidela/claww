import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLastNightSleep, getTodaysMealLogs, insertSleepLog, logWater, saveMeal, type MealType } from './data';
import { ensureMealPlans } from './mealPlanData';
import { plannedToMeal } from './mealPlanMeal';
import { refreshReminders } from './reminderSync';
import { ACTION_ATE, ACTION_ELSE, ACTION_SLEEP_YES, ACTION_WATER, lockEffect, type LockData } from './lockActions';

// Polish step 5: runs a notification button press. Every write goes through the offline write queue (lib/data.ts), so
// a press with no signal is kept on the phone and sent when a connection returns. A press is applied at most once.

const DONE_KEY = 'claww.lockActionsDone';
const done = new Set<string>();
let loaded: Promise<void> | null = null;

function loadDone(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(DONE_KEY)
      .then((raw) => {
        for (const k of (raw ? (JSON.parse(raw) as string[]) : []).slice(-30)) done.add(k);
      })
      .catch(() => {});
  }
  return loaded;
}

async function remember(key: string): Promise<void> {
  done.add(key);
  await AsyncStorage.setItem(DONE_KEY, JSON.stringify([...done].slice(-30))).catch(() => {});
}

export const isLockAction = (actionId: string) => [ACTION_ATE, ACTION_ELSE, ACTION_WATER, ACTION_SLEEP_YES].includes(actionId);

const cap = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)) as MealType;

/**
 * Applies one button press. `openNutrition` is called for "Something else" (the app is already coming to the front);
 * everything else is logged silently and the notification is dismissed.
 */
export async function runLockAction(response: Notifications.NotificationResponse, openNutrition: (slot: string) => void): Promise<void> {
  await loadDone();
  const actionId = response.actionIdentifier;
  const key = `${response.notification.request.identifier}|${actionId}`;
  if (done.has(key)) return;

  const effect = lockEffect(actionId, response.notification.request.content.data as LockData);
  if (!effect) return;
  await remember(key);

  if (effect.kind === 'meal_else') {
    openNutrition(effect.slot);
    return;
  }

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  if (effect.kind === 'water') {
    await logWater(userId, effect.ml);
  } else if (effect.kind === 'sleep') {
    // Already logged in the app since the reminder was scheduled: nothing to add.
    if (!(await getLastNightSleep(userId))) await insertSleepLog(userId, effect.hours, effect.bedtime, effect.wake);
  } else if (effect.kind === 'meal_as_planned') {
    const logged = await getTodaysMealLogs(userId);
    if (!logged.some((m) => (m.meal_type ?? '').toLowerCase() === effect.slot)) {
      const plan = await ensureMealPlans(userId);
      const planned = plan?.meals.find((m) => m.meal === effect.slot);
      if (planned) await saveMeal(userId, cap(effect.slot), plannedToMeal(planned));
      else openNutrition(effect.slot); // no plan to log from: let the user pick
    }
  }

  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
  refreshReminders(userId).catch(() => {});
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import {
  getActivityStreak,
  getLatestWorkout,
  getProfile,
  getRecoveryScore,
  getTodaysMealLogs,
  getUserXp,
  insertSleepLog,
  logMeal,
  logMealFromPhoto,
  type MealLogRow,
  type MealType,
  type PortionSize,
  type RecoveryResult,
} from './data';

export type { MealLogRow, MealType, RecoveryResult } from './data';
export { MEAL_ORDER } from './data';

// App-wide state backed by real Supabase data, refreshed whenever a session
// appears (sign-in, app resume, token refresh). `hasPlan` is derived from a
// real getLatestWorkout check on every load — it used to be a session-only
// flag that only ever flipped true, so a returning user with an existing
// plan saw the "generate your first plan" empty state again on every app
// reopen until they regenerated. `loading` is true until that initial check
// resolves, so Home can show a skeleton instead of flashing the wrong state.
//
// `xp`/`streak` live here (not fetched separately by each screen) so every
// screen reads the same reactive value: `xp` bumps optimistically by the
// exact amount a call site knows was just awarded server-side (matching
// data.ts's awardXp amounts), and `streak` is genuinely re-fetched — its
// formula (getActivityStreak) is a same-day-logged check on sleep_logs/
// meal_logs, so it's cheap to recompute for real right after logging either
// one instead of leaving the old value stale until the next tab focus.

interface AppState {
  userId: string | null;
  userName: string;
  setUserName: (name: string) => void;
  loading: boolean;
  hasPlan: boolean;
  generatePlan: () => void;
  sleepLogged: boolean;
  recovery: RecoveryResult | null;
  logSleep: (hours: number, bedtime: Date, wakeTime: Date) => Promise<void>;
  meals: MealLogRow[];
  addMeal: (type: MealType, text: string, portion?: PortionSize) => Promise<boolean>;
  addMealFromPhoto: (type: MealType, imageDataUri: string, portion?: PortionSize) => Promise<{ ok: boolean; reason?: string }>;
  xp: number;
  bumpXp: (amount: number) => void;
  streak: number;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);
  const [sleepLogged, setSleepLogged] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null);
  const [meals, setMeals] = useState<MealLogRow[]>([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadForUser(uid: string) {
      const [profile, rec, todaysMeals, latestWorkout, userXp, activityStreak] = await Promise.all([
        getProfile(uid),
        getRecoveryScore(uid),
        getTodaysMealLogs(uid),
        getLatestWorkout(uid),
        getUserXp(uid),
        getActivityStreak(uid),
      ]);
      if (cancelled) return;
      if (profile?.name) setUserName(profile.name);
      setRecovery(rec);
      setSleepLogged(!!rec);
      setMeals(todaysMeals);
      setHasPlan(!!latestWorkout);
      setXp(userXp);
      setStreak(activityStreak);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        loadForUser(uid);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        loadForUser(uid);
      } else {
        // Signed out — reset to a clean slate for the next session.
        setUserName('');
        setHasPlan(false);
        setRecovery(null);
        setSleepLogged(false);
        setMeals([]);
        setXp(0);
        setStreak(0);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const bumpXp = useCallback((amount: number) => setXp((x) => x + amount), []);

  const logSleep = useCallback(
    async (hours: number, bedtime: Date, wakeTime: Date) => {
      if (!userId) return;
      const ok = await insertSleepLog(userId, hours, bedtime, wakeTime);
      if (ok) {
        setSleepLogged(true);
        setRecovery(await getRecoveryScore(userId));
        bumpXp(10); // matches awardXp(userId, 10, 'sleep_logged') in insertSleepLog
        getActivityStreak(userId).then(setStreak);
      }
    },
    [userId, bumpXp]
  );

  const addMeal = useCallback(
    async (type: MealType, text: string, portion: PortionSize = 'regular') => {
      if (!userId) return false;
      const inserted = await logMeal(userId, type, text, portion);
      if (inserted) {
        setMeals((m) => [...m, inserted]);
        bumpXp(10); // matches awardXp(userId, 10, 'meal_logged') in logMeal
        getActivityStreak(userId).then(setStreak);
        return true;
      }
      return false;
    },
    [userId, bumpXp]
  );

  const addMealFromPhoto = useCallback(
    async (type: MealType, imageDataUri: string, portion: PortionSize = 'regular') => {
      if (!userId) return { ok: false, reason: 'Not signed in.' };
      const result = await logMealFromPhoto(userId, type, imageDataUri, portion);
      if (result.ok && result.meal) {
        setMeals((m) => [...m, result.meal!]);
        bumpXp(10); // matches awardXp(userId, 10, 'meal_logged') in logMealFromPhoto
        getActivityStreak(userId).then(setStreak);
        return { ok: true };
      }
      return { ok: false, reason: result.reason };
    },
    [userId, bumpXp]
  );

  const value = useMemo<AppState>(
    () => ({
      userId,
      userName,
      setUserName,
      loading,
      hasPlan,
      generatePlan: () => setHasPlan(true),
      sleepLogged,
      recovery,
      logSleep,
      meals,
      addMeal,
      addMealFromPhoto,
      xp,
      bumpXp,
      streak,
    }),
    [userId, userName, loading, hasPlan, sleepLogged, recovery, meals, logSleep, addMeal, addMealFromPhoto, xp, bumpXp, streak]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

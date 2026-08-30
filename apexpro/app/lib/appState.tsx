import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import {
  getProfile,
  getRecoveryScore,
  getTodaysMealLogs,
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
// appears (sign-in, app resume, token refresh). `isNewUser` stays a local,
// session-only UI toggle rather than a real "has a plan" check against
// getLatestWorkout — flipped once by generatePlan() after the first
// successful generation.

interface AppState {
  userId: string | null;
  userName: string;
  setUserName: (name: string) => void;
  isNewUser: boolean;
  generatePlan: () => void;
  sleepLogged: boolean;
  recovery: RecoveryResult | null;
  logSleep: (hours: number, bedtime: Date, wakeTime: Date) => Promise<void>;
  meals: MealLogRow[];
  addMeal: (type: MealType, text: string, portion?: PortionSize) => Promise<boolean>;
  addMealFromPhoto: (type: MealType, imageDataUri: string, portion?: PortionSize) => Promise<{ ok: boolean; reason?: string }>;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);
  const [sleepLogged, setSleepLogged] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null);
  const [meals, setMeals] = useState<MealLogRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadForUser(uid: string) {
      const [profile, rec, todaysMeals] = await Promise.all([
        getProfile(uid),
        getRecoveryScore(uid),
        getTodaysMealLogs(uid),
      ]);
      if (cancelled) return;
      if (profile?.name) setUserName(profile.name);
      setRecovery(rec);
      setSleepLogged(!!rec);
      setMeals(todaysMeals);
    }

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) loadForUser(uid);
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
        setIsNewUser(true);
        setRecovery(null);
        setSleepLogged(false);
        setMeals([]);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const logSleep = useCallback(
    async (hours: number, bedtime: Date, wakeTime: Date) => {
      if (!userId) return;
      const ok = await insertSleepLog(userId, hours, bedtime, wakeTime);
      if (ok) {
        setSleepLogged(true);
        setRecovery(await getRecoveryScore(userId));
      }
    },
    [userId]
  );

  const addMeal = useCallback(
    async (type: MealType, text: string, portion: PortionSize = 'regular') => {
      if (!userId) return false;
      const inserted = await logMeal(userId, type, text, portion);
      if (inserted) {
        setMeals((m) => [...m, inserted]);
        return true;
      }
      return false;
    },
    [userId]
  );

  const addMealFromPhoto = useCallback(
    async (type: MealType, imageDataUri: string, portion: PortionSize = 'regular') => {
      if (!userId) return { ok: false, reason: 'Not signed in.' };
      const result = await logMealFromPhoto(userId, type, imageDataUri, portion);
      if (result.ok && result.meal) {
        setMeals((m) => [...m, result.meal!]);
        return { ok: true };
      }
      return { ok: false, reason: result.reason };
    },
    [userId]
  );

  const value = useMemo<AppState>(
    () => ({
      userId,
      userName,
      setUserName,
      isNewUser,
      generatePlan: () => setIsNewUser(false),
      sleepLogged,
      recovery,
      logSleep,
      meals,
      addMeal,
      addMealFromPhoto,
    }),
    [userId, userName, isNewUser, sleepLogged, recovery, meals, logSleep, addMeal, addMealFromPhoto]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
